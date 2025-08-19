"use client";

import { useRef, useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";

interface InputManagerProps {
  globeRef: React.RefObject<THREE.Mesh | null>;
  terrainMesh: THREE.Mesh | null;
  rotationGroupRef: React.RefObject<THREE.Group | null>;
}

export function InputManager({ globeRef: _globeRef, terrainMesh, rotationGroupRef }: InputManagerProps) {
  const { gl, camera } = useThree();
  const {
    isPlacing,
    isTerraforming,
    terraformMode,
    brushSize,
    brushStrength,
    terrainVertices,
    updateTerrainVertex,
  } = useWorldStore();

  // Shared interaction state
  const mouseRef = useRef(new THREE.Vector2());
  const previousMouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const isDraggingRef = useRef(false);
  const rotationSpeedRef = useRef(0.005);

  // Determine current interaction mode
  const getInteractionMode = useCallback(() => {
    if (isPlacing) return 'placing';
    if (isTerraforming && terraformMode !== 'none') return 'terraforming';
    return 'rotating';
  }, [isPlacing, isTerraforming, terraformMode]);

  // Terraforming action handler working with TerrainSystem
  const handleTerraformAction = useCallback((_event: PointerEvent) => {
    if (!terrainMesh || !terrainVertices.length) return;

    // Raycast to find intersection point
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObject(terrainMesh);

    if (intersects.length === 0) return;

    const intersectionPoint = intersects[0]?.point;
    if (!intersectionPoint) return;
    
    // Work with the original sphere geometry positions to find affected vertices
    const geometry = terrainMesh.geometry;
    const positionAttribute = geometry.attributes.position;
    if (!positionAttribute) return;
    
    // Apply terraforming by updating the store - TerrainSystem will handle the visual updates
    for (let i = 0; i < positionAttribute.count && i < terrainVertices.length; i++) {
      const vertex = terrainVertices[i];
      if (!vertex) continue;
      
      // Get the current vertex position (already deformed by TerrainSystem)
      const vertexPos = new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i)
      );
      
      const distance = intersectionPoint.distanceTo(vertexPos);
      
      if (distance <= brushSize) {
        const normalizedDistance = distance / brushSize;
        let falloff: number;
        let strength: number;
        
        switch (terraformMode) {
          case "raise":
            // Cubic falloff for smoother terrain
            falloff = Math.pow(1 - normalizedDistance, 3);
            strength = brushStrength * falloff * 2.0; // Increased strength for visibility
            updateTerrainVertex(i, {
              height: Math.min(vertex.height + strength, 6.0)
            });
            break;
            
          case "lower":
            falloff = Math.pow(1 - normalizedDistance, 3);
            strength = brushStrength * falloff * 2.0;
            updateTerrainVertex(i, {
              height: Math.max(vertex.height - strength, -4.0)
            });
            break;
        }
      }
    }
  }, [camera, terrainMesh, terrainVertices, terraformMode, brushSize, brushStrength, updateTerrainVertex]);

  // Globe rotation handler
  const handleGlobeRotation = useCallback(() => {
    if (!rotationGroupRef.current) return;
    
    const deltaX = mouseRef.current.x - previousMouseRef.current.x;
    const deltaY = mouseRef.current.y - previousMouseRef.current.y;

    // Apply rotation to the entire group (globe + objects)
    rotationGroupRef.current.rotation.y += deltaX * rotationSpeedRef.current * 50;
    rotationGroupRef.current.rotation.x += deltaY * rotationSpeedRef.current * 50;

    // Clamp X rotation to prevent flipping
    rotationGroupRef.current.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, rotationGroupRef.current.rotation.x),
    );
  }, [rotationGroupRef]);

  // Unified pointer down handler
  const handlePointerDown = useCallback((event: PointerEvent) => {
    const mode = getInteractionMode();
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    // Update mouse position
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    previousMouseRef.current.copy(mouseRef.current);
    
    isDraggingRef.current = true;
    
    switch (mode) {
      case 'placing':
        // Let PlacementSystem handle this
        return;
        
      case 'terraforming':
        event.preventDefault();
        event.stopPropagation();
        canvas.style.cursor = "crosshair";
        handleTerraformAction(event);
        break;
        
      case 'rotating':
        canvas.style.cursor = "grabbing";
        break;
    }
  }, [getInteractionMode, gl.domElement, handleTerraformAction]);

  // Unified pointer move handler
  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isDraggingRef.current) return;
    
    const mode = getInteractionMode();
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    // Update mouse position
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    switch (mode) {
      case 'placing':
        return;
        
      case 'terraforming':
        event.preventDefault();
        event.stopPropagation();
        handleTerraformAction(event);
        break;
        
      case 'rotating':
        handleGlobeRotation();
        break;
    }
    
    previousMouseRef.current.copy(mouseRef.current);
  }, [getInteractionMode, gl.domElement, handleTerraformAction, handleGlobeRotation]);

  // Unified pointer up handler
  const handlePointerUp = useCallback(() => {
    const mode = getInteractionMode();
    const canvas = gl.domElement;
    
    isDraggingRef.current = false;
    
    switch (mode) {
      case 'placing':
        return;
        
      case 'terraforming':
        canvas.style.cursor = "crosshair";
        break;
        
      case 'rotating':
        canvas.style.cursor = "grab";
        break;
    }
  }, [getInteractionMode, gl.domElement]);

  // Set up unified event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    const mode = getInteractionMode();
    
    // Set appropriate cursor and touch behavior
    switch (mode) {
      case 'placing':
        canvas.style.cursor = "crosshair";
        canvas.style.touchAction = "none";
        break;
      case 'terraforming':
        canvas.style.cursor = "crosshair";
        canvas.style.touchAction = "none";
        break;
      case 'rotating':
        canvas.style.cursor = "grab";
        canvas.style.touchAction = "auto";
        break;
    }

    // Single set of event listeners that handle all modes
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
      
      // Reset cursor
      canvas.style.cursor = "default";
      canvas.style.touchAction = "auto";
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, getInteractionMode, gl.domElement]);

  return null; // This is just a controller component
}
"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useWorldStore } from "~/lib/store";

interface TerraformControllerProps {
  terrainMesh: THREE.Mesh;
}

export function TerraformController({ terrainMesh }: TerraformControllerProps) {
  const { camera, gl } = useThree();
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isMouseDownRef = useRef(false);
  
  const {
    terraformMode,
    brushSize,
    brushStrength,
    isTerraforming,
    isPlacing,
    terrainVertices,
    updateTerrainVertex,
  } = useWorldStore();

  // Main terraforming logic
  const handleTerraform = useCallback((event: MouseEvent) => {
    if (!terrainMesh || !terrainVertices.length) return;

    // Use the WebGL renderer's domElement for proper coordinate conversion
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    
    // Convert mouse position to normalized device coordinates
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to find intersection point
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObject(terrainMesh);

    if (intersects.length === 0) return;

    const intersectionPoint = intersects[0]?.point;
    if (!intersectionPoint) return;
    
    // Get the vertices of the intersected face
    const geometry = terrainMesh.geometry;
    const positions = geometry.attributes.position;
    if (!positions) return;
    
    // Find vertices within brush radius and apply terraforming
    for (let i = 0; i < positions.count; i++) {
      const vertexPos = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      
      const distance = intersectionPoint.distanceTo(vertexPos);
      
      if (distance <= brushSize) {
        // Calculate brush falloff (softer edges)
        const falloff = Math.max(0, 1 - (distance / brushSize));
        const strength = brushStrength * falloff;
        
        // Find the vertex in our terrain data
        const vertexIndex = terrainVertices.findIndex(v => 
          Math.abs(v.x - vertexPos.x) < 0.01 &&
          Math.abs(v.y - vertexPos.y) < 0.01 &&
          Math.abs(v.z - vertexPos.z) < 0.01
        );
        
        if (vertexIndex !== -1) {
          const vertex = terrainVertices[vertexIndex];
          if (!vertex) continue;
          
          switch (terraformMode) {
            case "raise":
              updateTerrainVertex(vertexIndex, {
                height: Math.min(vertex.height + strength, 2.0) // Max height of 2
              });
              break;
              
            case "lower":
              updateTerrainVertex(vertexIndex, {
                height: Math.max(vertex.height - strength, -1.0) // Min height of -1
              });
              break;
              
            case "water":
              updateTerrainVertex(vertexIndex, {
                waterLevel: Math.min(vertex.waterLevel + strength, 1.0) // Max water level of 1
              });
              break;
              
            case "smooth":
              // Smooth by averaging with nearby vertices
              const nearbyVertices = terrainVertices.filter((v, idx) => {
                if (idx === vertexIndex) return false;
                const vPos = new THREE.Vector3(v.x, v.y, v.z);
                return vertexPos.distanceTo(vPos) <= brushSize * 0.5;
              });
              
              if (nearbyVertices.length > 0) {
                const avgHeight = nearbyVertices.reduce((sum, v) => sum + v.height, 0) / nearbyVertices.length;
                const avgWater = nearbyVertices.reduce((sum, v) => sum + v.waterLevel, 0) / nearbyVertices.length;
                
                updateTerrainVertex(vertexIndex, {
                  height: vertex.height + (avgHeight - vertex.height) * strength * 0.5,
                  waterLevel: vertex.waterLevel + (avgWater - vertex.waterLevel) * strength * 0.5
                });
              }
              break;
          }
        }
      }
    }
  }, [camera, gl, terrainMesh, terrainVertices, terraformMode, brushSize, brushStrength, updateTerrainVertex]);

  // Handle mouse events
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!isTerraforming || terraformMode === "none") return;
    
    // Prevent globe rotation when terraforming
    event.preventDefault();
    event.stopPropagation();
    
    isMouseDownRef.current = true;
    handleTerraform(event);
  }, [isTerraforming, terraformMode, handleTerraform]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isMouseDownRef.current || !isTerraforming || terraformMode === "none") return;
    
    // Prevent globe rotation when terraforming
    event.preventDefault();
    event.stopPropagation();
    
    handleTerraform(event);
  }, [isTerraforming, terraformMode, handleTerraform]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (isTerraforming && terraformMode !== "none") {
      // Prevent globe rotation when terraforming
      event.preventDefault();
      event.stopPropagation();
    }
    isMouseDownRef.current = false;
  }, [isTerraforming, terraformMode]);

  // Pointer event equivalents to take priority over GlobeController's pointer listeners
  const handlePointerDown = useCallback((event: PointerEvent) => {
    // Do nothing if another tool (placement) is active
    if (isPlacing) return;
    if (!isTerraforming || terraformMode === "none") return;
    event.preventDefault();
    event.stopPropagation();
    isMouseDownRef.current = true;
    // PointerEvent extends MouseEvent, so we can reuse the same logic
    handleTerraform(event as unknown as MouseEvent);
  }, [isPlacing, isTerraforming, terraformMode, handleTerraform]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (isPlacing) return;
    if (!isMouseDownRef.current || !isTerraforming || terraformMode === "none") return;
    event.preventDefault();
    event.stopPropagation();
    handleTerraform(event as unknown as MouseEvent);
  }, [isPlacing, isTerraforming, terraformMode, handleTerraform]);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (isPlacing) return;
    if (isTerraforming && terraformMode !== "none") {
      event.preventDefault();
      event.stopPropagation();
    }
    isMouseDownRef.current = false;
  }, [isPlacing, isTerraforming, terraformMode]);

  // Add event listeners to the WebGL canvas
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    // While terraforming (and not placing), prevent browser gestures (touch/pan/zoom)
    const previousTouchAction = canvas.style.touchAction;
    const shouldActivate = isTerraforming && terraformMode !== "none" && !isPlacing;
    if (shouldActivate) {
      canvas.style.touchAction = "none";
      canvas.style.cursor = "crosshair";
    }

    // Use capture phase to ensure our events are handled before GlobeController
    const listenerOptions: AddEventListenerOptions = { capture: true, passive: false };

    if (shouldActivate) {
      // Pointer events (primary for modern browsers and R3F controls)
      canvas.addEventListener("pointerdown", handlePointerDown, listenerOptions);
      canvas.addEventListener("pointermove", handlePointerMove, listenerOptions);
      canvas.addEventListener("pointerup", handlePointerUp, listenerOptions);
      canvas.addEventListener("pointerleave", handlePointerUp, listenerOptions);

      // Mouse events (fallback)
      canvas.addEventListener("mousedown", handleMouseDown, listenerOptions);
      canvas.addEventListener("mousemove", handleMouseMove, listenerOptions);
      canvas.addEventListener("mouseup", handleMouseUp, listenerOptions);
      canvas.addEventListener("mouseleave", handleMouseUp, listenerOptions);
    }

    return () => {
      canvas.style.touchAction = previousTouchAction;
      canvas.style.cursor = "";

      if (shouldActivate) {
        canvas.removeEventListener("pointerdown", handlePointerDown, listenerOptions);
        canvas.removeEventListener("pointermove", handlePointerMove, listenerOptions);
        canvas.removeEventListener("pointerup", handlePointerUp, listenerOptions);
        canvas.removeEventListener("pointerleave", handlePointerUp, listenerOptions);

        canvas.removeEventListener("mousedown", handleMouseDown, listenerOptions);
        canvas.removeEventListener("mousemove", handleMouseMove, listenerOptions);
        canvas.removeEventListener("mouseup", handleMouseUp, listenerOptions);
        canvas.removeEventListener("mouseleave", handleMouseUp, listenerOptions);
      }
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handlePointerDown, handlePointerMove, handlePointerUp, gl, isTerraforming, terraformMode, isPlacing]);

  // Don't render anything - this is just a controller
  return null;
}

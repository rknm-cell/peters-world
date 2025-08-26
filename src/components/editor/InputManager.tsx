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

export function InputManager({ globeRef: _globeRef, terrainMesh, rotationGroupRef: _rotationGroupRef }: InputManagerProps) {
  const { gl, camera, scene } = useThree();
  const {
    isPlacing,
    isDeleting,
    isTerraforming,
    terraformMode,
    brushSize,
    brushStrength,
    terrainVertices,
    updateTerrainVertex,
    objects,
    removeObject,
  } = useWorldStore();

  // Shared interaction state
  const mouseRef = useRef(new THREE.Vector2());
  const previousMouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const isDraggingRef = useRef(false);
  const isShiftPressedRef = useRef(false);

  // Determine current interaction mode
  const getInteractionMode = useCallback(() => {
    if (isPlacing) return 'placing';
    if (isDeleting) return 'deleting';
    if (isTerraforming && terraformMode !== 'none') return 'terraforming';
    return 'idle';
  }, [isPlacing, isDeleting, isTerraforming, terraformMode]);

  // Terraforming action handler
  const handleTerraformAction = useCallback((_event: PointerEvent) => {
    if (!terrainMesh || !terrainVertices.length) return;

    // Raycast to find intersection point
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObject(terrainMesh);

    if (intersects.length === 0) return;

    const intersectionPoint = intersects[0]?.point;
    if (!intersectionPoint) return;
    
    // Apply terraforming by updating the store
    const geometry = terrainMesh.geometry;
    const positionAttribute = geometry.attributes.position;
    if (!positionAttribute) return;
    
    const maxCheckDistance = brushSize * 1.5;
    let processedVertices = 0;
    
    for (let i = 0; i < positionAttribute.count && i < terrainVertices.length; i++) {
      const vertex = terrainVertices[i];
      if (!vertex) continue;
      
      const quickDistance = Math.sqrt(
        Math.pow(intersectionPoint.x - vertex.x, 2) +
        Math.pow(intersectionPoint.y - vertex.y, 2) +
        Math.pow(intersectionPoint.z - vertex.z, 2)
      );
      
      if (quickDistance > maxCheckDistance) continue;
      
      const vertexPos = new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i)
      );
      
      const distance = intersectionPoint.distanceTo(vertexPos);
      processedVertices++;
      
      if (distance <= brushSize) {
        const normalizedDistance = distance / brushSize;
        let falloff: number;
        let strength: number;
        
        switch (terraformMode) {
          case "raise":
            falloff = Math.pow(1 - normalizedDistance, 3);
            strength = brushStrength * falloff * 2.0;
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
            
          case "water":
            falloff = Math.max(0, 1 - normalizedDistance);
            strength = brushStrength * falloff * 3.0;
            
            if (isShiftPressedRef.current) {
              updateTerrainVertex(i, {
                waterLevel: Math.max(vertex.waterLevel - strength, 0.0)
              });
            } else {
              updateTerrainVertex(i, {
                waterLevel: Math.min(vertex.waterLevel + strength, 1.0)
              });
            }
            break;
            
          case "smooth":
            const nearbyVertices = terrainVertices.filter((v, idx) => {
              if (idx === i) return false;
              const vPos = new THREE.Vector3(v.x, v.y, v.z);
              return vertexPos.distanceTo(vPos) <= brushSize * 0.5;
            });
            
            if (nearbyVertices.length > 0) {
              falloff = Math.max(0, 1 - normalizedDistance);
              const smoothStrength = brushStrength * falloff * 1.0;
              const avgHeight = nearbyVertices.reduce((sum, v) => sum + v.height, 0) / nearbyVertices.length;
              const avgWater = nearbyVertices.reduce((sum, v) => sum + v.waterLevel, 0) / nearbyVertices.length;
              
              updateTerrainVertex(i, {
                height: vertex.height + (avgHeight - vertex.height) * smoothStrength,
                waterLevel: vertex.waterLevel + (avgWater - vertex.waterLevel) * smoothStrength * 0.5
              });
            }
            break;
        }
      }
    }
    
    if (terraformMode === 'water' && processedVertices > 0) {
      console.log(`Water tool: processed ${processedVertices}/${terrainVertices.length} vertices`);
    }
  }, [camera, terrainMesh, terrainVertices, terraformMode, brushSize, brushStrength, updateTerrainVertex]);

  // Delete action handler
  const handleDeleteAction = useCallback((event: PointerEvent) => {
    if (!objects.length) {
      console.log("🗑️ No objects to delete");
      return;
    }

    console.log("🗑️ Delete action triggered, checking for objects...");

    // Raycast to find object intersections
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    // Get all objects with userData.objectId from the scene
    const objectsWithIds: THREE.Object3D[] = [];
    
    // Traverse the entire scene to find objects with objectId
    scene.traverse((child) => {
      if (child.userData?.objectId) {
        objectsWithIds.push(child);
        console.log(`🔍 Found object in scene: ${child.userData.objectId}, type: ${child.type}`);
      }
    });

    console.log(`🔍 Found ${objectsWithIds.length} objects in scene with IDs`);
    console.log(`🔍 Store has ${objects.length} objects`);

    if (objectsWithIds.length === 0) {
      console.log("❌ No objects with IDs found in scene");
      return;
    }

    // Raycast against all objects (recursive = true to check children)
    const intersects = raycasterRef.current.intersectObjects(objectsWithIds, true);
    
    console.log(`🎯 Raycast found ${intersects.length} intersections`);
    
    if (intersects.length > 0) {
      // Find the closest intersected object
      const intersectedObject = intersects[0];
      if (!intersectedObject) return;
      
      console.log(`🎯 Intersected object:`, intersectedObject.object);
      
      let objectId = intersectedObject.object.userData?.objectId as string | undefined;
      
      // If the intersected object doesn't have an objectId, traverse up the hierarchy
      if (!objectId) {
        let parent = intersectedObject.object.parent;
        while (parent && !objectId) {
          objectId = parent.userData?.objectId as string | undefined;
          parent = parent.parent;
        }
      }
      
      if (objectId && typeof objectId === 'string') {
        console.log(`🗑️ Deleting object: ${objectId}`);
        removeObject(objectId);
        event.preventDefault();
        event.stopPropagation();
      } else {
        console.log("❌ No objectId found on intersected object or its parents");
      }
    } else {
      console.log("❌ No intersections found");
    }
  }, [objects, removeObject, camera, scene]);

  // Unified pointer down handler
  const handlePointerDown = useCallback((event: PointerEvent) => {
    const mode = getInteractionMode();
    
    // Only handle events that this system should process
    switch (mode) {
      case 'placing':
        // Let PlacementSystem handle this completely
        return;
        
      case 'terraforming':
        const canvas = gl.domElement;
        const rect = canvas.getBoundingClientRect();
        
        // Update mouse position only for terraforming
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        previousMouseRef.current.copy(mouseRef.current);
        
        // Track shift key state
        isShiftPressedRef.current = event.shiftKey;
        isDraggingRef.current = true;
        
        event.preventDefault();
        event.stopPropagation();
        canvas.style.cursor = "crosshair";
        handleTerraformAction(event);
        break;
        
      case 'deleting':
        const deleteCanvas = gl.domElement;
        const deleteRect = deleteCanvas.getBoundingClientRect();
        
        // Update mouse position for deleting
        mouseRef.current.x = ((event.clientX - deleteRect.left) / deleteRect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - deleteRect.top) / deleteRect.height) * 2 + 1;
        
        event.preventDefault();
        event.stopPropagation();
        deleteCanvas.style.cursor = "crosshair";
        handleDeleteAction(event);
        break;
        
      case 'idle':
        // Do nothing - let OrbitControls handle all events
        return;
    }
  }, [getInteractionMode, gl.domElement, handleTerraformAction, handleDeleteAction]);

  // Unified pointer move handler
  const handlePointerMove = useCallback((event: PointerEvent) => {
    const mode = getInteractionMode();
    
    // Only handle terraforming move events when actively dragging
    if (mode === 'terraforming' && isDraggingRef.current) {
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();
      
      // Update mouse position
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update shift key state
      isShiftPressedRef.current = event.shiftKey;
      
      event.preventDefault();
      event.stopPropagation();
      handleTerraformAction(event);
      
      previousMouseRef.current.copy(mouseRef.current);
    }
    // For 'placing' and 'idle' modes, do nothing - let other systems handle
  }, [getInteractionMode, gl.domElement, handleTerraformAction]);

  const handlePointerUp = useCallback(() => {
    const mode = getInteractionMode();
    
    // Only handle pointer up for terraforming mode
    if (mode === 'terraforming') {
      const canvas = gl.domElement;
      isDraggingRef.current = false;
      canvas.style.cursor = "crosshair";
    }
    // For other modes, do nothing - let other systems handle
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
      case 'deleting':
        canvas.style.cursor = "pointer";
        canvas.style.touchAction = "none";
        break;
      case 'idle':
        canvas.style.cursor = "default";
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
'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector2, Vector3, Mesh } from 'three';
import { useWorldStore } from '~/lib/store';
import { WORLD_LIMITS } from '~/lib/constants';

interface PlacementSystemProps {
  islandRef: React.RefObject<Mesh>;
  children: React.ReactNode;
}

export function PlacementSystem({ islandRef, children }: PlacementSystemProps) {
  const { camera, gl, scene } = useThree();
  const { isPlacing, selectedObject, addObject, selectObject, removeObject } = useWorldStore();
  
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const [hoverPoint, setHoverPoint] = useState<Vector3 | null>(null);

  // Handle click/tap events for placement and selection
  const handlePointerDown = useCallback((event: PointerEvent) => {
    event.preventDefault();
    
    // Calculate mouse position in normalized device coordinates
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.current.setFromCamera(mouse.current, camera);
    
    // Check for intersections with the island
    if (islandRef.current) {
      const intersects = raycaster.current.intersectObject(islandRef.current);
      
      if (intersects.length > 0) {
        const intersectionPoint = intersects[0]?.point;
        if (intersectionPoint) {
          // Check if point is within island bounds
          const distance = Math.sqrt(intersectionPoint.x ** 2 + intersectionPoint.z ** 2);
          if (distance <= WORLD_LIMITS.islandRadius) {
            if (isPlacing) {
              // Place new object
              const placementPosition = new Vector3(
                intersectionPoint.x,
                intersectionPoint.y + WORLD_LIMITS.placementHeight,
                intersectionPoint.z
              );
              
              // Get the object type from store (you'll implement this)
              const objectType = 'pine'; // Default for now
              addObject(objectType, placementPosition);
            }
          }
        }
      }
    }

    // Check for intersections with existing objects
    const objects = scene.children.filter(child => 
      child.userData.isPlacedObject && child instanceof Mesh
    );
    
    if (objects.length > 0) {
      const objectIntersects = raycaster.current.intersectObjects(objects);
      if (objectIntersects.length > 0) {
        const intersectedObject = objectIntersects[0]?.object;
        if (intersectedObject?.userData.objectId) {
          if (event.detail === 2) { // Double click
            removeObject(intersectedObject.userData.objectId);
          } else {
            selectObject(intersectedObject.userData.objectId);
          }
        }
      }
    } else {
      // Click on empty space - deselect
      selectObject(null);
    }
  }, [camera, gl.domElement, islandRef, isPlacing, addObject, selectObject, removeObject, scene.children]);

  // Handle hover for placement preview
  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isPlacing) return;

    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);

    if (islandRef.current) {
      const intersects = raycaster.current.intersectObject(islandRef.current);
      
      if (intersects.length > 0) {
        const intersectionPoint = intersects[0]?.point;
        if (intersectionPoint) {
          const distance = Math.sqrt(intersectionPoint.x ** 2 + intersectionPoint.z ** 2);
          if (distance <= WORLD_LIMITS.islandRadius) {
            setHoverPoint(new Vector3(
              intersectionPoint.x,
              intersectionPoint.y + WORLD_LIMITS.placementHeight,
              intersectionPoint.z
            ));
          } else {
            setHoverPoint(null);
          }
        }
      } else {
        setHoverPoint(null);
      }
    }
  }, [camera, gl.domElement, islandRef, isPlacing]);

  // Set up event listeners
  useFrame(() => {
    // This runs every frame - we can add any per-frame logic here
  });

  // Add event listeners
  React.useEffect(() => {
    const canvas = gl.domElement;
    
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove]);

  return (
    <>
      {children}
      
      {/* Placement preview */}
      {isPlacing && hoverPoint && (
        <mesh position={[hoverPoint.x, hoverPoint.y, hoverPoint.z]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#00ff00" opacity={0.5} transparent />
        </mesh>
      )}
    </>
  );
}
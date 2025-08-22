"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useWorldStore } from "~/lib/store";
import { OBJECT_TYPES } from "~/lib/constants";
import { Decoration } from "~/components/three/objects/Decoration";
import { Tree } from "~/components/three/objects/Tree";
import { Structure } from "~/components/three/objects/Structure";
import { Deer } from "~/components/three/objects/Deer";
import { Wolf } from "~/components/three/objects/Wolf";
import { Grass } from "~/components/three/objects/Grass";
import type * as THREE from "three";
import { Raycaster, Vector2, Mesh } from "three";
import {
  calculatePlacement,
  getDetailedIntersection,
  type PlacementInfo,
} from "~/lib/utils/placement";

// Type guard function to check if an object type is a tree
function isTreeType(objectType: string): objectType is "tree" | "tree-baobab" | "tree-beech" | "tree-birch" | "tree-conifer" | "tree-elipse" | "tree-fir" | "tree-forest" | "tree-lime" | "tree-maple" | "tree-oak" | "tree-round" | "tree-spruce" | "tree-tall" {
  return OBJECT_TYPES.trees.includes(objectType as "tree" | "tree-baobab" | "tree-beech" | "tree-birch" | "tree-conifer" | "tree-elipse" | "tree-fir" | "tree-forest" | "tree-lime" | "tree-maple" | "tree-oak" | "tree-round" | "tree-spruce" | "tree-tall");
}

interface PlacementSystemProps {
  globeRef: React.RefObject<THREE.Mesh | null>;
  rotationGroupRef?: React.RefObject<THREE.Group | null>;
  children: React.ReactNode;
}

export function PlacementSystem({
  globeRef,
  rotationGroupRef: _rotationGroupRef,
  children,
}: PlacementSystemProps) {
  const { camera, gl, scene } = useThree();
  const {
    isPlacing,
    selectedObjectType,
    objects,
    addObject,
    selectObject,
    removeObject,
  } = useWorldStore();

  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const [placementPreview, setPlacementPreview] =
    useState<PlacementInfo | null>(null);
    
  // Use refs for values that don't need to trigger callback recreation
  const objectsRef = useRef(objects);
  const isPlacingRef = useRef(isPlacing);
  const selectedObjectTypeRef = useRef(selectedObjectType);
  
  // Update refs when values change
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);
  
  useEffect(() => {
    isPlacingRef.current = isPlacing;
  }, [isPlacing]);
  
  useEffect(() => {
    selectedObjectTypeRef.current = selectedObjectType;
  }, [selectedObjectType]);

  // Handle click/tap events for placement and selection
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      // Only prevent default if we're in placement mode or interacting with objects
      // This allows OrbitControls to work when not placing
      const shouldPreventDefault = isPlacingRef.current || event.detail === 2; // placement mode or double-click
      
      if (shouldPreventDefault) {
        event.preventDefault();
      }

      // Calculate mouse position in normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);

      // Check for intersections with the globe
      if (globeRef.current && isPlacingRef.current && selectedObjectTypeRef.current) {
        const currentObjectType = selectedObjectTypeRef.current;
        const detailedIntersection = getDetailedIntersection(
          raycaster.current,
          globeRef.current,
        );

        if (detailedIntersection && currentObjectType) {
          // Use the world coordinates directly - no need to convert to local space
          // since WorldObjects is rendered as a child of the rotating group
          const worldPoint = detailedIntersection.point.clone();
          const worldNormal = detailedIntersection.normal.clone();

          const placementInfo = calculatePlacement(
            currentObjectType,
            worldPoint,
            worldNormal,
            objectsRef.current,
          );

          const selectedType = selectedObjectTypeRef.current;
          if (placementInfo.canPlace && selectedType) {
            // Use the local coordinates for placement
            addObject(selectedType, placementInfo.position);

            // Update the last placed object with the exact rotation from the preview
            const newObjects = useWorldStore.getState().objects;
            if (newObjects.length > 0) {
              const lastObject = newObjects[newObjects.length - 1];
              if (lastObject) {
                useWorldStore.getState().updateObject(lastObject.id, {
                  rotation: [
                    placementInfo.rotation.x,
                    placementInfo.rotation.y,
                    placementInfo.rotation.z,
                  ] as [number, number, number],
                });
              }
            }
          }
        }
      }

      // Check for intersections with existing objects
      const sceneObjects = scene.children.filter(
        (child) => child.userData.isPlacedObject && child instanceof Mesh,
      );

      if (sceneObjects.length > 0) {
        const objectIntersects =
          raycaster.current.intersectObjects(sceneObjects);
        if (objectIntersects.length > 0) {
          const intersectedObject = objectIntersects[0]?.object;
          if (
            intersectedObject?.userData?.objectId &&
            typeof intersectedObject.userData.objectId === "string"
          ) {
            const objectId: string = intersectedObject.userData.objectId;
            if (event.detail === 2) {
              // Double click
              removeObject(objectId);
            } else {
              selectObject(objectId);
            }
          }
        }
      } else {
        // Click on empty space - deselect
        selectObject(null);
      }
    },
    [
      camera,
      gl.domElement,
      globeRef,
      addObject,
      selectObject,
      removeObject,
      scene.children,
    ],
  );

  // Handle hover for placement preview
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isPlacing || !selectedObjectType) {
        setPlacementPreview(null);
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      if (globeRef.current) {
        const detailedIntersection = getDetailedIntersection(
          raycaster.current,
          globeRef.current,
        );

        if (detailedIntersection) {
          // Use world coordinates directly for preview as well
          const worldPoint = detailedIntersection.point.clone();
          const worldNormal = detailedIntersection.normal.clone();

          const placementInfo = calculatePlacement(
            selectedObjectType,
            worldPoint,
            worldNormal,
            objects,
          );

          setPlacementPreview(placementInfo);
        } else {
          setPlacementPreview(null);
        }
      }
    },
    [
      camera,
      gl.domElement,
      globeRef,
      isPlacing,
      objects,
      selectedObjectType,
    ],
  );

  // Set up event listeners
  useFrame(() => {
    // This runs every frame - we can add any per-frame logic here
  });

  // Add event listeners
  useEffect(() => {
    const canvas = gl.domElement;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);

    // Add keyboard event listener for Escape key to exit placement mode
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isPlacing) {
        useWorldStore.setState({ isPlacing: false, selectedObjectType: null });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, isPlacing]);

  return (
    <>
      {children}

      {/* Placement preview */}
      {isPlacing && placementPreview && selectedObjectType && (
        <group
          position={[
            placementPreview.position.x,
            placementPreview.position.y,
            placementPreview.position.z,
          ]}
          rotation={[
            placementPreview.rotation.x,
            placementPreview.rotation.y,
            placementPreview.rotation.z,
          ]}
        >
          {/* Preview indicator - actual object geometry with transparency */}
          {selectedObjectType === "rock" || selectedObjectType === "flower" ? (
            <Decoration
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              selected={false}
              objectId="preview"
              preview={true}
              canPlace={placementPreview.canPlace}
            />
          ) : (selectedObjectType && isTreeType(selectedObjectType)) ? (
            <Tree
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              selected={false}
              objectId="preview"
              preview={true}
              canPlace={placementPreview.canPlace}
            />
          ) : (selectedObjectType === "house" || selectedObjectType === "tower" || selectedObjectType === "bridge") ? (
            <Structure
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              selected={false}
              objectId="preview"
              preview={true}
              canPlace={placementPreview.canPlace}
            />
          ) : (selectedObjectType?.startsWith("animals/")) ? (
            selectedObjectType === "animals/deer" ? (
              <Deer
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/wolf" ? (
              <Wolf
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : (
              <Deer
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            )
          ) : (selectedObjectType?.startsWith("grass/")) ? (
            <Grass
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              selected={false}
              objectId="preview"
              preview={true}
              canPlace={placementPreview.canPlace}
            />
          ) : null}

          {/* Surface normal indicator */}
          {placementPreview.surfaceNormal && (
            <group>
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.5]} />
                <meshBasicMaterial color="#ffff00" opacity={0.5} transparent />
              </mesh>
              <mesh position={[0, 0.35, 0]}>
                <coneGeometry args={[0.05, 0.1]} />
                <meshBasicMaterial color="#ffff00" opacity={0.5} transparent />
              </mesh>
            </group>
          )}

          {/* Placement area indicator */}
          <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial
              color={placementPreview.canPlace ? "#00ff00" : "#ff0000"}
              opacity={0.2}
              transparent
              side={2} // DoubleSide
            />
          </mesh>
        </group>
      )}
    </>
  );
}

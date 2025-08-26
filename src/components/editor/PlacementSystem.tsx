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
import { Sheep } from "~/components/three/objects/Sheep";
import { Bear } from "~/components/three/objects/Bear";
import { Cow } from "~/components/three/objects/Cow";
import { Hen } from "~/components/three/objects/Hen";
import { Horse } from "~/components/three/objects/Horse";
import { Penguin } from "~/components/three/objects/Penguin";
import { Pig } from "~/components/three/objects/Pig";
import { Grass } from "~/components/three/objects/Grass";
import type * as THREE from "three";
import { Raycaster, Vector2, Mesh } from "three";
import {
  calculatePlacement,
  getDetailedIntersection,
  type PlacementInfo,
} from "~/lib/utils/placement";

// Type guard function to check if an object type is a tree
function isTreeType(objectType: string): objectType is "tree" | "tree-baobab" | "tree-beech" | "tree-birch" | "tree-elipse" | "tree-lime" | "tree-maple" | "tree-oak" | "tree-round" | "tree-tall" {
  return OBJECT_TYPES.trees.includes(objectType as "tree" | "tree-baobab" | "tree-beech" | "tree-birch" | "tree-elipse" | "tree-lime" | "tree-maple" | "tree-oak" | "tree-round" | "tree-tall");
}

// Type guard function to check if an object type is a decoration
function isDecorationType(objectType: string): boolean {
  return (OBJECT_TYPES.decorations as readonly string[]).includes(objectType) || objectType === "rock" || objectType === "flower";
}

// Type guard function to check if an object type is a structure
function isStructureType(objectType: string): boolean {
  return OBJECT_TYPES.structures.includes(objectType as any);
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
  const placementPreviewRef = useRef<PlacementInfo | null>(null);
    
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

  // Update placement preview ref when state changes
  useEffect(() => {
    placementPreviewRef.current = placementPreview;
  }, [placementPreview]);

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
          // Use mathematical coordinates for consistency with debug system
          // This ensures placement matches the debug arrows exactly
          const globeRadius = 6; // Match SurfaceNormalDebug exactly
          const mathNormal = detailedIntersection.point.clone().normalize();
          const mathSurfacePoint = mathNormal.clone().multiplyScalar(globeRadius);

          const placementInfo = calculatePlacement(
            currentObjectType,
            mathSurfacePoint, // Use mathematical point
            mathNormal,       // Use mathematical normal
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
      // Early return if not in placement mode
      if (!isPlacing || !selectedObjectType) {
        // Only update state if we currently have a preview to clear
        if (placementPreviewRef.current !== null) {
          setPlacementPreview(null);
        }
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
          // Use mathematical coordinates for preview consistency with debug system
          const globeRadius = 6; // Match SurfaceNormalDebug exactly
          const mathNormal = detailedIntersection.point.clone().normalize();
          const mathSurfacePoint = mathNormal.clone().multiplyScalar(globeRadius);

          const placementInfo = calculatePlacement(
            selectedObjectType,
            mathSurfacePoint, // Use mathematical point
            mathNormal,       // Use mathematical normal
            objects,
          );

          // Only update if the placement info has actually changed
          const currentPreview = placementPreviewRef.current;
          if (!currentPreview || 
              currentPreview.position.x !== placementInfo.position.x ||
              currentPreview.position.y !== placementInfo.position.y ||
              currentPreview.position.z !== placementInfo.position.z ||
              currentPreview.canPlace !== placementInfo.canPlace) {
            setPlacementPreview(placementInfo);
          }
        } else {
          // Only update if we currently have a preview
          if (placementPreviewRef.current !== null) {
            setPlacementPreview(null);
          }
        }
      }
    },
    [
      camera,
      gl.domElement,
      globeRef,
      isPlacing,
      selectedObjectType,
      objects,
    ],
  );

  // Set up event listeners
  useFrame(() => {
    // This runs every frame - we can add any per-frame logic here
  });

  // Add event listeners - use refs to avoid dependency issues
  const handlePointerMoveRef = useRef(handlePointerMove);
  const handlePointerDownRef = useRef(handlePointerDown);
  
  useEffect(() => {
    handlePointerMoveRef.current = handlePointerMove;
    handlePointerDownRef.current = handlePointerDown;
  }, [handlePointerMove, handlePointerDown]);

  useEffect(() => {
    const canvas = gl.domElement;

    const moveHandler = (e: PointerEvent) => handlePointerMoveRef.current(e);
    const downHandler = (e: PointerEvent) => handlePointerDownRef.current(e);

    canvas.addEventListener("pointerdown", downHandler);
    canvas.addEventListener("pointermove", moveHandler);

    // Add keyboard event listener for Escape key to exit any mode
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        useWorldStore.getState().clearAllModes();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("pointerdown", downHandler);
      canvas.removeEventListener("pointermove", moveHandler);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gl.domElement]);

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
          {isDecorationType(selectedObjectType) ? (
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
          ) : isStructureType(selectedObjectType) ? (
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
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
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
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/sheep-white" ? (
              <Sheep
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/bear_brown" ? (
              <Bear
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/cow" ? (
              <Cow
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/hen" ? (
              <Hen
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/horse" ? (
              <Horse
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/penguin" ? (
              <Penguin
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
                scale={[1, 1, 1]}
                selected={false}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/pig" ? (
              <Pig
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
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
                rotation={[
                  placementPreview.rotation.x,
                  placementPreview.rotation.y,
                  placementPreview.rotation.z
                ]}
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

          {/* Mathematical surface normal indicator (matches debug system) */}
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

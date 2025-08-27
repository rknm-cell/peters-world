"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { Raycaster, Vector2, Mesh } from "three";
import {
  usePlacementState,
  useAddObject,
  useSelectObject,
  useRemoveObject,
  useSetUserInteracting,
  useClearAllModes,
  useWorldStore,
} from "~/lib/store";
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
import {
  calculatePlacement,
  getDetailedIntersection,
  type PlacementInfo,
} from "~/lib/utils/placement";

// Type guard function to check if an object type is a tree
function isTreeType(
  objectType: string,
): objectType is
  | "tree"
  | "tree-baobab"
  | "tree-beech"
  | "tree-birch"
  | "tree-elipse"
  | "tree-lime"
  | "tree-maple"
  | "tree-oak"
  | "tree-round"
  | "tree-tall" {
  return OBJECT_TYPES.trees.includes(
    objectType as
      | "tree"
      | "tree-baobab"
      | "tree-beech"
      | "tree-birch"
      | "tree-elipse"
      | "tree-lime"
      | "tree-maple"
      | "tree-oak"
      | "tree-round"
      | "tree-tall",
  );
}

// Type guard function to check if an object type is a decoration
function isDecorationType(objectType: string): boolean {
  return (
    (OBJECT_TYPES.decorations as readonly string[]).includes(objectType) ||
    objectType === "rock" ||
    objectType === "flower"
  );
}

// Type guard function to check if an object type is a structure
type StructureType = (typeof OBJECT_TYPES.structures)[number];
function isStructureType(objectType: string): objectType is StructureType {
  return (OBJECT_TYPES.structures as readonly string[]).includes(objectType);
}

interface PlacementSystemProps {
  globeRef: React.RefObject<THREE.Mesh | null>;
  rotationGroupRef?: React.RefObject<THREE.Group | null>;
}

export function PlacementSystem({
  globeRef,
  rotationGroupRef: _rotationGroupRef,
}: PlacementSystemProps) {
  const { camera, gl, scene } = useThree();

  // Use selective subscription hooks to prevent unnecessary re-renders
  const { isPlacing, selectedObjectType } = usePlacementState();

  // Only subscribe to essential object data for collision detection
  // Use memoization to prevent rerenders when object properties change
  const objects = useWorldStore((state) => state.objects);
  const objectsForCollision = React.useMemo(
    () =>
      objects.map((obj) => ({
        id: obj.id,
        position: obj.position,
        type: obj.type,
      })),
    [objects],
  );
  const addObject = useAddObject();
  const selectObject = useSelectObject();
  const removeObject = useRemoveObject();
  const clearAllModes = useClearAllModes();
  const setUserInteracting = useSetUserInteracting();

  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const [placementPreview, setPlacementPreview] =
    useState<PlacementInfo | null>(null);
  const placementPreviewRef = useRef<PlacementInfo | null>(null);
  const lastClickTimeRef = useRef(0);
  const lastSelectionRef = useRef<string | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs for values that don't need to trigger callback recreation
  const objectsRef = useRef(objectsForCollision);
  const isPlacingRef = useRef(isPlacing);
  const selectedObjectTypeRef = useRef(selectedObjectType);

  // Update refs when values change
  useEffect(() => {
    objectsRef.current = objectsForCollision;
  }, [objectsForCollision]);

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

  // Debounced selection to prevent rapid re-renders
  const debouncedSelectObject = useCallback(
    (objectId: string | null) => {
      // Clear any existing timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      // Only update if selection actually changed
      if (lastSelectionRef.current !== objectId) {
        // Debounce selection updates to reduce re-renders during rapid clicking
        selectionTimeoutRef.current = setTimeout(() => {
          selectObject(objectId);
          lastSelectionRef.current = objectId;
        }, 16); // One frame delay (~60fps)
      }
    },
    [selectObject],
  );

  // Handle click/tap events for placement and selection
  // Using event delegation pattern (R3F best practice 2024)
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      // Debounce rapid clicks to prevent jitter
      const now = performance.now();
      const timeSinceLastClick = now - lastClickTimeRef.current;
      const MIN_CLICK_INTERVAL = 50; // 50ms minimum between clicks

      if (timeSinceLastClick < MIN_CLICK_INTERVAL) {
        console.log(
          `🖱️ Click debounced (${timeSinceLastClick.toFixed(1)}ms since last click)`,
        );
        return;
      }
      lastClickTimeRef.current = now;

      // Only signal user interaction when actually performing actions that affect physics
      // This prevents unnecessary deer twitching on simple scene clicks
      let shouldSignalUserInteraction = false;

      // Only prevent default if we're in placement mode or interacting with objects
      // This allows OrbitControls to work when not placing
      const shouldPreventDefault = isPlacingRef.current || event.detail === 2; // placement mode or double-click

      if (shouldPreventDefault) {
        event.preventDefault();
        event.stopPropagation(); // Prevent other handlers from processing this event
        shouldSignalUserInteraction = true; // Only signal interaction when preventing default
      }

      // Calculate mouse position in normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);

      // Check for intersections with the globe
      if (
        globeRef.current &&
        isPlacingRef.current &&
        selectedObjectTypeRef.current
      ) {
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
          const mathSurfacePoint = mathNormal
            .clone()
            .multiplyScalar(globeRadius);

          const placementInfo = calculatePlacement(
            currentObjectType,
            mathSurfacePoint, // Use mathematical point
            mathNormal, // Use mathematical normal
            objectsRef.current,
          );

          const selectedType = selectedObjectTypeRef.current;
          if (placementInfo.canPlace && selectedType) {
            // Use the local coordinates for placement with proper rotation and scale
            addObject(
              selectedType,
              placementInfo.position,
              [
                placementInfo.rotation.x,
                placementInfo.rotation.y,
                placementInfo.rotation.z,
              ] as [number, number, number],
              [1, 1, 1] as [number, number, number],
            );

            // Placing objects affects physics, so signal user interaction
            shouldSignalUserInteraction = true;
          }
        }
      }

      // Check for intersections with existing objects
      // Exclude physics-controlled objects to prevent interference
      const sceneObjects = scene.children.filter(
        (child) =>
          child.userData.isPlacedObject &&
          child instanceof Mesh &&
          !child.userData.isPhysicsControlled, // Exclude physics-controlled objects
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
              // Double click - removing objects affects physics
              removeObject(objectId);
              shouldSignalUserInteraction = true;
            } else {
              // Single click - use debounced selection to prevent rapid re-renders
              debouncedSelectObject(objectId);
            }
          }
        }
      } else {
        // Click on empty space - use debounced deselection
        debouncedSelectObject(null);
      }

      // Only signal interaction for physics systems that actually need it
      if (shouldSignalUserInteraction) {
        setUserInteracting(true);
        // Quick reset to signal physics systems
        setTimeout(() => setUserInteracting(false), 16);
      }
    },
    [
      camera,
      gl.domElement,
      globeRef,
      addObject,
      debouncedSelectObject,
      removeObject,
      scene.children,
      setUserInteracting,
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
          const mathSurfacePoint = mathNormal
            .clone()
            .multiplyScalar(globeRadius);

          const placementInfo = calculatePlacement(
            selectedObjectType,
            mathSurfacePoint, // Use mathematical point
            mathNormal, // Use mathematical normal
            objectsForCollision,
          );

          // Only update if the placement info has actually changed
          const currentPreview = placementPreviewRef.current;
          if (
            !currentPreview ||
            currentPreview.position.x !== placementInfo.position.x ||
            currentPreview.position.y !== placementInfo.position.y ||
            currentPreview.position.z !== placementInfo.position.z ||
            currentPreview.canPlace !== placementInfo.canPlace
          ) {
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
      objectsForCollision,
    ],
  );

  // Add event listeners - use refs to avoid dependency issues
  const handlePointerMoveRef = useRef(handlePointerMove);
  const handlePointerDownRef = useRef(handlePointerDown);

  useEffect(() => {
    handlePointerMoveRef.current = handlePointerMove;
    handlePointerDownRef.current = handlePointerDown;
  }, [handlePointerMove, handlePointerDown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    const moveHandler = (e: PointerEvent) => handlePointerMoveRef.current(e);
    const downHandler = (e: PointerEvent) => handlePointerDownRef.current(e);

    // Add event listeners with priority handling (capture phase for placement system)
    canvas.addEventListener("pointerdown", downHandler, { capture: true });
    canvas.addEventListener("pointermove", moveHandler, { passive: true });

    // Add keyboard event listener for Escape key to exit any mode
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearAllModes();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("pointerdown", downHandler, { capture: true });
      canvas.removeEventListener("pointermove", moveHandler);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gl.domElement, clearAllModes]);

  return (
    <>
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
              objectId="preview"
              preview={true}
              canPlace={placementPreview.canPlace}
            />
          ) : selectedObjectType && isTreeType(selectedObjectType) ? (
            <Tree
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              objectId="preview"
              preview={true}
              canPlace={placementPreview.canPlace}
            />
          ) : isStructureType(selectedObjectType) ? (
            <Structure
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={
                // Use tree-like preview rotation for cabins, calculated rotation for other structures
                selectedObjectType === "building-cabin-small" ||
                selectedObjectType === "building-cabin-big"
                  ? [0, 0, 0] // Static rotation like trees
                  : [
                      placementPreview.rotation.x,
                      placementPreview.rotation.y,
                      placementPreview.rotation.z,
                    ] // Calculated rotation for other structures
              }
              scale={[1, 1, 1]}
              objectId="preview"
              preview={true}
              canPlace={placementPreview.canPlace}
            />
          ) : selectedObjectType?.startsWith("animals/") ? (
            selectedObjectType === "animals/deer" ? (
              <Deer
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/wolf" ? (
              <Wolf
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/sheep-white" ? (
              <Sheep
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/bear_brown" ? (
              <Bear
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/cow" ? (
              <Cow
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/hen" ? (
              <Hen
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/horse" ? (
              <Horse
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/penguin" ? (
              <Penguin
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : selectedObjectType === "animals/pig" ? (
              <Pig
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            ) : (
              <Deer
                type={selectedObjectType}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[1, 1, 1]}
                objectId="preview"
                preview={true}
                canPlace={placementPreview.canPlace}
              />
            )
          ) : selectedObjectType?.startsWith("grass/") ? (
            <Grass
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
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

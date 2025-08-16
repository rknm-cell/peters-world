"use client";

import React, { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Raycaster, Vector2, Mesh } from "three";
import { useWorldStore } from "~/lib/store";
import {
  calculatePlacement,
  getDetailedIntersection,
  type PlacementInfo,
} from "~/lib/utils/placement";
import { Decoration } from "~/components/three/objects/Decoration";
import { Tree } from "~/components/three/objects/Tree";
import { Structure } from "~/components/three/objects/Structure";

interface PlacementSystemProps {
  globeRef: React.RefObject<THREE.Mesh | null>;
  rotationGroupRef?: React.RefObject<THREE.Group | null>;
  children: React.ReactNode;
}

export function PlacementSystem({
  globeRef,
  rotationGroupRef,
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

  // Handle click/tap events for placement and selection
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      event.preventDefault();

      // Calculate mouse position in normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);

      // Check for intersections with the globe
      if (globeRef.current && isPlacing && selectedObjectType) {
        const detailedIntersection = getDetailedIntersection(
          raycaster.current,
          globeRef.current,
        );

        if (detailedIntersection) {
          // Convert world coordinates to local coordinates of the rotating group
          const localPoint = detailedIntersection.point.clone();
          const localNormal = detailedIntersection.normal.clone();

          if (rotationGroupRef?.current) {
            // Convert world point to local space of the rotating group
            const worldToLocal = new THREE.Matrix4()
              .copy(rotationGroupRef.current.matrixWorld)
              .invert();
            localPoint.applyMatrix4(worldToLocal);

            // Convert world normal to local space (without translation)
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(
              rotationGroupRef.current.matrixWorld,
            );
            localNormal.applyMatrix3(normalMatrix.invert()).normalize();
          }

          const placementInfo = calculatePlacement(
            selectedObjectType,
            localPoint,
            localNormal,
            objects,
          );

          if (placementInfo.canPlace) {
            // Use the local coordinates for placement
            addObject(selectedObjectType, placementInfo.position);

            // Update the last placed object with the correct rotation
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
      rotationGroupRef,
      isPlacing,
      selectedObjectType,
      objects,
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
          // Convert world coordinates to local coordinates for preview
          const localPoint = detailedIntersection.point.clone();
          const localNormal = detailedIntersection.normal.clone();

          if (rotationGroupRef?.current) {
            const worldToLocal = new THREE.Matrix4()
              .copy(rotationGroupRef.current.matrixWorld)
              .invert();
            localPoint.applyMatrix4(worldToLocal);

            const normalMatrix = new THREE.Matrix3().getNormalMatrix(
              rotationGroupRef.current.matrixWorld,
            );
            localNormal.applyMatrix3(normalMatrix.invert()).normalize();
          }

          const placementInfo = calculatePlacement(
            selectedObjectType,
            localPoint,
            localNormal,
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
      rotationGroupRef,
      isPlacing,
      selectedObjectType,
      objects,
    ],
  );

  // Set up event listeners
  useFrame(() => {
    // This runs every frame - we can add any per-frame logic here
  });

  // Add event listeners
  React.useEffect(() => {
    const canvas = gl.domElement;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove]);

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
            />
          ) : (selectedObjectType === "pine" || selectedObjectType === "oak" || selectedObjectType === "birch") ? (
            <Tree
              type={selectedObjectType}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              selected={false}
              objectId="preview"
              preview={true}
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

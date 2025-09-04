"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useWorldStore, useSelectedObject } from "~/lib/store";
import { applyStandardizedScaling } from "~/lib/utils/model-scaling";

interface WolfProps {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  objectId?: string;
  preview?: boolean;
  canPlace?: boolean;
  disablePositionSync?: boolean; // Disable store position sync when controlled by physics
  isPhysicsControlled?: boolean; // Exclude from PlacementSystem raycasting when physics-controlled
}

export function Wolf({
  type,
  position,
  rotation = [0, 0, 0],
  scale = [0.6, 0.6, 0.6], // Slightly larger than deer
  objectId,
  preview = false,
  canPlace = true,
  disablePositionSync = false,
  isPhysicsControlled = false,
}: WolfProps) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedObject = useSelectedObject();
  const selected = !preview && objectId ? selectedObject === objectId : false;

  // Load the GLTF model
  const { scene: gltfScene, ...gltfResult } = useGLTF(`/${type}.glb`);
  const isLoading = !gltfResult || !gltfScene;

  // Removed getTargetHeight - now using centralized scaling utility

  // Clone the scene to avoid sharing between instances
  const wolfModel = useMemo(() => {
    if (isLoading || !gltfScene) {
      return null;
    }

    try {
      const clonedScene = gltfScene.clone(true);

      // Apply standardized scaling using the utility
      const scaleFactor = applyStandardizedScaling(clonedScene, {
        objectType: "animal",
        modelType: type,
        preview,
      });

      // Enable shadows and apply preview styling
      clonedScene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (preview) {
            // Preview styling - make it more transparent and colored
            if (child.material) {
              const material = child.material as THREE.MeshStandardMaterial;
              if (material.clone) {
                const previewMaterial = material.clone();
                previewMaterial.transparent = true;
                previewMaterial.opacity = 0.6;
                previewMaterial.color.setHex(canPlace ? 0x00ff00 : 0xff0000);
                child.material = previewMaterial;
              }
            }
          }
        }
      });

      return clonedScene;
    } catch (error) {
      // Error processing GLB scene
      return null;
    }
  }, [gltfScene, type, isLoading]);

  // Update materials dynamically when preview state changes (without recreating the model)
  useEffect(() => {
    if (wolfModel && preview) {
      wolfModel.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.userData.originalMaterial) {
          const previewMaterial = (
            child.userData.originalMaterial as THREE.MeshStandardMaterial
          ).clone();
          previewMaterial.transparent = true;
          previewMaterial.opacity = 0.6;
          previewMaterial.color.setHex(canPlace ? 0x00ff00 : 0xff0000);
          child.material = previewMaterial;
        }
      });
    } else if (wolfModel && !preview) {
      // Restore original materials
      wolfModel.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial as THREE.Material;
        }
      });
    }
  }, [wolfModel, preview, canPlace]);

  // CRITICAL FIX: Use stable refs to avoid store access in useFrame
  const currentPositionRef = useRef(position);
  const currentRotationRef = useRef(rotation);

  // Update refs when props change (outside of useFrame)
  useEffect(() => {
    currentPositionRef.current = position;
    currentRotationRef.current = rotation;
  }, [position, rotation]);

  // Animation and movement updates
  useFrame((state) => {
    if (!groupRef.current) return;

    // Skip all updates if controlled by physics (WolfPhysics component)
    // Physics system handles position, rotation, and all animations
    if (disablePositionSync) {
      return;
    }

    // FIXED: Use stable refs instead of store access inside useFrame
    groupRef.current.position.set(...currentPositionRef.current);
    groupRef.current.rotation.set(...currentRotationRef.current);

    // Selected state animation (override rotation temporarily)
    if (selected) {
      groupRef.current.rotation.y +=
        Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  if (!wolfModel) {
    // Fallback to a simple visible wolf representation
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        userData={{
          isPlacedObject: !preview && !isPhysicsControlled, // Physics wolf excluded from placement raycasting
          objectId,
          isPhysicsControlled,
        }}
      >
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.9, 0.7]} />
          <meshStandardMaterial
            color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#404040"}
            transparent={preview}
            opacity={preview ? 0.6 : 1.0}
          />
        </mesh>

        {/* Selection indicator */}
        {selected && !preview && (
          <mesh position={[0, 0.9, 0]}>
            <ringGeometry args={[0.45, 0.65, 16]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{
        isPlacedObject: !preview && !isPhysicsControlled, // Physics wolf excluded from placement raycasting
        objectId,
        isPhysicsControlled,
      }}
    >
      <primitive object={wolfModel} />

      {/* Selection indicator */}
      {selected && !preview && (
        <mesh position={[0, 0.9, 0]}>
          <ringGeometry args={[0.45, 0.65, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

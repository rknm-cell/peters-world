"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { applyStandardizedScaling } from "~/lib/utils/model-scaling";

interface BearProps {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId?: string;
  preview?: boolean;
  canPlace?: boolean;
  disablePositionSync?: boolean;
  isPhysicsControlled?: boolean;
}

export function Bear({
  type,
  position,
  rotation = [0, 0, 0],
  scale = [0.5, 0.5, 0.5],
  selected = false,
  objectId,
  preview = false,
  canPlace = true,
  disablePositionSync = false,
  isPhysicsControlled = false,
}: BearProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLTF model
  const { scene: gltfScene, ...gltfResult } = useGLTF(`/${type}.glb`);
  const isLoading = !gltfResult || !gltfScene;

  // Clone the scene to avoid sharing between instances
  const bearModel = useMemo(() => {
    if (isLoading || !gltfScene) {
      console.log(`Bear ${type}: GLB loading failed or no scene`, {
        isLoading,
        hasScene: !!gltfScene,
      });
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

      console.log(`Bear ${type}: Model loaded successfully`, {
        hasModel: !!clonedScene,
        scaleFactor,
        "bear positioned by PlacementSystem": true,
      });

      return clonedScene;
    } catch (error) {
      console.error(`Bear ${type}: Error processing GLB scene:`, error);
      return null;
    }
  }, [gltfScene, preview, canPlace, type, isLoading]);

  // Animation updates - only for selection animation
  useFrame((state) => {
    if (!groupRef.current) return;

    // For physics-controlled objects, sync from store (they need dynamic updates)
    if (isPhysicsControlled && !disablePositionSync) {
      const store = useWorldStore.getState();
      const object = store.objects.find((obj) => obj.id === objectId);
      if (object) {
        groupRef.current.position.set(...object.position);
        groupRef.current.rotation.set(...object.rotation);
      }
    }

    // Only apply selection animation when selected, let JSX props handle static positioning
    if (selected) {
      const baseRotationY = isPhysicsControlled
        ? groupRef.current.rotation.y
        : rotation[1];
      groupRef.current.rotation.y =
        baseRotationY + Math.sin(state.clock.elapsedTime * 1.2) * 0.05;
    }
  });

  // Don't render if model failed to load
  if (!bearModel) {
    console.warn(`Bear ${type}: Failed to load model, not rendering`);
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{
        isPlacedObject: true,
        objectId,
        isPhysicsControlled,
        type: "animal",
      }}
    >
      <primitive object={bearModel} />

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[0.8, 1.0, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

// Preload the bear model
useGLTF.preload("/animals/bear_brown.glb");

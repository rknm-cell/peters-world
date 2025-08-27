"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { applyStandardizedScaling } from "~/lib/utils/model-scaling";

interface SheepProps {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId?: string;
  preview?: boolean;
  canPlace?: boolean;
  disablePositionSync?: boolean; // Disable store position sync when controlled by physics
  isPhysicsControlled?: boolean; // Exclude from PlacementSystem raycasting when physics-controlled
}

export function Sheep({
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
}: SheepProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLTF model
  const { scene: gltfScene, ...gltfResult } = useGLTF(`/${type}.glb`);
  const isLoading = !gltfResult || !gltfScene;

  // Clone the scene to avoid sharing between instances
  const sheepModel = useMemo(() => {
    if (isLoading || !gltfScene) {
      console.log(`Sheep ${type}: GLB loading failed or no scene`, {
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

      console.log(`Sheep ${type}: Model loaded successfully`, {
        hasModel: !!clonedScene,
        scaleFactor,
        "sheep positioned by PlacementSystem": true,
      });

      return clonedScene;
    } catch (error) {
      console.error(`Sheep ${type}: Error processing GLB scene:`, error);
      return null;
    }
  }, [gltfScene, preview, canPlace, type, isLoading]);

  // Animation and movement updates
  useFrame((state) => {
    if (!groupRef.current) return;

    // Update position from store if not physics-controlled
    if (!isPhysicsControlled && !disablePositionSync) {
      const store = useWorldStore.getState();
      const object = store.objects.find((obj) => obj.id === objectId);
      if (object) {
        groupRef.current.position.set(...object.position);
        groupRef.current.rotation.set(...object.rotation);
      }
    }

    // Add subtle idle animation for sheep
    if (selected) {
      groupRef.current.rotation.y =
        rotation[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    } else {
      groupRef.current.rotation.y = rotation[1];
    }
  });

  // Don't render if model failed to load
  if (!sheepModel) {
    console.warn(`Sheep ${type}: Failed to load model, not rendering`);
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
      <primitive object={sheepModel} />

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[0.6, 0.8, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

// Preload the sheep model
useGLTF.preload("/animals/sheep-white.glb");

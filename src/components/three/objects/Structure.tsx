"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useSelectedObject } from "~/lib/store";
import { COLOR_PALETTES, MODEL_SCALING } from "~/lib/constants";

// Preload GLB models
useGLTF.preload("/buildings/building-cabin-small.glb");
useGLTF.preload("/buildings/building-cabin-big.glb");

interface StructureProps {
  type?:
    | "house"
    | "tower"
    | "bridge"
    | "building-cabin-small"
    | "building-cabin-big";
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  objectId: string;
  preview?: boolean;
  canPlace?: boolean;
}

export function Structure({
  type = "house",
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  objectId,
  preview = false,
  canPlace = true,
}: StructureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedObject = useSelectedObject();
  const selected = selectedObject === objectId;

  // Load GLB models for the new building types
  const cabinSmallModel = useGLTF("/buildings/building-cabin-small.glb");
  const cabinBigModel = useGLTF("/buildings/building-cabin-big.glb");

  // Handle loading states for GLB models
  const isLoadingSmall = !cabinSmallModel.scene;
  const isLoadingBig = !cabinBigModel.scene;

  // Create materials that work well with directional lighting and shadows
  const materials = useMemo(() => {
    // Use red color for invalid placement previews
    const wallColor = preview && !canPlace ? "#ff0000" : "#D2B48C";
    const roofColor = preview && !canPlace ? "#ff0000" : "#8B4513";
    const stoneColor =
      preview && !canPlace ? "#ff0000" : COLOR_PALETTES.rock.primary;

    return {
      wall: new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.8, // Slightly rough walls
        metalness: 0.0, // Non-metallic
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      roof: new THREE.MeshStandardMaterial({
        color: roofColor,
        roughness: 0.9, // Rough roof material
        metalness: 0.0, // Non-metallic
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      stone: new THREE.MeshStandardMaterial({
        color: stoneColor,
        roughness: 0.95, // Very rough stone
        metalness: 0.0, // Non-metallic
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
    };
  }, [preview, canPlace]);

  // Calculate scale factor to match target heights
  const getBuildingScale = useMemo(() => {
    const targetHeight =
      MODEL_SCALING.targetHeights.structures[
        type as keyof typeof MODEL_SCALING.targetHeights.structures
      ] || 1.0;

    // Estimate the original height of the GLB model (this may need adjustment based on actual model dimensions)
    let originalHeight = 1.0;

    switch (type) {
      case "building-cabin-small":
        originalHeight = 2.0; // Estimate - adjust based on actual model
        break;
      case "building-cabin-big":
        originalHeight = 3.0; // Estimate - adjust based on actual model
        break;
      default:
        originalHeight = 1.0;
    }

    // Calculate scale factor to achieve target height
    const scaleFactor = targetHeight / originalHeight;

    // Apply global scale factor and ensure it's within bounds
    const finalScale = Math.max(
      MODEL_SCALING.minScaleFactor,
      Math.min(
        MODEL_SCALING.maxScaleFactor,
        scaleFactor * MODEL_SCALING.globalScaleFactor,
      ),
    );



    return finalScale;
  }, [type]);

  // Process cabin models with proper error handling and preview styling
  const processedCabinModels = useMemo(() => {
    if (type === "building-cabin-small") {
      if (isLoadingSmall || !cabinSmallModel.scene) {
        return null;
      }

      try {
        const clonedScene = cabinSmallModel.scene.clone(true);

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
    } else if (type === "building-cabin-big") {
      if (isLoadingBig || !cabinBigModel.scene) {
        return null;
      }

      try {
        const clonedScene = cabinBigModel.scene.clone(true);

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
    }

    return null;
  }, [
    type,
    cabinSmallModel.scene,
    cabinBigModel.scene,
    isLoadingSmall,
    isLoadingBig,
    preview,
    canPlace,
    getBuildingScale,
  ]);

  // Generate structure geometry based on type
  const renderStructure = () => {
    switch (type) {
      case "house":
        return (
          <>
            {/* House base */}
            <mesh
              position={[0, 0.5, 0]}
              geometry={new THREE.BoxGeometry(1.2, 1, 1)}
              material={materials.wall}
              castShadow
              receiveShadow
            />
            {/* Roof */}
            <mesh
              position={[0, 1.2, 0]}
              geometry={new THREE.ConeGeometry(0.9, 0.8, 4)}
              material={materials.roof}
              castShadow
              rotation={[0, Math.PI / 4, 0]}
            />
          </>
        );

      case "tower":
        return (
          <>
            {/* Tower base */}
            <mesh
              position={[0, 0.8, 0]}
              geometry={new THREE.CylinderGeometry(0.4, 0.5, 1.6, 8)}
              material={materials.stone}
              castShadow
              receiveShadow
            />
            {/* Tower top */}
            <mesh
              position={[0, 1.8, 0]}
              geometry={new THREE.ConeGeometry(0.5, 0.6, 8)}
              material={materials.roof}
              castShadow
            />
          </>
        );

      case "bridge":
        return (
          <>
            {/* Bridge deck */}
            <mesh
              position={[0, 0.2, 0]}
              geometry={new THREE.BoxGeometry(2, 0.1, 0.6)}
              material={materials.wall}
              castShadow
              receiveShadow
            />
            {/* Bridge supports */}
            <mesh
              position={[-0.8, -0.2, 0]}
              geometry={new THREE.BoxGeometry(0.1, 0.6, 0.1)}
              material={materials.stone}
              castShadow
            />
            <mesh
              position={[0.8, -0.2, 0]}
              geometry={new THREE.BoxGeometry(0.1, 0.6, 0.1)}
              material={materials.stone}
              castShadow
            />
          </>
        );

      case "building-cabin-small":
        if (!processedCabinModels) {
          return null;
        }
        return (
          <primitive
            object={processedCabinModels}
            scale={[getBuildingScale, getBuildingScale, getBuildingScale]}
          />
        );

      case "building-cabin-big":
        if (!processedCabinModels) {
          return null;
        }
        return (
          <primitive
            object={processedCabinModels}
            scale={[getBuildingScale, getBuildingScale, getBuildingScale]}
          />
        );

      default:
        return (
          <mesh
            position={[0, 0.5, 0]}
            geometry={new THREE.BoxGeometry(1, 1, 1)}
            material={materials.wall}
            castShadow
            receiveShadow
          />
        );
    }
  };

  // Animation for selected state - improved rotation handling
  useFrame((state) => {
    if (!groupRef.current) return;

    // Handle rotation updates consistently with placement system
    // Only update rotation if there's a significant difference to reduce flickering
    if (
      Math.abs(groupRef.current.rotation.x - rotation[0]) > 0.01 ||
      Math.abs(groupRef.current.rotation.y - rotation[1]) > 0.01 ||
      Math.abs(groupRef.current.rotation.z - rotation[2]) > 0.01
    ) {
      groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }

    // Add subtle animation for selected state (similar to other objects)
    if (selected) {
      // Store base rotation and set absolute rotation with animation
      groupRef.current.userData.baseRotationY ??= rotation[1];
      const baseRotationY = groupRef.current.userData.baseRotationY as number;
      groupRef.current.rotation.y =
        baseRotationY + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    } else {
      // Clear stored base rotation when not selected
      if (groupRef.current.userData.baseRotationY !== undefined) {
        groupRef.current.userData.baseRotationY = undefined;
      }
    }
  });

  // Don't render if cabin models failed to load
  if (
    (type === "building-cabin-small" || type === "building-cabin-big") &&
    !processedCabinModels
  ) {
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
        type: "structure",
      }}
    >
      {renderStructure()}

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[1.2, 1.4, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

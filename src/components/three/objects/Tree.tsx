"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { COLOR_PALETTES } from "~/lib/constants";

// Define the tree types based on available GLB files
type TreeType = 
  | "tree" 
  | "tree-baobab"
  | "tree-beech" 
  | "tree-birch"
  | "tree-conifer"
  | "tree-elipse"
  | "tree-fir"
  | "tree-forest"
  | "tree-lime"
  | "tree-maple"
  | "tree-oak"
  | "tree-round"
  | "tree-spruce"
  | "tree-tall";

interface TreeProps {
  type: TreeType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId: string;
  preview?: boolean;
  canPlace?: boolean;
}

export function Tree({
  type,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selected = false,
  objectId,
  preview = false,
  canPlace = true,
}: TreeProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLB file based on tree type
  const { scene } = useGLTF(`/${type}.glb`);

  // Clone the scene to avoid sharing between instances
  const treeModel = useMemo(() => {
    if (!scene) return null;
    
    const clonedScene = scene.clone();
    
    // Apply materials that work well with directional lighting and shadows
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Create new materials to avoid sharing between instances
        const material = child.material.clone();
        
        if (preview && !canPlace) {
          // Use red color for invalid placement previews
          material.color.setHex(0xff0000);
          material.transparent = true;
          material.opacity = 0.6;
        }
        
        // Ensure materials work well with lighting
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = 0.8;
          material.metalness = 0.0;
        }
        
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    return clonedScene;
  }, [scene, preview, canPlace]);

  // Animation for selected state
  useFrame((state) => {
    if (groupRef.current && selected) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else if (groupRef.current) {
      groupRef.current.rotation.y = rotation[1];
    }
  });

  if (!treeModel) {
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ isPlacedObject: true, objectId }}
    >
      {/* Render the GLB model */}
      <primitive object={treeModel} />

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

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

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

  // Load the GLB file
  const gltfResult = useGLTF(`/${type}.glb`);
  
  // Clone the scene to avoid sharing between instances
  const treeModel = useMemo(() => {
    if (!gltfResult || !gltfResult.scene) {
      return null;
    }

    const clonedScene = gltfResult.scene.clone(true);

    // Reset transformations
    clonedScene.position.set(0, 0, 0);
    clonedScene.rotation.set(0, 0, 0);
    clonedScene.scale.set(1, 1, 1);

    // Scale to target height
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const targetHeight = 1.2; // Increased from 0.3 to 1.2 units (20% of globe radius)
    const currentHeight = Math.max(size.y, 0.001);
    const scaleFactor = targetHeight / currentHeight;
    
    // IMPORTANT: Calculate the base offset BEFORE scaling
    // This ensures trees stay on the surface regardless of final size
    const baseOffset = -box.min.y;
    
    // Apply scaling
    clonedScene.scale.setScalar(scaleFactor);
    
    // Apply the pre-calculated offset (this keeps trees on the surface)
    clonedScene.position.y = baseOffset;

    console.log(`Tree ready:`, { 
      targetHeight, 
      scaleFactor, 
      'original base offset': baseOffset,
      'tree will stay on surface': true
    });

    return clonedScene;
  }, [gltfResult?.scene, type]);

  // Animation for selected state
  useFrame((state) => {
    if (groupRef.current && selected) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else if (groupRef.current) {
      groupRef.current.rotation.y = rotation[1];
    }
  });

  if (!treeModel) {
    // Fallback to a simple visible tree
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        userData={{ isPlacedObject: true, objectId }}
      >
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 8, 6]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
        
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.6, 4, 8]} />
          <meshStandardMaterial color="#228B22" />
        </mesh>
        
        {selected && (
          <mesh position={[0, -0.1, 0]}>
            <ringGeometry args={[0.8, 1.0, 16]} />
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
      userData={{ isPlacedObject: true, objectId }}
    >
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.7} />
      </mesh>
      
      <primitive object={treeModel} />

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 4, 2]} />
        <meshBasicMaterial color="#00ff00" wireframe={true} transparent opacity={0.3} />
      </mesh>

      {selected && (
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[0.8, 1.0, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

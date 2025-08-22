"use client";

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyStandardizedScaling } from '~/lib/utils/model-scaling';

// Grass types are defined in constants.ts and used dynamically

interface GrassProps {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId?: string;
  preview?: boolean;
  canPlace?: boolean;
}

export function Grass({
  type,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selected = false,
  objectId,
  preview = false,
  canPlace = true,
}: GrassProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLTF model
  const { scene: gltfScene, ...gltfResult } = useGLTF(`/${type}.glb`);
  const isLoading = !gltfResult || !gltfScene;

  // Removed getTargetHeight - now using centralized scaling utility

  // Clone the scene to avoid sharing between instances
  const grassModel = useMemo(() => {
    if (isLoading || !gltfScene) {
      console.log(`Grass ${type}: GLB loading failed or no scene`, {
        isLoading,
        hasScene: !!gltfScene
      });
      return null;
    }

    try {
      const clonedScene = gltfScene.clone(true);
      
      // Apply standardized scaling using the new utility
      const scaleFactor = applyStandardizedScaling(clonedScene, {
        objectType: 'grass',
        modelType: type,
        preview
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

      console.log(`Grass ${type}: Model loaded successfully`, {
        hasModel: !!clonedScene,
        scaleFactor,
        'grass positioned by PlacementSystem': true
      });

      return clonedScene;
    } catch (error) {
      console.error(`Grass ${type}: Error processing GLB scene:`, error);
      return null;
    }
  }, [gltfScene, preview, canPlace, type, isLoading]);

  // Animation for selected state
  useFrame((state) => {
    if (groupRef.current && selected) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else if (groupRef.current && Math.abs(groupRef.current.rotation.y - rotation[1]) > 0.01) {
      // Only update rotation if there's a significant difference to reduce flickering
      groupRef.current.rotation.y = rotation[1];
    }
  });

  if (!grassModel) {
    // Fallback to a simple visible grass representation
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        userData={{ isPlacedObject: false, objectId, isGrass: true }} // Grass shouldn't be interactive for camera controls
      >
        <mesh 
          position={[0, 0.02, 0]} 
          castShadow 
          receiveShadow
          raycast={() => null} // Make grass transparent to raycasting for camera controls
        >
          <coneGeometry args={[0.01, 0.06, 4]} />
          <meshStandardMaterial 
            color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#228B22"}
            transparent={preview}
            opacity={preview ? 0.6 : 1.0}
          />
        </mesh>
        
        {/* Selection indicator */}
        {selected && !preview && (
          <mesh position={[0, 0.05, 0]}>
            <ringGeometry args={[0.03, 0.05, 16]} />
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
      userData={{ isPlacedObject: false, objectId, isGrass: true }} // Grass shouldn't be interactive for camera controls
    >
      <primitive 
        object={grassModel} 
        raycast={() => null} // Make grass transparent to raycasting for camera controls
      />
      
      {/* Selection indicator */}
      {selected && !preview && (
        <mesh position={[0, 0.05, 0]}>
          <ringGeometry args={[0.03, 0.05, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
"use client";

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { applyStandardizedScaling } from '~/lib/utils/model-scaling';

interface DeerProps {
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

export function Deer({
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
}: DeerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLTF model
  const { scene: gltfScene, ...gltfResult } = useGLTF(`/${type}.glb`);
  const isLoading = !gltfResult || !gltfScene;

  // Removed getTargetHeight - now using centralized scaling utility

  // Clone the scene to avoid sharing between instances
  const deerModel = useMemo(() => {
    if (isLoading || !gltfScene) {
      console.log(`Deer ${type}: GLB loading failed or no scene`, {
        isLoading,
        hasScene: !!gltfScene
      });
      return null;
    }

    try {
      const clonedScene = gltfScene.clone(true);
      
      // Apply standardized scaling using the new utility
      const scaleFactor = applyStandardizedScaling(clonedScene, {
        objectType: 'animal',
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

      console.log(`Deer ${type}: Model loaded successfully`, {
        hasModel: !!clonedScene,
        scaleFactor,
        'deer positioned by PlacementSystem': true
      });

      return clonedScene;
    } catch (error) {
      console.error(`Deer ${type}: Error processing GLB scene:`, error);
      return null;
    }
  }, [gltfScene, preview, canPlace, type, isLoading]);

  // Animation and movement updates
  useFrame((state) => {
    if (!groupRef.current) return;

    // Skip all updates if controlled by physics (DeerPhysics component)
    // Physics system handles position, rotation, and all animations
    if (disablePositionSync) {
      return;
    }

    // Get fresh store state every frame for movement updates (non-physics deer)
    if (!preview && objectId) {
      const storeState = useWorldStore.getState();
      const currentObject = storeState.objects.find(obj => obj.id === objectId);
      
      if (currentObject) {
        // Update position from store state (for movement)
        groupRef.current.position.set(...currentObject.position);
        
        // Update rotation from store state (deer face movement direction)
        if (currentObject.rotation) {
          groupRef.current.rotation.set(...currentObject.rotation);
        }
      } else {
        // Fallback to props if not found in store
        groupRef.current.position.set(...position);
        groupRef.current.rotation.set(...rotation);
      }
    } else {
      // Use props for preview or if no objectId
      groupRef.current.position.set(...position);
      groupRef.current.rotation.set(...rotation);
    }

    // Selected state animation (absolute rotation, not additive)
    // Use object-specific time offset to prevent synchronization with other deer
    if (selected) {
      const timeOffset = objectId ? parseFloat('0.' + objectId.replace(/[^0-9]/g, '').slice(0, 6)) : 0;
      const uniqueTime = state.clock.elapsedTime + timeOffset;
      // Store base rotation and set absolute rotation with animation
      groupRef.current.userData.baseRotationY ??= groupRef.current.rotation.y;
      const baseRotationY = groupRef.current.userData.baseRotationY as number;
      groupRef.current.rotation.y = baseRotationY + Math.sin(uniqueTime * 2) * 0.1;
    } else {
      // Clear stored base rotation when not selected
      if (groupRef.current.userData.baseRotationY !== undefined) {
        groupRef.current.userData.baseRotationY = undefined;
      }
    }
  });

  if (!deerModel) {
    // Fallback to a simple visible deer representation
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        userData={{ 
          isPlacedObject: !preview && !isPhysicsControlled, // Physics deer excluded from placement raycasting
          objectId,
          isPhysicsControlled 
        }}
      >
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.8, 0.6]} />
          <meshStandardMaterial 
            color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#8B4513"}
            transparent={preview}
            opacity={preview ? 0.6 : 1.0}
          />
        </mesh>
        
        {/* Selection indicator */}
        {selected && !preview && (
          <mesh position={[0, 0.8, 0]}>
            <ringGeometry args={[0.4, 0.6, 16]} />
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
        isPlacedObject: !preview && !isPhysicsControlled, // Physics deer excluded from placement raycasting
        objectId,
        isPhysicsControlled 
      }}
    >
      <primitive object={deerModel} />
      
      {/* Selection indicator */}
      {selected && !preview && (
        <mesh position={[0, 0.8, 0]}>
          <ringGeometry args={[0.4, 0.6, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

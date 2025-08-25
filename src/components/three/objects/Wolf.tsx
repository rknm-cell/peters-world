"use client";

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';

interface WolfProps {
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

export function Wolf({
  type,
  position,
  rotation = [0, 0, 0],
  scale = [0.6, 0.6, 0.6], // Slightly larger than deer
  selected = false,
  objectId,
  preview = false,
  canPlace = true,
  disablePositionSync = false,
  isPhysicsControlled = false,
}: WolfProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLTF model
  const { scene: gltfScene, ...gltfResult } = useGLTF(`/${type}.glb`);
  const isLoading = !gltfResult || !gltfScene;

  // Get target height for wolf - larger than deer
  const getTargetHeight = (wolfType: string): number => {
    // Base target height for wolf
    let baseHeight = 0.9; // Default wolf height (larger than deer)
    
    // Adjust based on wolf type (if we add more wolf variants later)
    if (wolfType.includes("pup")) {
      baseHeight = 0.6; // Wolf pup
    } else if (wolfType.includes("alpha")) {
      baseHeight = 1.1; // Alpha wolf
    }
    
    return baseHeight;
  };

  // Clone the scene to avoid sharing between instances
  const wolfModel = useMemo(() => {
    if (isLoading || !gltfScene) {
      console.log(`Wolf ${type}: GLB loading failed or no scene`, {
        isLoading,
        hasScene: !!gltfScene
      });
      return null;
    }

    try {
      const clonedScene = gltfScene.clone(true);
      
      // Reset transformations - same as other models
      clonedScene.position.set(0, 0, 0);
      clonedScene.rotation.set(0, 0, 0);
      clonedScene.scale.set(1, 1, 1);

      // Scale to target height - same logic as deer
      const box = new THREE.Box3().setFromObject(clonedScene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const targetHeight = getTargetHeight(type);
      const currentHeight = Math.max(size.y, 0.001);
      let scaleFactor = targetHeight / currentHeight;
      
      // Safety check: prevent extreme scaling
      scaleFactor = Math.max(0.1, Math.min(scaleFactor, 10.0));
      
      // Apply scaling
      clonedScene.scale.setScalar(scaleFactor);
      
      // Reset position to origin - let PlacementSystem handle positioning
      clonedScene.position.set(0, 0, 0);

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

      console.log(`Wolf ${type}: Model loaded successfully`, {
        hasModel: !!clonedScene,
        targetHeight,
        scaleFactor,
        originalSize: size,
        'wolf positioned by PlacementSystem': true
      });

      return clonedScene;
    } catch (error) {
      console.error(`Wolf ${type}: Error processing GLB scene:`, error);
      return null;
    }
  }, [gltfScene, preview, canPlace, type, isLoading]);

  // Animation and movement updates
  useFrame((state) => {
    if (!groupRef.current) return;

    // Skip all updates if controlled by physics (WolfPhysics component)
    // Physics system handles position, rotation, and all animations
    if (disablePositionSync) {
      return;
    }

    // Get fresh store state every frame for movement updates (non-physics wolf)
    if (!preview && objectId) {
      const storeState = useWorldStore.getState();
      const currentObject = storeState.objects.find(obj => obj.id === objectId);
      
      if (currentObject) {
        // Update position from store state (for movement)
        groupRef.current.position.set(...currentObject.position);
        
        // Update rotation from store state (wolf face movement direction)
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

    // Selected state animation (override rotation temporarily)
    if (selected) {
      groupRef.current.rotation.y += Math.sin(state.clock.elapsedTime * 2) * 0.1;
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
          isPhysicsControlled 
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
        isPhysicsControlled 
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
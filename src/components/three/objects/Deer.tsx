"use client";

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';

interface DeerProps {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId?: string;
  preview?: boolean;
  canPlace?: boolean;
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
}: DeerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLTF model
  const { scene: gltfScene, ...gltfResult } = useGLTF(`/${type}.glb`);
  const isLoading = !gltfResult || !gltfScene;

  // Get target height for deer - similar to trees but appropriate for animals
  const getTargetHeight = (deerType: string): number => {
    // Base target height for deer
    let baseHeight = 0.8; // Default deer height
    
    // Adjust based on deer type (if we add more deer variants later)
    if (deerType.includes("fawn")) {
      baseHeight = 0.5; // Fawn deer
    } else if (deerType.includes("large")) {
      baseHeight = 1.0; // Large deer
    }
    
    return baseHeight;
  };

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
      
      // Reset transformations - same as other models
      clonedScene.position.set(0, 0, 0);
      clonedScene.rotation.set(0, 0, 0);
      clonedScene.scale.set(1, 1, 1);

      // Scale to target height - same logic as trees and grass
      const box = new THREE.Box3().setFromObject(clonedScene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const targetHeight = getTargetHeight(type);
      const currentHeight = Math.max(size.y, 0.001);
      let scaleFactor = targetHeight / currentHeight;
      
      // Safety check: prevent extreme scaling (same as trees)
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

      console.log(`Deer ${type}: Model loaded successfully`, {
        hasModel: !!clonedScene,
        targetHeight,
        scaleFactor,
        originalSize: size,
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

    // Get fresh store state every frame for movement updates
    if (!preview && objectId) {
      const storeState = useWorldStore.getState();
      const currentObject = storeState.objects.find(obj => obj.id === objectId);
      
      if (currentObject) {
        // Store the previous position to detect changes
        const prevPos = groupRef.current.position.toArray();
        
        // Update position from store state (for movement)
        groupRef.current.position.set(...currentObject.position);
        
        // Update rotation from store state (deer face movement direction)
        if (currentObject.rotation) {
          groupRef.current.rotation.set(...currentObject.rotation);
        }
        
        // Debug logging to see if position is updating
        if (state.clock.elapsedTime % 1 < 0.02) { // Log every 1 seconds
          const newPos = groupRef.current.position.toArray();
          const positionChanged = Math.abs(prevPos[0] - newPos[0]) > 0.001 || 
                                 Math.abs(prevPos[1] - newPos[1]) > 0.001 || 
                                 Math.abs(prevPos[2] - newPos[2]) > 0.001;
          
          console.warn(`🦌 DEER COMPONENT ${objectId}: useFrame update`);
          console.warn(`   Store position: [${currentObject.position.join(', ')}]`);
          console.warn(`   Three.js position: [${newPos.join(', ')}]`);
          console.warn(`   Position changed this frame: ${positionChanged}`);
          console.warn(`   Movement data:`, currentObject.deerMovement);
        }
      } else {
        console.warn(`🦌 DEER COMPONENT ${objectId}: Object not found in store, using props`);
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

  if (!deerModel) {
    // Fallback to a simple visible deer representation
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        userData={{ isPlacedObject: !preview, objectId }}
      >
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
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
      userData={{ isPlacedObject: !preview, objectId }}
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

"use client";

import { useRef, useMemo, useState, useEffect } from "react";
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
  const [glbError, setGlbError] = useState<string | null>(null);

  // Load the GLB file with error handling
  let gltfResult: any;
  try {
    gltfResult = useGLTF(`/${type}.glb`);
    console.log(`Tree ${type}: GLB loaded successfully:`, gltfResult);
  } catch (error) {
    console.error(`Tree ${type}: GLB loading error:`, error);
    setGlbError(error instanceof Error ? error.message : 'Unknown error');
  }
  
  // Clone the scene to avoid sharing between instances
  const treeModel = useMemo(() => {
    if (!gltfResult || !gltfResult.scene) {
      console.log(`Tree ${type}: GLB loading failed or no scene`, {
        gltfResult,
        hasScene: !!gltfResult?.scene,
        error: glbError
      });
      return null;
    }

    try {
      const clonedScene = gltfResult.scene.clone(true);
      console.log(`Tree ${type}: Scene cloned successfully:`, clonedScene);

      // Reset transformations
      clonedScene.position.set(0, 0, 0);
      clonedScene.rotation.set(0, 0, 0);
      clonedScene.scale.set(1, 1, 1);

      // Scale to target height
      const box = new THREE.Box3().setFromObject(clonedScene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const targetHeight = 1.2; // Target height in units
      const currentHeight = Math.max(size.y, 0.001);
      const scaleFactor = targetHeight / currentHeight;
      
      // Apply scaling
      clonedScene.scale.setScalar(scaleFactor);
      
      // Reset position to origin - let PlacementSystem handle positioning
      clonedScene.position.set(0, 0, 0);

      // If this is a preview, modify the materials to be transparent
      if (preview) {
        console.log(`Tree ${type}: Applying preview materials, canPlace: ${canPlace}`);
        clonedScene.traverse((child: any) => {
          if (child instanceof THREE.Mesh && child.material) {
            // Clone the material to avoid affecting other instances
            const material = child.material.clone();
            
            // Make it transparent
            material.transparent = true;
            material.opacity = 0.6;
            
            // Change color based on placement validity
            if (canPlace) {
              // Green tint for valid placement - multiply existing color with green
              material.color.multiply(new THREE.Color(0.3, 1.0, 0.3));
              console.log(`Tree ${type}: Applied green tint`);
            } else {
              // Red tint for invalid placement - multiply existing color with red
              material.color.multiply(new THREE.Color(1.0, 0.3, 0.3));
              console.log(`Tree ${type}: Applied red tint`);
            }
            
            child.material = material;
          }
        });
      }

      console.log(`Tree ready:`, { 
        type,
        targetHeight, 
        scaleFactor,
        preview,
        canPlace,
        hasModel: !!clonedScene,
        'tree will be positioned by PlacementSystem': true
      });

      return clonedScene;
    } catch (error) {
      console.error(`Tree ${type}: Error processing GLB scene:`, error);
      return null;
    }
  }, [gltfResult, preview, canPlace, type, glbError]);

  // Animation for selected state
  useFrame((state) => {
    if (groupRef.current && selected) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else if (groupRef.current) {
      groupRef.current.rotation.y = rotation[1];
    }
  });

  if (!treeModel) {
    // Fallback to a simple visible tree - only show this if GLB loading fails
    return (
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        userData={{ isPlacedObject: !preview, objectId }}
      >
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 8, 6]} />
          <meshBasicMaterial 
            color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#ff0000"}
            transparent={preview}
            opacity={preview ? 0.6 : 1.0}
          />
        </mesh>
        
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
          <meshStandardMaterial 
            color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#8B4513"}
            transparent={preview}
            opacity={preview ? 0.6 : 1.0}
          />
        </mesh>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.6, 4, 8]} />
          <meshStandardMaterial 
            color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#228B22"}
            transparent={preview}
            opacity={preview ? 0.6 : 1.0}
          />
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
      userData={{ isPlacedObject: !preview, objectId }}
    >
      {/* Preview indicator - only show for preview mode */}
      {preview && (
        <>
          {/* Base placement indicator */}
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
            <meshBasicMaterial 
              color={canPlace ? "#00ff00" : "#ff0000"} 
              transparent 
              opacity={0.7} 
            />
          </mesh>
          
          {/* Placement validity indicator ring */}
          <mesh position={[0, -0.1, 0]}>
            <ringGeometry args={[0.8, 1.0, 16]} />
            <meshBasicMaterial 
              color={canPlace ? "#00ff00" : "#ff0000"} 
              transparent 
              opacity={0.4} 
            />
          </mesh>
          
          {/* Invalid placement glow effect */}
          {!canPlace && (
            <mesh position={[0, 0.6, 0]}>
              <sphereGeometry args={[1.5, 16, 16]} />
              <meshBasicMaterial 
                color="#ff0000" 
                transparent 
                opacity={0.1} 
              />
            </mesh>
          )}
        </>
      )}
      
      {/* The actual tree model - always render this */}
      {treeModel ? (
        <primitive object={treeModel} />
      ) : (
        // Fallback tree if GLB fails to load - this will definitely work
        <>
          {/* Tree trunk */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.15, 1.2, 8]} />
            <meshStandardMaterial 
              color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#8B4513"}
              transparent={preview}
              opacity={preview ? 0.6 : 1.0}
            />
          </mesh>
          
          {/* Tree foliage */}
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.8, 1.8, 8]} />
            <meshStandardMaterial 
              color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#228B22"}
              transparent={preview}
              opacity={preview ? 0.6 : 1.0}
            />
          </mesh>
          
          {/* Additional foliage layer for more realistic look */}
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.6, 1.2, 8]} />
            <meshStandardMaterial 
              color={preview ? (canPlace ? "#00ff00" : "#ff0000") : "#32CD32"}
              transparent={preview}
              opacity={preview ? 0.6 : 1.0}
            />
          </mesh>
        </>
      )}

      {selected && !preview && (
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[0.8, 1.0, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

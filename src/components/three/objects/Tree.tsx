"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three-stdlib";
import * as THREE from "three";
import type { TreeLifecycleStage } from "~/lib/store";
import { applySpecialScaling } from "~/lib/utils/model-scaling";

// Define the tree types based on available GLB files - includes all lifecycle stages
type TreeType = 
  // Youth stages (bush models)
  | "bush-small" | "bush-medium" | "bush-medium-high" | "bush-big"
  // Adult trees
  | "tree" | "tree-baobab" | "tree-beech" | "tree-birch" | "tree-conifer"
  | "tree-elipse" | "tree-fir" | "tree-forest" | "tree-lime" | "tree-maple" 
  | "tree-oak" | "tree-round" | "tree-spruce" | "tree-tall"
  // Death stages
  | "dead-tree-1" | "dead-tree-2" | "dead-tree-3" | "dead-tree-4"
  | "broke-tree" | "log-a" | "log-b" | "log-small-a" | "log-small-b";

interface TreeProps {
  type: TreeType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId: string;
  preview?: boolean;
  canPlace?: boolean;
  lifecycleStage?: TreeLifecycleStage;
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
  lifecycleStage,
}: TreeProps) {
  const groupRef = useRef<THREE.Group>(null);


  // Load the GLB file - useGLTF handles its own error cases
  const gltfResult = useGLTF(`/${type}.glb`) as GLTF;
  
  // Handle loading state
  const isLoading = !gltfResult.scene;
  
  // Removed getTargetHeight - now using centralized scaling utility

  
  // Clone the scene to avoid sharing between instances - memoized with stable key
  const treeModel = useMemo(() => {
    if (isLoading || !gltfResult.scene) {
      console.log(`Tree ${type}: GLB loading failed or no scene`, {
        isLoading,
        hasScene: !!gltfResult.scene
      });
      return null;
    }

    try {
      const clonedScene = gltfResult.scene.clone(true);
      console.log(`Tree ${type}: Scene cloned successfully:`, clonedScene);

      // Apply standardized scaling using the new utility
      const scaleFactor = applySpecialScaling(clonedScene, type, lifecycleStage);

      // Enable shadows for all meshes in the tree model
      clonedScene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // If this is a preview, modify the materials to be transparent
      if (preview) {
        console.log(`Tree ${type}: Applying preview materials, canPlace: ${canPlace}`);
        clonedScene.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.material) {
            // Clone the material to avoid affecting other instances
            const material = (child.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
            
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
  }, [gltfResult, isLoading, type, lifecycleStage, preview, canPlace]); // Include all dependencies

  // Animation for selected state - throttled to reduce flickering
  useFrame((state) => {
    if (groupRef.current && selected) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else if (groupRef.current && Math.abs(groupRef.current.rotation.y - rotation[1]) > 0.01) {
      // Only update rotation if there's a significant difference to reduce flickering
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
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          {/* <sphereGeometry args={[0.2, 8, 6]} /> */}
          <meshStandardMaterial 
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

      {/* Lifecycle stage indicator - small colored dot */}
      {lifecycleStage && !preview && (
        <mesh position={[0.5, 0.1, 0]}>
          {/* spheregeometry debug */}
          {/* <sphereGeometry args={[0.05, 8, 6]} /> */}
          <meshBasicMaterial 
            color={
              lifecycleStage.startsWith("youth") ? "#00ff00" :     // Green for youth
              lifecycleStage === "adult" ? "#0066ff" :             // Blue for adult
              lifecycleStage === "dead-standing" ? "#ff6600" :     // Orange for dead
              lifecycleStage === "broken" ? "#ff3300" :            // Red for broken  
              lifecycleStage === "logs" ? "#8B4513" :              // Brown for logs (permanent)
              "#999999"                                            // Gray fallback
            } 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

"use client";

import { useRef, useMemo, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useSelectedObject } from "~/lib/store";
import { COLOR_PALETTES, DECORATION_MODELS, DECORATION_MODEL_PATHS } from "~/lib/constants";
import { applyStandardizedScaling } from "~/lib/utils/model-scaling";

interface DecorationProps {
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  objectId: string;
  preview?: boolean;
  canPlace?: boolean;
}

// Component to load GLTF model
function DecorationModel({ 
  modelPath, 
  materials, 
  position = [0, 0, 0],
  preview = false,
  modelType,
  canPlace = true
}: { 
  modelPath: string; 
  materials: Record<string, THREE.Material>;
  position?: [number, number, number];
  preview?: boolean;
  modelType: string;
  canPlace?: boolean;
}) {
  const { scene } = useGLTF(`/${modelPath}.glb`);
  
  // Clone and apply materials
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    
    // Apply standardized scaling
    applyStandardizedScaling(cloned, {
      objectType: 'decoration',
      modelType,
      preview
    });
    
    // Apply materials to all meshes
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Only apply custom materials to stone decorations
        // Preserve original GLB materials for flowers and mushrooms
        if (modelPath.includes('stone') || modelPath.includes('brown_stone')) {
          child.material = materials.stone;
        }
        // For flowers and mushrooms, keep their original GLB materials
        // but ensure they work with shadows and preview mode
        else if (preview && child.material) {
          // Clone the original material and modify for preview
          const originalMaterial = child.material as THREE.Material;
          const previewMaterial = originalMaterial.clone();
          if ('transparent' in previewMaterial) {
            previewMaterial.transparent = true;
            previewMaterial.opacity = 0.6;
          }
          if ('color' in previewMaterial && !canPlace) {
            (previewMaterial as THREE.MeshStandardMaterial).color.setHex(0xff0000);
          }
          child.material = previewMaterial;
        }
        
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    return cloned;
  }, [scene, materials, modelPath, preview, modelType, canPlace]);

  return <primitive object={clonedScene} position={position} />;
}

export function Decoration({
  type,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  objectId,
  preview = false,
  canPlace = true,
}: DecorationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedObject = useSelectedObject();
  const selected = selectedObject === objectId;

  // Create materials that work well with directional lighting and shadows
  const materials = useMemo(() => {
    // Use red color for invalid placement previews
    const stoneColor = preview && !canPlace ? "#ff0000" : "#8B7355";
    const flowerColor = preview && !canPlace ? "#ff0000" : "#FF69B4";
    const mushroomColor = preview && !canPlace ? "#ff0000" : "#8B4513";
    
    return {
      stone: new THREE.MeshToonMaterial({
        color: stoneColor,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      flower: new THREE.MeshToonMaterial({
        color: flowerColor,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      mushroom: new THREE.MeshToonMaterial({
        color: mushroomColor,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      // Legacy materials for fallback
      rock: new THREE.MeshStandardMaterial({
        color: preview && !canPlace ? "#ff0000" : COLOR_PALETTES.rock.primary,
        roughness: 0.95,
        metalness: 0.0,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
    };
  }, [preview, canPlace]);

  // Check if this is a GLTF model type
  const isGLTFModel = DECORATION_MODELS.some(model => model === type);
  
  // Generate decoration geometry based on type
  const renderDecoration = () => {
    // Handle new GLTF models
    if (isGLTFModel) {
      const modelPath = DECORATION_MODEL_PATHS[type as keyof typeof DECORATION_MODEL_PATHS] || type;
      return (
        <Suspense fallback={<mesh geometry={new THREE.BoxGeometry(0.2, 0.2, 0.2)} material={materials.rock} />}>
          <DecorationModel 
            modelPath={modelPath} 
            materials={materials}
            position={[0, 0, 0]}
            modelType={type}
            preview={preview}
            canPlace={canPlace}
          />
        </Suspense>
      );
    }
    
    // Handle legacy types
    switch (type) {
      case "rock":
        return (
          <mesh
            position={[0, 0.15, 0]}
            geometry={new THREE.SphereGeometry(0.3, 8, 6)}
            material={materials.rock}
            castShadow
            receiveShadow
          />
        );

      case "flower":
        return (
          <>
            {/* Stem */}
            <mesh
              position={[0, 0.15, 0]}
              geometry={new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6)}
              material={materials.flower}
              castShadow
            />
            {/* Flower petals */}
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh
                key={i}
                position={[
                  Math.cos((i * Math.PI * 2) / 5) * 0.08,
                  0.35,
                  Math.sin((i * Math.PI * 2) / 5) * 0.08,
                ]}
                geometry={new THREE.SphereGeometry(0.05, 6, 4)}
                material={materials.flower}
                castShadow
              />
            ))}
            {/* Center */}
            <mesh
              position={[0, 0.35, 0]}
              geometry={new THREE.SphereGeometry(0.03, 6, 4)}
              material={materials.flower}
              castShadow
            />
          </>
        );

      default:
        return (
          <mesh
            position={[0, 0.15, 0]}
            geometry={new THREE.SphereGeometry(0.3, 8, 6)}
            material={materials.rock}
            castShadow
            receiveShadow
          />
        );
    }
  };

  // Animation for selected state
  useFrame((state) => {
    if (groupRef.current && selected) {
      if (type === "flower") {
        groupRef.current.rotation.y = rotation[1] + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      } else {
        groupRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.05);
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ isPlacedObject: true, objectId }}
    >
      {renderDecoration()}

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, -0.05, 0]}>
          <ringGeometry args={[0.4, 0.5, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

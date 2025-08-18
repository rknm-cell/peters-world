"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_PALETTES } from "~/lib/constants";

interface DecorationProps {
  type?: "rock" | "flower";
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId: string;
  preview?: boolean;
  canPlace?: boolean;
}

export function Decoration({
  type = "rock",
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selected = false,
  objectId,
  preview = false,
  canPlace = true,
}: DecorationProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Create materials that work well with directional lighting and shadows
  const materials = useMemo(() => {
    // Use red color for invalid placement previews
    const rockColor = preview && !canPlace ? "#ff0000" : COLOR_PALETTES.rock.primary;
    const flowerColor = preview && !canPlace ? "#ff0000" : "#FF69B4";
    const stemColor = preview && !canPlace ? "#ff0000" : "#32CD32";
    
    return {
      rock: new THREE.MeshStandardMaterial({
        color: rockColor,
        roughness: 0.95, // Very rough stone surface
        metalness: 0.0, // Non-metallic
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      flower: new THREE.MeshStandardMaterial({
        color: flowerColor,
        roughness: 0.3, // Smooth flower petals
        metalness: 0.0, // Non-metallic
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      stem: new THREE.MeshStandardMaterial({
        color: stemColor,
        roughness: 0.8, // Slightly rough stem
        metalness: 0.0, // Non-metallic
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
    };
  }, [preview, canPlace]);

  // Generate decoration geometry based on type
  const renderDecoration = () => {
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
              material={materials.stem}
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
              material={materials.stem}
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
        groupRef.current.rotation.y =
          Math.sin(state.clock.elapsedTime * 3) * 0.1;
      } else {
        groupRef.current.scale.setScalar(
          1 + Math.sin(state.clock.elapsedTime * 4) * 0.05,
        );
      }
    } else if (groupRef.current) {
      groupRef.current.rotation.y = rotation[1];
      groupRef.current.scale.set(...scale);
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

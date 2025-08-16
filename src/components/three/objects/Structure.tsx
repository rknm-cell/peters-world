"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_PALETTES } from "~/lib/constants";

interface StructureProps {
  type?: "house" | "tower" | "bridge";
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId: string;
  preview?: boolean;
}

export function Structure({
  type = "house",
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selected = false,
  objectId,
  preview = false,
}: StructureProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Create cell-shaded materials
  const materials = useMemo(() => {
    const gradientTexture = new THREE.DataTexture(
      new Uint8Array([
        0,
        0,
        0,
        255, // Dark
        128,
        128,
        128,
        255, // Mid
        255,
        255,
        255,
        255, // Light
      ]),
      3,
      1,
      THREE.RGBAFormat,
    );
    gradientTexture.magFilter = THREE.NearestFilter;
    gradientTexture.minFilter = THREE.NearestFilter;
    gradientTexture.needsUpdate = true;

    return {
      wall: new THREE.MeshToonMaterial({
        color: "#D2B48C", // Tan
        gradientMap: gradientTexture,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      roof: new THREE.MeshToonMaterial({
        color: "#8B4513", // Brown
        gradientMap: gradientTexture,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      stone: new THREE.MeshToonMaterial({
        color: COLOR_PALETTES.rock.primary,
        gradientMap: gradientTexture,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
    };
  }, []);

  // Generate structure geometry based on type
  const renderStructure = () => {
    switch (type) {
      case "house":
        return (
          <>
            {/* House base */}
            <mesh
              position={[0, 0.5, 0]}
              geometry={new THREE.BoxGeometry(1.2, 1, 1)}
              material={materials.wall}
              castShadow
              receiveShadow
            />
            {/* Roof */}
            <mesh
              position={[0, 1.2, 0]}
              geometry={new THREE.ConeGeometry(0.9, 0.8, 4)}
              material={materials.roof}
              castShadow
              rotation={[0, Math.PI / 4, 0]}
            />
          </>
        );

      case "tower":
        return (
          <>
            {/* Tower base */}
            <mesh
              position={[0, 0.8, 0]}
              geometry={new THREE.CylinderGeometry(0.4, 0.5, 1.6, 8)}
              material={materials.stone}
              castShadow
              receiveShadow
            />
            {/* Tower top */}
            <mesh
              position={[0, 1.8, 0]}
              geometry={new THREE.ConeGeometry(0.5, 0.6, 8)}
              material={materials.roof}
              castShadow
            />
          </>
        );

      case "bridge":
        return (
          <>
            {/* Bridge deck */}
            <mesh
              position={[0, 0.2, 0]}
              geometry={new THREE.BoxGeometry(2, 0.1, 0.6)}
              material={materials.wall}
              castShadow
              receiveShadow
            />
            {/* Bridge supports */}
            <mesh
              position={[-0.8, -0.2, 0]}
              geometry={new THREE.BoxGeometry(0.1, 0.6, 0.1)}
              material={materials.stone}
              castShadow
            />
            <mesh
              position={[0.8, -0.2, 0]}
              geometry={new THREE.BoxGeometry(0.1, 0.6, 0.1)}
              material={materials.stone}
              castShadow
            />
          </>
        );

      default:
        return (
          <mesh
            position={[0, 0.5, 0]}
            geometry={new THREE.BoxGeometry(1, 1, 1)}
            material={materials.wall}
            castShadow
            receiveShadow
          />
        );
    }
  };

  // Animation for selected state
  useFrame((state) => {
    if (groupRef.current && selected) {
      groupRef.current.rotation.y =
        rotation[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    } else if (groupRef.current) {
      groupRef.current.rotation.y = rotation[1];
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
      {renderStructure()}

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[1.2, 1.4, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

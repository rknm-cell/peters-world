"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLOR_PALETTES } from "~/lib/constants";

interface TreeProps {
  type?: "pine" | "oak" | "birch";
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  objectId: string;
  preview?: boolean;
}

export function Tree({
  type = "pine",
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selected = false,
  objectId,
  preview = false,
}: TreeProps) {
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
      trunk: new THREE.MeshToonMaterial({
        color: COLOR_PALETTES.tree.trunk,
        gradientMap: gradientTexture,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
      leaves: new THREE.MeshToonMaterial({
        color: COLOR_PALETTES.tree.leaves,
        gradientMap: gradientTexture,
        transparent: preview,
        opacity: preview ? 0.6 : 1.0,
      }),
    };
  }, []);

  // Generate tree geometry based on type
  const geometries = useMemo(() => {
    switch (type) {
      case "pine":
        return {
          trunk: new THREE.CylinderGeometry(0.1, 0.15, 1, 8),
          leaves: new THREE.ConeGeometry(0.8, 2, 8),
        };
      case "oak":
        return {
          trunk: new THREE.CylinderGeometry(0.12, 0.18, 0.8, 8),
          leaves: new THREE.SphereGeometry(1, 12, 8),
        };
      case "birch":
        return {
          trunk: new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8),
          leaves: new THREE.SphereGeometry(0.7, 12, 8),
        };
      default:
        return {
          trunk: new THREE.CylinderGeometry(0.1, 0.15, 1, 8),
          leaves: new THREE.ConeGeometry(0.8, 2, 8),
        };
    }
  }, [type]);

  // Animation for selected state
  useFrame((state) => {
    if (groupRef.current && selected) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
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
      {/* Trunk */}
      <mesh
        position={[0, 0.4, 0]}
        geometry={geometries.trunk}
        material={materials.trunk}
        castShadow
        receiveShadow
      />

      {/* Leaves */}
      <mesh
        position={type === "pine" ? [0, 1.5, 0] : [0, 1.2, 0]}
        geometry={geometries.leaves}
        material={materials.leaves}
        castShadow
        receiveShadow
      />

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, -0.1, 0]}>
          <ringGeometry args={[0.8, 1.0, 16]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

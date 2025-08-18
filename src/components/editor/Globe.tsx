"use client";

import { useRef, useMemo, forwardRef } from "react";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { COLOR_PALETTES } from "~/lib/constants";

interface GlobeProps {
  onRotationChange?: (rotation: [number, number, number]) => void;
}

export const Globe = forwardRef<THREE.Mesh, GlobeProps>(
  ({ onRotationChange: _onRotationChange }, ref) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const { showWireframe } = useWorldStore();
    const typedShowWireframe = showWireframe as boolean;

    // Create globe geometry - a smooth sphere
    const geometry = useMemo(() => {
      // Create a perfect smooth sphere
      const geo = new THREE.SphereGeometry(6, 64, 64);
      return geo;
    }, []);

    // Create material that receives shadows from directional light
    const material = useMemo(() => {
      return new THREE.MeshStandardMaterial({
        color: COLOR_PALETTES.globe.primary,
        roughness: 0.8, // Slightly rough surface for realistic shadow reception
        metalness: 0.1, // Low metalness for natural appearance
        flatShading: false, // Smooth shading for the sphere
        wireframe: typedShowWireframe,
      });
    }, [typedShowWireframe]);

    return (
      <group ref={groupRef}>
        <mesh
          ref={ref ?? meshRef}
          geometry={geometry}
          material={material}
          receiveShadow
          castShadow
          position={[0, 0, 0]} // Center the globe
        />
      </group>
    );
  },
);

Globe.displayName = "Globe";

'use client';

import { useRef, useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import { COLOR_PALETTES } from '~/lib/constants';

interface GlobeProps {
  onRotationChange?: (rotation: [number, number, number]) => void;
}

export const Globe = forwardRef<THREE.Mesh, GlobeProps>(({ onRotationChange: _onRotationChange }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Create globe geometry - a smooth sphere
  const geometry = useMemo(() => {
    // Create a perfect smooth sphere
    const geo = new THREE.SphereGeometry(6, 64, 32);
    return geo;
  }, []);

  // Create cell-shaded material
  const material = useMemo(() => {
    // Create a simple 3-step gradient texture for toon shading
    const gradientTexture = new THREE.DataTexture(
      new Uint8Array([
        0, 0, 0, 255,        // Dark
        128, 128, 128, 255,  // Mid
        255, 255, 255, 255,  // Light
      ]),
      3, 1,
      THREE.RGBAFormat
    );
    gradientTexture.magFilter = THREE.NearestFilter;
    gradientTexture.minFilter = THREE.NearestFilter;
    gradientTexture.needsUpdate = true;

    return new THREE.MeshToonMaterial({
      color: COLOR_PALETTES.globe.primary,
      gradientMap: gradientTexture,
    });
  }, []);

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
});

Globe.displayName = 'Globe';
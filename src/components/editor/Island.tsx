'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { COLOR_PALETTES } from '~/lib/constants';

export function Island() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create island geometry - a flattened sphere for the floating island
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(6, 32, 16);
    
    // Flatten the bottom and add some noise for natural look
    const position = geo.attributes.position;
    if (position) {
      const positions = position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]!;
        const y = positions[i + 1]!;
        const z = positions[i + 2]!;
        
        // Flatten the bottom half
        if (y < 0) {
          positions[i + 1] = y * 0.3;
        }
        
        // Add some gentle noise to the surface
        const noise = (Math.sin(x * 0.5) + Math.cos(z * 0.5)) * 0.1;
        positions[i + 1] = (positions[i + 1] ?? 0) + noise;
      }
      
      position.needsUpdate = true;
    }
    geo.computeVertexNormals();
    
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
      color: COLOR_PALETTES.island.primary,
      gradientMap: gradientTexture,
    });
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      receiveShadow
      castShadow
      position={[0, -3, 0]}
    />
  );
}
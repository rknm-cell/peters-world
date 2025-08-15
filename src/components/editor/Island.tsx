'use client';

import { useRef, useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import { COLOR_PALETTES } from '~/lib/constants';

export const Island = forwardRef<THREE.Mesh>((props, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create island geometry - a flattened sphere with varied terrain
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(6, 64, 32); // Higher resolution for better surface normals
    
    // Create more interesting terrain
    const position = geo.attributes.position;
    if (position) {
      const positions = position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]!;
        const y = positions[i + 1]!;
        const z = positions[i + 2]!;
        
        // Distance from center for radial effects
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        const normalizedDistance = distanceFromCenter / 6; // Normalize to island radius
        
        // Flatten the bottom half
        if (y < 0) {
          positions[i + 1] = y * 0.2;
        } else {
          // Create rolling hills on the top surface
          const hillNoise = Math.sin(x * 0.8) * Math.cos(z * 0.8) * 0.3;
          const ridgeNoise = Math.sin(x * 1.2 + z * 0.5) * 0.2;
          const fineNoise = (Math.sin(x * 2) + Math.cos(z * 2)) * 0.1;
          
          // Blend different noise frequencies
          const totalNoise = hillNoise + ridgeNoise + fineNoise;
          
          // Reduce noise intensity towards the edges
          const edgeFalloff = Math.max(0, 1 - normalizedDistance * 1.2);
          const scaledNoise = totalNoise * edgeFalloff;
          
          positions[i + 1] = (positions[i + 1] ?? 0) + scaledNoise;
        }
      }
      
      position.needsUpdate = true;
    }
    
    // Recompute normals for proper surface attachment
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
      ref={ref ?? meshRef}
      geometry={geometry}
      material={material}
      receiveShadow
      castShadow
      position={[0, -3, 0]}
    />
  );
});

Island.displayName = 'Island';
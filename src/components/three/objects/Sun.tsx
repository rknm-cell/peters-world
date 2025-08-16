'use client';

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { LIGHTING_PRESETS } from '~/lib/constants';

interface SunProps {
  size?: number;
  glowIntensity?: number;
}

export function Sun({ 
  size = 1.0, 
  glowIntensity = 1.0
}: SunProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  
  const timeOfDay = useWorldStore((state) => state.timeOfDay);

  // Create sun materials
  const materials = useMemo(() => {
    return {
      sun: new THREE.MeshBasicMaterial({
        color: '#FFFFFF', // Bright white
        transparent: true,
        opacity: 0.95,
      }),
      glow: new THREE.MeshBasicMaterial({
        color: '#FFD700', // Golden yellow accent
        transparent: true,
        opacity: 0.4 * glowIntensity,
      }),
    };
  }, [glowIntensity]);

  // Create sun geometry
  const geometries = useMemo(() => {
    return {
      sun: new THREE.SphereGeometry(size, 16, 16),
      glow: new THREE.SphereGeometry(size * 2, 16, 16),
    };
  }, [size]);

  // Update sun position and lighting based on time of day
  useEffect(() => {
    const preset = LIGHTING_PRESETS[timeOfDay];
    
    if (groupRef.current) {
      // Position the sun far away for proper distant lighting
      const [x, y, z] = preset.directionalPosition;
      // Scale up the position to move sun much further away
      groupRef.current.position.set(x * 3, y * 3, z * 3);
    }

    if (directionalLightRef.current) {
      // Update the sun's directional light
      directionalLightRef.current.color.set(preset.directionalColor);
      directionalLightRef.current.intensity = preset.directionalIntensity;
      directionalLightRef.current.position.set(0, 0, 0); // Relative to the sun group
    }
  }, [timeOfDay]);

  // Remove animation - sun should be static
  // useFrame removed - no more bouncing or rotation

  return (
    <group ref={groupRef}>
      {/* Sun's own directional light */}
      <directionalLight
        ref={directionalLightRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0001}
      />

      {/* Outer glow */}
      <mesh
        ref={glowMeshRef}
        geometry={geometries.glow}
        material={materials.glow}
        scale={[1, 1, 1]}
      />
      
      {/* Main sun sphere */}
      <mesh
        ref={sunMeshRef}
        geometry={geometries.sun}
        material={materials.sun}
        scale={[1, 1, 1]}
      />

      {/* Sun rays effect */}
      <group>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI * 2) / 8) * (size * 1.8),
              Math.sin((i * Math.PI * 2) / 8) * (size * 1.8),
              0
            ]}
          >
            <boxGeometry args={[0.1, 0.1, 0.8]} />
            <meshBasicMaterial 
              color="#FFD700" 
              transparent 
              opacity={1} 
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

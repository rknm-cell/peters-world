'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
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
        fog: false, // Sun is unaffected by fog
      }),
      glow: new THREE.MeshBasicMaterial({
        color: '#FFD700', // Golden yellow accent
        transparent: true,
        opacity: 0.4 * glowIntensity,
        fog: false, // Glow is unaffected by fog
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

    if (directionalLightRef.current) {
      // Update the sun's directional light
      directionalLightRef.current.color.set(preset.directionalColor);
      directionalLightRef.current.intensity = preset.directionalIntensity;
      directionalLightRef.current.position.set(0, 0, 0); // Relative to the sun group
    }
  }, [timeOfDay]);

  // Add automatic rotation around the globe
  useFrame((state) => {
    if (groupRef.current) {
      // Rotate the sun around the globe at a constant speed
      const rotationSpeed = 0.15; // Adjust this value to control rotation speed (0.1 = slow, 0.3 = fast)
      const time = state.clock.elapsedTime;
      
      // Calculate the sun's position in a circular orbit
      const orbitRadius = 20; // Distance from the center of the globe
      const x = Math.cos(time * rotationSpeed) * orbitRadius;
      const z = Math.sin(time * rotationSpeed) * orbitRadius;
      const y = 10; // Keep the sun elevated
      
      groupRef.current.position.set(x, y, z);
      
      // Make the sun always face the center of the globe
      groupRef.current.lookAt(0, 0, 0);
    }
  });

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
        scale={[.7, .7, .7]}
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
              fog={false} // Sun rays are unaffected by fog
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

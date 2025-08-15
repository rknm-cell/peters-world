'use client';

import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { LIGHTING_PRESETS } from '~/lib/constants';
import { Island } from './Island';
import { CameraController } from './CameraController';
import { PlacementSystem } from './PlacementSystem';
import { WorldObjects } from './WorldObjects';

export function Scene() {
  const { scene, gl } = useThree();
  const timeOfDay = useWorldStore((state) => state.timeOfDay);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const islandRef = useRef<THREE.Mesh | null>(null);

  // Update lighting based on time of day
  useEffect(() => {
    const preset = LIGHTING_PRESETS[timeOfDay];
    
    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(preset.ambientColor);
      ambientLightRef.current.intensity = preset.ambientIntensity;
    }

    if (directionalLightRef.current) {
      directionalLightRef.current.color.set(preset.directionalColor);
      directionalLightRef.current.intensity = preset.directionalIntensity;
      const [x, y, z] = preset.directionalPosition;
      directionalLightRef.current.position.set(x, y, z);
    }

    // Update scene fog
    scene.fog = new THREE.Fog(
      preset.fogColor,
      preset.fogNear,
      preset.fogFar
    );

    // Update renderer clear color
    gl.setClearColor(preset.fogColor);
  }, [timeOfDay, scene, gl]);

  return (
    <>
      {/* Lighting */}
      <ambientLight ref={ambientLightRef} />
      <directionalLight
        ref={directionalLightRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Camera Controls */}
      <CameraController />

      {/* Placement System wraps all interactive objects */}
      <PlacementSystem islandRef={islandRef}>
        {/* Main island */}
        <Island ref={islandRef} />
        
        {/* All placed objects */}
        <WorldObjects />
      </PlacementSystem>

      {/* Environment */}
      <fog attach="fog" args={[LIGHTING_PRESETS[timeOfDay].fogColor, 20, 100]} />
    </>
  );
}
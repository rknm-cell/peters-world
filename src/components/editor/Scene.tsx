"use client";

import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { LIGHTING_PRESETS } from "~/lib/constants";
import { Globe } from "./Globe";
import { CameraController } from "./CameraController";
import { PlacementSystem } from "./PlacementSystem";
import { WorldObjects } from "./WorldObjects";
import { GlobeController } from "./GlobeController";
import { Sun } from '~/components/three/objects/Sun';

export function Scene() {
  const { scene, gl } = useThree();
  const timeOfDay = useWorldStore((state) => state.timeOfDay);
  const isPlacing = useWorldStore((state) => state.isPlacing);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const rotationGroupRef = useRef<THREE.Group | null>(null);

  // Update lighting based on time of day
  useEffect(() => {
    const preset = LIGHTING_PRESETS[timeOfDay];

    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(preset.ambientColor);
      ambientLightRef.current.intensity = preset.ambientIntensity;
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
      
      {/* Sun - provides directional lighting for the entire scene */}
      <Sun 
        size={3.0}
        glowIntensity={1.2}
      />

      {/* Camera Controls */}
      <CameraController />

      {/* Globe Controller for rotation - disabled when placing objects */}
      <GlobeController
        globeRef={globeRef}
        enabled={!isPlacing}
        onGroupRefReady={(groupRef) => {
          rotationGroupRef.current = groupRef.current;
        }}
      >
        {/* Placement System wraps all interactive objects */}
        <PlacementSystem
          globeRef={globeRef}
          rotationGroupRef={rotationGroupRef}
        >
          {/* Main globe */}
          <Globe ref={globeRef} />

          {/* All placed objects - these will rotate with the globe */}
          <WorldObjects />
        </PlacementSystem>
      </GlobeController>

      {/* Environment */}
      <fog
        attach="fog"
        args={[LIGHTING_PRESETS[timeOfDay].fogColor, 20, 100]}
      />
    </>
  );
}

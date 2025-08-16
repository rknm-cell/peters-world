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

export function Scene() {
  const { scene, gl } = useThree();
  const timeOfDay = useWorldStore((state) => state.timeOfDay);
  const isPlacing = useWorldStore((state) => state.isPlacing);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const rotationGroupRef = useRef<THREE.Group | null>(null);

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
    scene.fog = new THREE.Fog(preset.fogColor, preset.fogNear, preset.fogFar);

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
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
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

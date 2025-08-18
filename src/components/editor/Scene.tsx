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
import { SurfaceNormalDebug } from '~/components/three/effects/SurfaceNormalDebug';

export function Scene() {
  const { scene, gl } = useThree();
  const { timeOfDay, isPlacing, showDebugNormals, isTerraforming } = useWorldStore();
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const globeRef = useRef<THREE.Mesh>(null);
  const rotationGroupRef = useRef<THREE.Group>(null);

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

      {/* Globe Controller for rotation - disabled when placing objects or terraforming */}
      <GlobeController
        globeRef={globeRef}
        enabled={!isPlacing && !isTerraforming}
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

      {/* Debug surface normals - toggle with toolbar button */}
      {showDebugNormals && <SurfaceNormalDebug />}
    </>
  );
}

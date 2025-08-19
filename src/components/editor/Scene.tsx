"use client";

import { useRef, useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { LIGHTING_PRESETS } from "~/lib/constants";
import { Globe } from "./Globe";
import { CameraController } from "./CameraController";
import { PlacementSystem } from "./PlacementSystem";
import { WorldObjects } from "./WorldObjects";
import { InputManager } from "./InputManager";
import { Sun } from '~/components/three/objects/Sun';
import { SurfaceNormalDebug } from '~/components/three/effects/SurfaceNormalDebug';

export function Scene() {
  const { scene, gl } = useThree();
  const { timeOfDay, showDebugNormals } = useWorldStore();
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const globeRef = useRef<THREE.Mesh>(null);
  const rotationGroupRef = useRef<THREE.Group>(null);
  const [terrainMesh, setTerrainMesh] = useState<THREE.Mesh | null>(null);

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

      {/* Rotation group that contains all rotatable content */}
      <group ref={rotationGroupRef}>
        {/* Placement System wraps all interactive objects */}
        <PlacementSystem
          globeRef={globeRef}
          rotationGroupRef={rotationGroupRef}
        >
          {/* Main globe */}
          <Globe 
            ref={globeRef} 
            onTerrainMeshReady={setTerrainMesh}
          />

          {/* All placed objects - these will rotate with the globe */}
          <WorldObjects />
        </PlacementSystem>
      </group>
      
      {/* Unified Input Manager handles all interactions */}
      <InputManager
        globeRef={globeRef}
        terrainMesh={terrainMesh}
        rotationGroupRef={rotationGroupRef}
      />

      {/* Debug surface normals - toggle with toolbar button */}
      {showDebugNormals && <SurfaceNormalDebug />}
    </>
  );
}

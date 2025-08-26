"use client";

import { useRef, useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { useTimeOfDay } from "~/lib/store";
import { LIGHTING_PRESETS } from "~/lib/constants";
import { CameraController } from "./CameraController";
import { PlacementSystem } from "./PlacementSystem";
import { WorldObjects } from "./WorldObjects";
import { InputManager } from "./InputManager";
import { Sun } from '~/components/three/objects/Sun';
import { TreeLifecycleManager } from '~/components/three/systems/TreeLifecycleManager';
import { GrassSpawningManager } from '~/components/three/systems/GrassSpawningManager';
import { DeerSpawningManager } from '~/components/three/systems/DeerSpawningManager';
import { SelectionIndicator } from '~/components/three/effects/SelectionIndicator';

import { GlobePhysics } from '~/components/three/physics/GlobePhysics';
import { GravityController } from '~/components/three/physics/GravityController';
import { PhysicsStatusLogger } from '~/components/three/physics/PhysicsStatusLogger';


export function Scene() {
  const { scene, gl } = useThree();
  const timeOfDay = useTimeOfDay();
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
        size={1.0}
        glowIntensity={20}
      />

      {/* Camera Controls */}
      <CameraController />

      {/* Physics World - Contains all physics-enabled objects */}
      <Physics 
        gravity={[0, 0, 0]} // No global gravity - we use custom radial gravity
        interpolate={true} // Smooth visual interpolation
        updateLoop="independent" // Better performance
        timeStep={1/60} // 60 FPS physics updates
      >
        {/* Custom radial gravity system */}
        <GravityController />
        
        {/* Physics debug visualization */}
        {/* <PhysicsDebug /> */}
        
        {/* Physics status logging for debugging */}
        <PhysicsStatusLogger />
        
        {/* Collision mesh debug visualization (3D part) */}
        {/* <CollisionDebugVisualization /> */}
        
        {/* Deer pathfinding debug visualization */}
        {/* <DeerPathfindingDebug /> */}
        
        {/* Terrain analysis debug tools - moved to page layout */}
        
        {/* Rotation group that contains all rotatable content */}
        <group ref={rotationGroupRef}>
          {/* Physics-enabled globe with precise collision detection */}
          <GlobePhysics 
            ref={globeRef} 
            onTerrainMeshReady={setTerrainMesh}
          />

          {/* All placed objects - includes physics-based deer */}
          {/* MOVED OUTSIDE PlacementSystem to prevent re-render cascading */}
          <WorldObjects />
          
          {/* Placement System handles interactions but doesn't wrap objects */}
          <PlacementSystem
            globeRef={globeRef}
            rotationGroupRef={rotationGroupRef}
          />
        </group>
      </Physics>
      
      {/* Unified Input Manager handles all interactions */}
      <InputManager
        globeRef={globeRef}
        terrainMesh={terrainMesh}
        rotationGroupRef={rotationGroupRef}
      />

      {/* Debug surface normals - toggle with toolbar button */}
      {/* {showDebugNormals && <SurfaceNormalDebug />} */}
      
      {/* Debug placement orientation - shows arrows indicating object orientation */}
      {/* {showPlacementOrientationDebug && (
        <PlacementOrientationDebug 
          globeRadius={6}
          normalLength={0.3}
          density={20}
          color="#00ff00"
          showMathNormalComparison={placementDebugShowComparison}
        />
      )} */}
      
      {/* Tree lifecycle manager - handles automatic tree aging */}
      <TreeLifecycleManager />
      
      {/* Grass spawning manager - handles automatic grass spawning on green terrain */}
      <GrassSpawningManager />
      
      {/* Deer spawning manager - handles automatic deer spawning and despawning */}
      <DeerSpawningManager />
      
      {/* Selection indicator for physics objects - doesn't cause physics re-renders */}
      <SelectionIndicator />
      
      {/* Debug components for animal orientation testing */}
      {/* <AnimalOrientationTest /> */}
      {/* <IdleOrientationTest /> */}
      
      {/* Debug component for terrain collision testing */}
      {/* <TerrainCollisionTest /> */}
    </>
  );
}

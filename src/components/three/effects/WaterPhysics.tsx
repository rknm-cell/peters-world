"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";

interface WaterPhysicsProps {
  terrainVertices: Array<{
    x: number;
    y: number;
    z: number;
    height: number;
    waterLevel: number;
  }>;
  radius: number;
  resolution?: number;
  lowPerformanceMode?: boolean;
  updateFrequency?: number;
}

/**
 * Water physics system for terraforming
 * Simulates water flow, pooling, and interaction with terrain
 */
export function WaterPhysics({
  terrainVertices,
  radius,
  resolution = 32, // Reduced default resolution for performance
  lowPerformanceMode = false,
  updateFrequency = 30, // FPS for physics updates
}: WaterPhysicsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const waterDataRef = useRef<Float32Array>(
    new Float32Array(resolution * resolution),
  );
  const velocityDataRef = useRef<Float32Array>(
    new Float32Array(resolution * resolution * 2),
  );
  const previousWaterDataRef = useRef<Float32Array>(
    new Float32Array(resolution * resolution),
  );

  // Water simulation parameters (optimized for performance)
  const dampening = lowPerformanceMode ? 0.9 : 0.95; // More aggressive dampening in low perf mode
  const spreadRate = lowPerformanceMode ? 0.6 : 0.8; // Slower spread reduces calculations
  const evaporationRate = 0.995; // Water evaporation over time
  const gravity = 0.02; // Downward water flow force

  // Performance tracking
  const lastPhysicsUpdateRef = useRef(0);
  const lastGeometryUpdateRef = useRef(0);
  const frameCountRef = useRef(0);

  const { updateTerrainVertex } = useWorldStore();

  // Initialize water data arrays
  useEffect(() => {
    const size = resolution * resolution;
    waterDataRef.current = new Float32Array(size);
    velocityDataRef.current = new Float32Array(size * 2); // x, z velocity components
    previousWaterDataRef.current = new Float32Array(size);

    // Initialize based on current terrain water levels
    for (let i = 0; i < terrainVertices.length && i < size; i++) {
      const vertex = terrainVertices[i];
      if (vertex && waterDataRef.current && previousWaterDataRef.current) {
        waterDataRef.current[i] = vertex.waterLevel;
        previousWaterDataRef.current[i] = vertex.waterLevel;
      }
    }
  }, [terrainVertices, resolution]);

  // Create water geometry based on sphere mapping
  const waterGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      1,
      1,
      resolution - 1,
      resolution - 1,
    );
    const positionAttribute = geometry.attributes.position;
    const uvAttribute = geometry.attributes.uv;

    if (!positionAttribute || !uvAttribute) {
      return null;
    }

    const positions = positionAttribute.array as Float32Array;
    const uvs = uvAttribute.array as Float32Array;

    // Map plane coordinates to sphere surface
    for (let i = 0; i < positions.length; i += 3) {
      const uvIndex = (i / 3) * 2;
      const u = uvs[uvIndex];
      const v = uvs[uvIndex + 1];

      if (u === undefined || v === undefined) continue;

      // Convert UV to spherical coordinates
      const phi = (u - 0.5) * Math.PI * 2; // longitude: -π to π
      const theta = (v - 0.5) * Math.PI; // latitude: -π/2 to π/2

      // Convert to Cartesian coordinates on sphere (99% size to prevent z-fighting)
      const waterRadius = radius * 0.99;
      const x = waterRadius * Math.cos(theta) * Math.cos(phi);
      const y = waterRadius * Math.sin(theta);
      const z = waterRadius * Math.cos(theta) * Math.sin(phi);

      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
  }, [radius, resolution]);

  // Optimized water material (less GPU intensive)
  const waterMaterial = useMemo(() => {
    if (lowPerformanceMode) {
      // Simple material for low-end devices
      return new THREE.MeshLambertMaterial({
        color: 0x006994,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
    } else {
      // Standard material with some optimizations
      return new THREE.MeshStandardMaterial({
        color: 0x006994,
        transparent: true,
        opacity: 0.8,
        roughness: 0.2,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    }
  }, [lowPerformanceMode]);

  // Optimized water physics simulation
  const simulateWaterPhysics = () => {
    if (
      !waterDataRef.current ||
      !velocityDataRef.current ||
      !previousWaterDataRef.current
    ) {
      return;
    }

    const waterData = waterDataRef.current;
    const velocityData = velocityDataRef.current;
    const previousData = previousWaterDataRef.current;

    // Early exit if no significant water to simulate
    const hasActiveWater = waterData.some((level) => level > 0.01);
    if (!hasActiveWater) {
      return;
    }

    // Copy current water levels to previous
    for (let i = 0; i < waterData.length; i++) {
      previousData[i] = waterData[i] ?? 0;
    }

    // Simulate water flow and physics (with performance optimizations)
    const step = lowPerformanceMode ? 2 : 1; // Skip vertices in low performance mode

    for (let y = step; y < resolution - step; y += step) {
      for (let x = step; x < resolution - step; x += step) {
        const index = y * resolution + x;
        const terrainIndex = Math.min(index, terrainVertices.length - 1);

        if (terrainIndex >= terrainVertices.length) continue;

        const currentVertex = terrainVertices[terrainIndex];
        if (!currentVertex) continue;

        // Skip simulation for vertices with very little water
        const currentWater = previousData[index] ?? 0;
        if (currentWater < 0.005) continue;

        // Get neighboring water levels
        const neighbors = [
          previousData[index - 1] ?? 0, // west
          previousData[index + 1] ?? 0, // east
          previousData[index - resolution] ?? 0, // north
          previousData[index + resolution] ?? 0, // south
        ];

        // Get neighboring terrain heights
        const neighborHeights = [
          terrainVertices[
            Math.min(terrainIndex - 1, terrainVertices.length - 1)
          ]?.height ?? 0,
          terrainVertices[
            Math.min(terrainIndex + 1, terrainVertices.length - 1)
          ]?.height ?? 0,
          terrainVertices[
            Math.min(terrainIndex - resolution, terrainVertices.length - 1)
          ]?.height ?? 0,
          terrainVertices[
            Math.min(terrainIndex + resolution, terrainVertices.length - 1)
          ]?.height ?? 0,
        ];

        const currentHeight = currentVertex.height;

        // Simplified flow calculation for better performance
        let totalFlow = 0;
        const flowRate = spreadRate * 0.5; // Reduce flow rate for stability

        for (let i = 0; i < 4; i++) {
          const neighborWater = neighbors[i];
          const neighborHeight = neighborHeights[i] ?? currentHeight;

          // Simplified surface calculation
          const heightDiff =
            currentHeight +
            currentWater -
            (neighborHeight + (neighborWater ?? 0));

          if (heightDiff > 0.1) {
            // Only flow if significant height difference
            const flow = Math.min(heightDiff * flowRate, currentWater * 0.2);
            totalFlow += flow;
          }
        }

        // Update water level
        let newWaterLevel = currentWater - totalFlow;

        // Add incoming water from neighbors
        for (let i = 0; i < 4; i++) {
          const neighborIndex =
            i === 0
              ? index - 1
              : i === 1
                ? index + 1
                : i === 2
                  ? index - resolution
                  : index + resolution;

          if (neighborIndex >= 0 && neighborIndex < waterData.length) {
            const neighborWater = previousData[neighborIndex] ?? 0;
            const neighborHeight = neighborHeights[i] ?? 0;
            const neighborSurface = neighborHeight + neighborWater;
            const currentSurface = currentHeight + currentWater;

            if (neighborSurface > currentSurface) {
              const incomingFlow = Math.min(
                (neighborSurface - currentSurface) * spreadRate,
                neighborWater * 0.25,
              );
              newWaterLevel += incomingFlow * 0.25; // Divide by 4 neighbors
            }
          }
        }

        // Apply gravity effect (water seeks lowest points)
        const gravityEffect = -gravity * (currentHeight - radius);
        newWaterLevel += gravityEffect * 0.1;

        // Apply dampening and evaporation
        newWaterLevel *= dampening * evaporationRate;

        // Ensure water level doesn't go negative
        newWaterLevel = Math.max(0, newWaterLevel);

        // Update water data
        waterData[index] = newWaterLevel;

        // Simplified velocity calculation (remove complex flow tracking for performance)
        const velocityIndex = index * 2;
        velocityData[velocityIndex] = totalFlow * 0.1; // simplified x velocity
        velocityData[velocityIndex + 1] = totalFlow * 0.1; // simplified z velocity
      }
    }
  };

  // Update terrain vertices with new water levels
  const updateTerrainWaterLevels = () => {
    if (!waterDataRef.current) return;

    const waterData = waterDataRef.current;

    for (
      let i = 0;
      i < Math.min(waterData.length, terrainVertices.length);
      i++
    ) {
      const waterLevel = waterData[i];
      const vertex = terrainVertices[i];

      if (
        vertex &&
        waterLevel !== undefined &&
        Math.abs(vertex.waterLevel - waterLevel) > 0.01
      ) {
        // Update the terrain vertex water level
        updateTerrainVertex(i, {
          waterLevel: waterLevel,
        });
      }
    }
  };

  // Update water surface geometry based on water levels
  const updateWaterSurface = () => {
    if (!meshRef.current || !waterDataRef.current) return;

    const geometry = meshRef.current.geometry;
    const positionAttribute = geometry.attributes.position;
    if (!positionAttribute) return;

    const positions = positionAttribute.array as Float32Array;
    const waterData = waterDataRef.current;

    // Update vertex positions based on water levels
    for (let i = 0; i < positions.length; i += 3) {
      const vertexIndex = Math.floor(i / 3);
      const waterLevel = waterData[vertexIndex] ?? 0;

      if (waterLevel > 0.01) {
        // Get the original sphere position
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        if (x !== undefined && y !== undefined && z !== undefined) {
          // Calculate surface normal (outward from center)
          const length = Math.sqrt(x * x + y * y + z * z);
          const normalX = x / length;
          const normalY = y / length;
          const normalZ = z / length;

          // Offset by water level along surface normal (maintaining 99% base size)
          const waterRadius = radius * 0.99;
          const offset = waterLevel * 0.1;
          positions[i] = normalX * (waterRadius + offset);
          positions[i + 1] = normalY * (waterRadius + offset);
          positions[i + 2] = normalZ * (waterRadius + offset);
        }
      }
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  // Optimized frame update with adaptive frequency
  useFrame((state, _delta) => {
    const currentTime = state.clock.elapsedTime * 1000; // Convert to ms
    frameCountRef.current++;

    // Adaptive update frequency based on performance mode
    const physicsInterval = 1000 / updateFrequency; // Target FPS converted to interval
    const geometryInterval = lowPerformanceMode ? 200 : 100; // 5fps or 10fps for geometry

    // Physics simulation
    if (currentTime - lastPhysicsUpdateRef.current >= physicsInterval) {
      simulateWaterPhysics();
      lastPhysicsUpdateRef.current = currentTime;
    }

    // Geometry updates (less frequent)
    if (currentTime - lastGeometryUpdateRef.current >= geometryInterval) {
      updateWaterSurface();
      lastGeometryUpdateRef.current = currentTime;
    }

    // Terrain updates (least frequent)
    if (frameCountRef.current % 120 === 0) {
      // Every 120 frames (~2fps at 60fps)
      updateTerrainWaterLevels();
    }
  });

  // Only render if there's significant water
  const hasSignificantWater = useMemo(() => {
    if (!terrainVertices || terrainVertices.length === 0) {
      return false;
    }

    const waterVertices = terrainVertices.filter((v) => v.waterLevel > 0.001);
    const maxWaterLevel = Math.max(
      0,
      ...terrainVertices.map((v) => v.waterLevel),
    );
    return waterVertices.length > 0;
  }, [terrainVertices]);

  if (!hasSignificantWater || !waterGeometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={waterGeometry}
      material={waterMaterial}
      renderOrder={10} // Render after terrain
    />
  );
}

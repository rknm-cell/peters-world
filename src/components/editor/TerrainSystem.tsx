"use client";

import { useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { WaterSurface } from '../three/effects/WaterSurface';

interface TerrainSystemProps {
  onTerrainUpdate?: (geometry: THREE.BufferGeometry) => void;
  onTerrainMeshReady?: (mesh: THREE.Mesh) => void;
}

export function TerrainSystem({ onTerrainUpdate, onTerrainMeshReady }: TerrainSystemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const {
    terrainVertices,
    setTerrainVertices,
    updateTerrainOctree,
  } = useWorldStore();

  // Create high-resolution sphere geometry for terrain deformation
  const baseGeometry = useMemo(() => {
    // Much higher resolution for smooth terrain deformation
    return new THREE.SphereGeometry(6, 128, 128);
  }, []);

  // Initialize terrain vertices from geometry
  useEffect(() => {
    if (baseGeometry && Array.isArray(terrainVertices) && terrainVertices.length === 0) {
      const positions = baseGeometry.attributes.position;
      if (!positions) return;
      
      const newVertices: Array<{
        x: number;
        y: number;
        z: number;
        height: number;
        waterLevel: number;
      }> = [];

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        newVertices.push({
          x,
          y,
          z,
          height: 0, // No initial deformation
          waterLevel: 0, // No initial water
        });
      }

      setTerrainVertices(newVertices);
      // Update the octree after setting vertices
      setTimeout(() => updateTerrainOctree(), 0);
    }
  }, [baseGeometry, setTerrainVertices, terrainVertices, updateTerrainOctree]);

  // Apply terrain deformation to geometry
  const applyTerrainDeformation = useCallback(() => {
    if (!meshRef.current || !Array.isArray(terrainVertices) || terrainVertices.length === 0) return;

    const geometry = meshRef.current.geometry;
    const positions = geometry.attributes.position;
    if (!positions) return;

    // Apply height and water modifications to each vertex
    for (let i = 0; i < positions.count; i++) {
      const vertex = terrainVertices[i];
      if (!vertex) continue;

      // Calculate the original direction from center
      const originalX = positions.getX(i);
      const originalY = positions.getY(i);
      const originalZ = positions.getZ(i);

      // Normalize to get direction
      const length = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
      const dirX = originalX / length;
      const dirY = originalY / length;
      const dirZ = originalZ / length;

      // Apply height deformation along the normal direction
      // For proper sphere deformation, we apply height along the surface normal
      const heightOffset = vertex.height;

      // Water no longer affects terrain deformation - it's painted on top
      // const waterOffset = -vertex.waterLevel * 0.4; // Removed water depressions

      // Calculate new position with improved scaling
      // Use a more dramatic scaling for better mountain/valley visibility
      const newLength = 6 + heightOffset * 0.8; // Scale factor for dramatic terrain
      const newX = dirX * newLength;
      const newY = dirY * newLength;
      const newZ = dirZ * newLength;

      positions.setXYZ(i, newX, newY, newZ);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    // Notify parent component of terrain update
    onTerrainUpdate?.(geometry);
  }, [onTerrainUpdate, terrainVertices]);

  // Apply terrain deformation whenever vertices change
  useEffect(() => {
    applyTerrainDeformation();
  }, [applyTerrainDeformation]);

  // Notify parent when terrain mesh is ready for terraforming
  useEffect(() => {
    if (meshRef.current && onTerrainMeshReady) {
      onTerrainMeshReady(meshRef.current);
    }
  }, [onTerrainMeshReady]);

  // Create material with water visualization
  const material = useMemo(() => {
    // Base terrain material
    return new THREE.MeshStandardMaterial({
      color: 0x4a7c59, // Earthy green
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false,
      depthWrite: true,  // Ensure terrain writes to depth buffer
      depthTest: true,   // Ensure terrain tests depth
    });
  }, []);

  // Water creates depressions in the terrain - no separate water mesh needed
  // The water effect is achieved by the waterOffset in applyTerrainDeformation

  // Debug: Check if we have water
  const hasWater = terrainVertices.some(v => v.waterLevel > 0.01); // Match WaterSurface threshold
  const waterCount = terrainVertices.filter(v => v.waterLevel > 0.01).length;
  
  if (hasWater) {
    console.log(`TerrainSystem: Found ${waterCount} vertices with water, max water level: ${Math.max(...terrainVertices.map(v => v.waterLevel))}`);
    console.log(`TerrainSystem: Water levels:`, terrainVertices.filter(v => v.waterLevel > 0.01).map(v => v.waterLevel).slice(0, 10));
  }

  return (
    <>
      {/* Main terrain mesh */}
      <mesh
        ref={meshRef}
        geometry={baseGeometry}
        material={material}
        receiveShadow
        castShadow
        renderOrder={0} // Ensure terrain renders first
      />

      {/* Animated water surface using shaders */}
      {hasWater && (
        <WaterSurface terrainVertices={terrainVertices} radius={6} />
      )}
    </>
  );
}

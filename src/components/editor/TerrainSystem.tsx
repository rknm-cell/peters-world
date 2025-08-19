"use client";

import { useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';

interface TerrainSystemProps {
  onTerrainUpdate?: (geometry: THREE.BufferGeometry) => void;
  onTerrainMeshReady?: (mesh: THREE.Mesh) => void;
}

export function TerrainSystem({ onTerrainUpdate, onTerrainMeshReady }: TerrainSystemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const {
    terrainVertices,
    setTerrainVertices,
  } = useWorldStore();

  // Create high-resolution sphere geometry for terrain deformation
  const baseGeometry = useMemo(() => {
    // Much higher resolution for smooth terrain deformation
    return new THREE.SphereGeometry(6, 128, 128);
  }, []);

  // Initialize terrain vertices from geometry
  useEffect(() => {
    if (baseGeometry && terrainVertices.length === 0) {
      const positions = baseGeometry.attributes.position;
      if (!positions) return;
      
      const vertices: Array<{
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

        vertices.push({
          x,
          y,
          z,
          height: 0, // No initial deformation
          waterLevel: 0, // No initial water
        });
      }

      setTerrainVertices(vertices);
    }
  }, [baseGeometry, setTerrainVertices, terrainVertices.length]);

  // Apply terrain deformation to geometry
  const applyTerrainDeformation = useCallback(() => {
    if (!meshRef.current || terrainVertices.length === 0) return;

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

      // Apply water level (water creates depressions)
      const waterOffset = -vertex.waterLevel * 0.4; // Slightly deeper water depressions

      // Calculate new position with improved scaling
      // Use a more dramatic scaling for better mountain/valley visibility
      const totalOffset = heightOffset + waterOffset;
      const newLength = 6 + totalOffset * 0.8; // Scale factor for dramatic terrain
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
    return new THREE.MeshStandardMaterial({
      color: 0x4a7c59, // Earthy green
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false,
    });
  }, []);

  // Add water material overlay
  const waterMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x006994, // Ocean blue
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.3,
    });
  }, []);

  return (
    <>
      {/* Main terrain mesh */}
      <mesh
        ref={meshRef}
        geometry={baseGeometry}
        material={material}
        receiveShadow
        castShadow
      />

      {/* Water overlay mesh (will be positioned based on water levels) */}
      {terrainVertices.some(v => v.waterLevel > 0) && (
        <mesh
          geometry={baseGeometry}
          material={waterMaterial}
          receiveShadow
          castShadow
        />
      )}
    </>
  );
}

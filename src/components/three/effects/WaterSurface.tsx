"use client";

import { useMemo } from 'react';
import * as THREE from 'three';
import { WaterMaterial } from '../materials/WaterMaterial';

interface WaterSurfaceProps {
  terrainVertices: Array<{ 
    x: number; 
    y: number; 
    z: number; 
    waterLevel: number; 
    height: number; 
  }>;
  radius?: number;
}

export function WaterSurface({ terrainVertices, radius = 6 }: WaterSurfaceProps) {
  // Create water surface geometry based on terrain with water
  const waterGeometry = useMemo(() => {
    const hasWater = terrainVertices.some(v => v.waterLevel > 0.01);
    if (!hasWater) return null;

    // Create a sphere geometry at water level (slightly below terrain surface)
    const geometry = new THREE.SphereGeometry(radius - 0.05, 32, 32); // Lower resolution for mobile performance
    const positions = geometry.attributes.position;
    if (!positions) return null;
    
    // Create alpha channel for selective water rendering
    const alphas = new Float32Array(positions.count);
    
    // Only show water where it actually exists
    for (let i = 0; i < positions.count && i < terrainVertices.length; i++) {
      const vertex = terrainVertices[i];
      const waterLevel = vertex ? vertex.waterLevel : 0;
      
      // Set alpha based on water level (0 = invisible, 1 = fully visible)
      alphas[i] = Math.min(waterLevel * 2, 1.0); // Multiply by 2 for more responsive visibility
    }
    
    // Add alpha attribute to geometry
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    return geometry;
  }, [terrainVertices, radius]);

  // Don't render if no water
  if (!waterGeometry) return null;

  return (
    <mesh
      geometry={waterGeometry}
      position={[0, 0, 0]}
      receiveShadow
      castShadow
    >
      <WaterMaterial waterVertices={terrainVertices} />
    </mesh>
  );
}
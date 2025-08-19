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

    // Create a sphere geometry at water level (slightly ABOVE terrain surface)
    // Use higher resolution for better water detail
    // Position water surface above the maximum terrain deformation
    const geometry = new THREE.SphereGeometry(radius - 0.05, 64, 64); // don't change
    const positions = geometry.attributes.position;
    if (!positions) return null;
    
    // Create alpha channel for selective water rendering
    const alphas = new Float32Array(positions.count);
    
    // Map water levels from high-res terrain to lower-res water surface
    for (let i = 0; i < positions.count; i++) {
      // Get the position of this water vertex
      const waterX = positions.getX(i);
      const waterY = positions.getY(i);
      const waterZ = positions.getZ(i);
      
      // Find the closest terrain vertices and interpolate water level
      let totalWaterLevel = 0;
      let totalWeight = 0;
      
      // Sample nearby terrain vertices for water level (optimized sampling)
      // Only sample vertices within a reasonable radius to avoid O(n²) complexity
      const sampleRadius = 1.0; // Increased from 0.5 for better coverage
      let sampleCount = 0;
      
      for (const terrainVertex of terrainVertices) {
        if (!terrainVertex) continue;
        
        const distance = Math.sqrt(
          Math.pow(waterX - terrainVertex.x, 2) + 
          Math.pow(waterY - terrainVertex.y, 2) + 
          Math.pow(waterZ - terrainVertex.z, 2)
        );
        
        // Use inverse distance weighting for smooth interpolation
        if (distance < sampleRadius) { // Sample radius
          const weight = 1.0 / (distance + 0.01); // Avoid division by zero
          totalWaterLevel += terrainVertex.waterLevel * weight;
          totalWeight += weight;
          sampleCount++;
          
          // Limit samples to prevent excessive computation
          if (sampleCount > 50) break;
        }
      }
      
      // Calculate interpolated water level
      const interpolatedWaterLevel = totalWeight > 0 ? totalWaterLevel / totalWeight : 0;
      
      // Set alpha based on water level (0 = invisible, 1 = fully visible)
      alphas[i] = Math.min(interpolatedWaterLevel * 2, 1.0); // Multiply by 2 for more responsive visibility
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
      renderOrder={10} // Ensure water renders last with highest priority
    >
      <WaterMaterial waterVertices={terrainVertices} />
    </mesh>
  );
}
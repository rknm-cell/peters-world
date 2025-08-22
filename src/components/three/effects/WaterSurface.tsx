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
  // Create water geometry that follows terrain deformation
  const waterGeometry = useMemo(() => {
    const waterVertices = terrainVertices.filter(v => v.waterLevel > 0.001);
    if (waterVertices.length === 0) return null;

    // Create sphere geometry matching the terrain resolution
    const geometry = new THREE.SphereGeometry(radius, 128, 128);
    const positions = geometry.attributes.position;
    if (!positions) return null;
    
    const waterLevels = new Float32Array(positions.count);

    // Apply water levels to geometry vertices
    for (let i = 0; i < positions.count && i < terrainVertices.length; i++) {
      const vertex = terrainVertices[i];
      if (!vertex) continue;

      // Set water level as an attribute for the shader
      // Extend water slightly to nearby vertices to prevent gaps
      let effectiveWaterLevel = vertex.waterLevel;
      if (vertex.waterLevel <= 0.01) {
        // Check if this vertex should have water due to nearby water vertices
        // This helps cover edge gaps
        effectiveWaterLevel = 0;
      }
      
      waterLevels[i] = effectiveWaterLevel;

      // Apply terrain deformation to water surface
      const originalX = positions.getX(i);
      const originalY = positions.getY(i);  
      const originalZ = positions.getZ(i);

      const length = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
      const dirX = originalX / length;
      const dirY = originalY / length;
      const dirZ = originalZ / length;

      // Follow terrain height deformation only (no water depressions)
      const heightOffset = vertex.height;
      
      // Water sits on top of terrain with a small offset
      const waterSurfaceOffset = vertex.waterLevel > 0.01 ? 0.03 : 0; // Visible water surface layer
      const newLength = radius + heightOffset * 0.8 + waterSurfaceOffset;

      positions.setXYZ(i, dirX * newLength, dirY * newLength, dirZ * newLength);
    }

    // Add water levels as a vertex attribute
    geometry.setAttribute('waterLevel', new THREE.BufferAttribute(waterLevels, 1));
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
  }, [terrainVertices, radius]);

  // Don't render if no water
  if (!waterGeometry) return null;

  // Debug info
  const waterCount = terrainVertices.filter(v => v.waterLevel > 0.001).length;
  const maxWaterLevel = Math.max(...terrainVertices.map(v => v.waterLevel));
  console.log(`WaterSurface: Rendering with ${waterCount} water vertices, max level: ${maxWaterLevel.toFixed(3)}`);

  return (
    <mesh
      geometry={waterGeometry}
      position={[0, 0, 0]}
      receiveShadow={true}
      castShadow={false}
      renderOrder={1} // Render after terrain but not too high
    >
      {/* Advanced water shader material */}
      <WaterMaterial waterVertices={terrainVertices} />
    </mesh>
  );
}
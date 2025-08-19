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
    const waterVertices = terrainVertices.filter(v => v.waterLevel > 0.01);
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
      waterLevels[i] = vertex.waterLevel;

      // Apply terrain deformation to water surface
      const originalX = positions.getX(i);
      const originalY = positions.getY(i);  
      const originalZ = positions.getZ(i);

      const length = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
      const dirX = originalX / length;
      const dirY = originalY / length;
      const dirZ = originalZ / length;

      // Water follows terrain but slightly raised
      const heightOffset = vertex.height;
      const waterOffset = vertex.waterLevel > 0.01 ? 0.05 : 0; // Slight raise where there's water
      const newLength = radius + heightOffset * 0.8 + waterOffset;

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
  const waterCount = terrainVertices.filter(v => v.waterLevel > 0.01).length;
  const maxWaterLevel = Math.max(...terrainVertices.map(v => v.waterLevel));
  console.log(`WaterSurface: Rendering with ${waterCount} water vertices, max level: ${maxWaterLevel.toFixed(3)}`);

  return (
    <mesh
      geometry={waterGeometry}
      position={[0, 0, 0]}
      receiveShadow={false}
      castShadow={false}
      renderOrder={1} // Render after terrain but not too high
    >
      {/* Advanced water shader material */}
      <WaterMaterial waterVertices={terrainVertices} />
    </mesh>
  );
}
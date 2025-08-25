"use client";

import { useEffect } from 'react';
import { useWorldStore } from '~/lib/store';

/**
 * Debug component to test terrain collision updates
 */
export function TerrainCollisionTest() {
  const { terrainVertices } = useWorldStore();

  useEffect(() => {
    if (terrainVertices && terrainVertices.length > 0) {
      // Count vertices with deformation
      const deformedVertices = terrainVertices.filter(v => 
        Math.abs(v.height) > 0.01 || v.waterLevel > 0.01
      );
      
      if (deformedVertices.length > 0) {
        console.log('🔍 Terrain Collision Test:', {
          totalVertices: terrainVertices.length,
          deformedVertices: deformedVertices.length,
          maxHeight: Math.max(...terrainVertices.map(v => v.height)),
          minHeight: Math.min(...terrainVertices.map(v => v.height)),
          maxWater: Math.max(...terrainVertices.map(v => v.waterLevel)),
        });
      }
    }
  }, [terrainVertices]);

  return null;
}

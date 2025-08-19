"use client";

import * as THREE from "three";
import { useWorldStore } from "../../lib/store";

export function PerformanceDebug() {
  const { terrainVertices, terrainOctree } = useWorldStore();
  
  if (!terrainOctree) return null;
  
  const stats = terrainOctree.getStats();
  const totalVertices = terrainVertices.length;
  const affectedVertices = terrainOctree.getVerticesInRadius(
    new THREE.Vector3(0, 0, 0), 
    1.0
  ).length;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono">
      <div className="font-bold mb-2">Performance Debug</div>
      <div>Total Vertices: {totalVertices.toLocaleString()}</div>
      <div>Octree Cells: {stats.totalCells}</div>
      <div>Avg/Cell: {stats.avgVerticesPerCell.toFixed(1)}</div>
      <div>Cell Size: {stats.cellSize}</div>
      <div className="mt-2 text-green-400">
        Spatial Partitioning: Active
      </div>
      <div className="text-yellow-400">
        Sample Radius 1.0: {affectedVertices} vertices
      </div>
    </div>
  );
}

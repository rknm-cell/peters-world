import * as THREE from 'three';

export interface TerrainVertex {
  x: number;
  y: number;
  z: number;
  height: number;
  waterLevel: number;
}

export class TerrainOctree {
  private nodes = new Map<string, number[]>();
  private cellSize = 0.5; // Smaller cells for more precise partitioning
  private bounds: THREE.Box3;
  
  constructor(radius = 6) {
    // Create bounding box for the sphere
    this.bounds = new THREE.Box3(
      new THREE.Vector3(-radius, -radius, -radius),
      new THREE.Vector3(radius, radius, radius)
    );
  }
  
  // Partition vertices into 3D grid cells
  partitionVertices(vertices: TerrainVertex[]) {
    this.nodes.clear();
    
    vertices.forEach((vertex, index) => {
      const cellKey = this.getCellKey(vertex.x, vertex.y, vertex.z);
      if (!this.nodes.has(cellKey)) {
        this.nodes.set(cellKey, []);
      }
      this.nodes.get(cellKey)!.push(index);
    });
    
    console.log(`TerrainOctree: Partitioned ${vertices.length} vertices into ${this.nodes.size} cells`);
  }
  
  // Get cell key for a 3D position
  private getCellKey(x: number, y: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellY},${cellZ}`;
  }
  
  // Get all cell keys that could be affected by a brush at given position and radius
  private getAffectedCells(center: THREE.Vector3, radius: number): Set<string> {
    const affectedCells = new Set<string>();
    
    // Calculate the range of cells that could be affected
    const minX = Math.floor((center.x - radius) / this.cellSize);
    const maxX = Math.floor((center.x + radius) / this.cellSize);
    const minY = Math.floor((center.y - radius) / this.cellSize);
    const maxY = Math.floor((center.y + radius) / this.cellSize);
    const minZ = Math.floor((center.z - radius) / this.cellSize);
    const maxZ = Math.floor((center.z + radius) / this.cellSize);
    
    // Add all potentially affected cells
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          affectedCells.add(`${x},${y},${z}`);
        }
      }
    }
    
    return affectedCells;
  }
  
  // Get vertex indices that are within the brush radius
  getVerticesInRadius(center: THREE.Vector3, radius: number): number[] {
    const affectedCells = this.getAffectedCells(center, radius);
    const vertexIndices: number[] = [];
    
    affectedCells.forEach(cellKey => {
      const cellVertices = this.nodes.get(cellKey);
      if (cellVertices) {
        vertexIndices.push(...cellVertices);
      }
    });
    
    return vertexIndices;
  }
  
  // Get vertices within radius with their actual distances (for precise falloff)
  getVerticesWithDistance(center: THREE.Vector3, radius: number): Array<{index: number, distance: number}> {
    const affectedCells = this.getAffectedCells(center, radius);
    const verticesWithDistance: Array<{index: number, distance: number}> = [];
    
    affectedCells.forEach(cellKey => {
      const cellVertices = this.nodes.get(cellKey);
      if (cellVertices) {
        cellVertices.forEach(vertexIndex => {
          // We'll need the actual vertex data to calculate precise distance
          // This will be handled by the caller
          verticesWithDistance.push({ index: vertexIndex, distance: 0 });
        });
      }
    });
    
    return verticesWithDistance;
  }
  
  // Clear the octree
  clear() {
    this.nodes.clear();
  }
  
  // Get statistics about the octree
  getStats() {
    const totalVertices = Array.from(this.nodes.values()).reduce((sum, vertices) => sum + vertices.length, 0);
    const avgVerticesPerCell = totalVertices / this.nodes.size;
    
    return {
      totalCells: this.nodes.size,
      totalVertices,
      avgVerticesPerCell,
      cellSize: this.cellSize
    };
  }
}

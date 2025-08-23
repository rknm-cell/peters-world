import * as THREE from 'three';
import { useWorldStore, type TerrainVertex } from '~/lib/store';
import { type TerrainOctree } from '~/lib/utils/spatial-partitioning';

export interface TerrainCollisionResult {
  canMove: boolean;
  groundHeight: number;
  slopeAngle: number;
  isWater: boolean;
  adjustedPosition?: THREE.Vector3;
}

/**
 * Terrain collision detection utility for animals
 * Prevents animals from crossing steep mountains or deep valleys
 */
export class TerrainCollisionDetector {
  private static instance: TerrainCollisionDetector | null = null;
  
  // Movement constraints
  private readonly MAX_SLOPE_ANGLE = Math.PI / 4; // 45 degrees max climbable slope
  private readonly MIN_WATER_DEPTH = 0.5; // Minimum water depth that blocks movement
  private readonly GLOBE_RADIUS = 6.0; // Base globe radius
  
  static getInstance(): TerrainCollisionDetector {
    TerrainCollisionDetector.instance ??= new TerrainCollisionDetector();
    return TerrainCollisionDetector.instance;
  }
  
  /**
   * Check if an animal can move to a specific position
   */
  checkMovement(
    fromPosition: THREE.Vector3, 
    toPosition: THREE.Vector3
  ): TerrainCollisionResult {
    const store = useWorldStore.getState();
    const { terrainVertices, terrainOctree } = store;
    
    // If no terrain data, allow movement
    if (!terrainVertices || terrainVertices.length === 0) {
      return {
        canMove: true,
        groundHeight: this.GLOBE_RADIUS,
        slopeAngle: 0,
        isWater: false
      };
    }
    
    // Sample terrain height at target position
    const terrainSample = this.sampleTerrainHeight(toPosition, terrainVertices, terrainOctree);
    
    // Check water depth
    if (terrainSample.waterLevel > this.MIN_WATER_DEPTH) {
      return {
        canMove: false,
        groundHeight: terrainSample.groundHeight,
        slopeAngle: 0,
        isWater: true,
        adjustedPosition: this.findNearestValidPosition(toPosition, terrainVertices, terrainOctree)
      };
    }
    
    // Calculate slope between current and target position
    const slopeAngle = this.calculateSlopeAngle(fromPosition, toPosition, terrainVertices, terrainOctree);
    
    // Check if slope is too steep
    if (slopeAngle > this.MAX_SLOPE_ANGLE) {
      return {
        canMove: false,
        groundHeight: terrainSample.groundHeight,
        slopeAngle,
        isWater: false,
        adjustedPosition: this.findAlternativePosition(fromPosition, toPosition, terrainVertices, terrainOctree)
      };
    }
    
    // Movement allowed
    return {
      canMove: true,
      groundHeight: terrainSample.groundHeight,
      slopeAngle,
      isWater: false
    };
  }
  
  /**
   * Sample terrain height at a specific world position
   */
  private sampleTerrainHeight(
    position: THREE.Vector3, 
    terrainVertices: TerrainVertex[], 
    terrainOctree: TerrainOctree | null
  ): { groundHeight: number; waterLevel: number; terrainHeight: number } {
    // Convert world position to sphere surface coordinates
    const spherePosition = position.clone().normalize();
    
    // Find closest terrain vertices using octree if available
    let closestVertices: TerrainVertex[] = [];
    
    if (terrainOctree) {
      // Use octree for efficient vertex lookup
      closestVertices = this.findNearestVertices(spherePosition, terrainOctree, 8);
    } else {
      // Fallback: linear search for closest vertices
      closestVertices = this.findClosestVerticesBruteForce(spherePosition, terrainVertices, 8);
    }
    
    if (closestVertices.length === 0) {
      return {
        groundHeight: this.GLOBE_RADIUS,
        waterLevel: 0,
        terrainHeight: 0
      };
    }
    
    // Interpolate terrain properties from closest vertices
    const interpolated = this.interpolateTerrainData(spherePosition, closestVertices);
    
    // Calculate actual ground height
    const terrainHeight = interpolated.height;
    const waterLevel = interpolated.waterLevel;
    const groundHeight = this.GLOBE_RADIUS + terrainHeight - (waterLevel * 0.4);
    
    return {
      groundHeight,
      waterLevel,
      terrainHeight
    };
  }
  
  /**
   * Calculate slope angle between two positions
   */
  private calculateSlopeAngle(
    fromPosition: THREE.Vector3,
    toPosition: THREE.Vector3,
    terrainVertices: TerrainVertex[],
    terrainOctree: TerrainOctree | null
  ): number {
    const fromSample = this.sampleTerrainHeight(fromPosition, terrainVertices, terrainOctree);
    const toSample = this.sampleTerrainHeight(toPosition, terrainVertices, terrainOctree);
    
    // Calculate horizontal distance on sphere surface
    const fromSphere = fromPosition.clone().normalize().multiplyScalar(this.GLOBE_RADIUS);
    const toSphere = toPosition.clone().normalize().multiplyScalar(this.GLOBE_RADIUS);
    const horizontalDistance = fromSphere.distanceTo(toSphere);
    
    // Calculate vertical height difference
    const heightDifference = Math.abs(toSample.groundHeight - fromSample.groundHeight);
    
    // Calculate slope angle
    if (horizontalDistance < 0.001) return 0;
    return Math.atan(heightDifference / horizontalDistance);
  }
  
  /**
   * Find nearest valid position when movement is blocked
   */
  private findNearestValidPosition(
    blockedPosition: THREE.Vector3,
    terrainVertices: TerrainVertex[],
    terrainOctree: TerrainOctree | null
  ): THREE.Vector3 {
    const spherePos = blockedPosition.clone().normalize();
    const searchRadius = 0.5; // Search within 0.5 units
    const searchSteps = 16; // Number of directions to try
    
    for (let radius = 0.1; radius <= searchRadius; radius += 0.1) {
      for (let i = 0; i < searchSteps; i++) {
        const angle = (i / searchSteps) * Math.PI * 2;
        
        // Generate search position on sphere surface
        const testPos = this.generatePositionOnSphere(spherePos, angle, radius);
        const worldTestPos = testPos.multiplyScalar(this.GLOBE_RADIUS + 0.05);
        
        // Check if this position is valid
        const sample = this.sampleTerrainHeight(worldTestPos, terrainVertices, terrainOctree);
        
        if (sample.waterLevel < this.MIN_WATER_DEPTH) {
          return worldTestPos;
        }
      }
    }
    
    // Fallback: return position on base sphere
    return spherePos.multiplyScalar(this.GLOBE_RADIUS + 0.05);
  }
  
  /**
   * Find alternative movement position that avoids steep slopes
   */
  private findAlternativePosition(
    fromPosition: THREE.Vector3,
    blockedPosition: THREE.Vector3,
    terrainVertices: TerrainVertex[],
    terrainOctree: TerrainOctree | null
  ): THREE.Vector3 {
    const fromSphere = fromPosition.clone().normalize();
    const toSphere = blockedPosition.clone().normalize();
    
    // Try positions at 90-degree angles to the blocked direction
    const directions = [Math.PI / 2, -Math.PI / 2]; // Left and right
    const distance = fromSphere.distanceTo(toSphere);
    
    for (const angleOffset of directions) {
      const testPos = this.generatePositionOnSphere(fromSphere, angleOffset, distance);
      const worldTestPos = testPos.multiplyScalar(this.GLOBE_RADIUS + 0.05);
      
      const collisionResult = this.checkMovement(fromPosition, worldTestPos);
      if (collisionResult.canMove) {
        return worldTestPos;
      }
    }
    
    // Fallback: stay at current position
    return fromPosition;
  }
  
  /**
   * Generate a position on sphere surface at given angle and distance
   */
  private generatePositionOnSphere(
    centerPos: THREE.Vector3,
    angle: number,
    distance: number
  ): THREE.Vector3 {
    // Create tangent vectors for the sphere surface at centerPos
    const normal = centerPos.clone().normalize();
    const tangent1 = new THREE.Vector3();
    const tangent2 = new THREE.Vector3();
    
    // Generate perpendicular vectors
    if (Math.abs(normal.y) < 0.9) {
      tangent1.set(0, 1, 0).cross(normal).normalize();
    } else {
      tangent1.set(1, 0, 0).cross(normal).normalize();
    }
    tangent2.crossVectors(normal, tangent1).normalize();
    
    // Generate position in local tangent space
    const localX = Math.cos(angle) * distance;
    const localZ = Math.sin(angle) * distance;
    
    // Convert back to world coordinates and normalize to sphere
    const worldPos = normal.clone()
      .add(tangent1.clone().multiplyScalar(localX))
      .add(tangent2.clone().multiplyScalar(localZ))
      .normalize();
    
    return worldPos;
  }
  
  /**
   * Find nearest vertices using octree
   */
  private findNearestVertices(_position: THREE.Vector3, _octree: TerrainOctree, _count: number): TerrainVertex[] {
    // Implementation depends on octree structure
    // For now, return empty array and fall back to brute force
    return [];
  }
  
  /**
   * Brute force search for closest vertices
   */
  private findClosestVerticesBruteForce(position: THREE.Vector3, terrainVertices: TerrainVertex[], count: number): TerrainVertex[] {
    const distances = terrainVertices.map((vertex, index) => {
      const vertexPos = new THREE.Vector3(vertex.x, vertex.y, vertex.z).normalize();
      const distance = position.distanceTo(vertexPos);
      return { vertex, distance, index };
    });
    
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count).map(d => d.vertex);
  }
  
  /**
   * Interpolate terrain data from nearby vertices
   */
  private interpolateTerrainData(position: THREE.Vector3, vertices: TerrainVertex[]): { height: number; waterLevel: number } {
    if (vertices.length === 0) {
      return { height: 0, waterLevel: 0 };
    }
    
    // Simple weighted average based on inverse distance
    let totalWeight = 0;
    let weightedHeight = 0;
    let weightedWater = 0;
    
    for (const vertex of vertices) {
      const vertexPos = new THREE.Vector3(vertex.x, vertex.y, vertex.z).normalize();
      const distance = position.distanceTo(vertexPos);
      const weight = 1 / (distance + 0.001); // Prevent division by zero
      
      totalWeight += weight;
      weightedHeight += vertex.height * weight;
      weightedWater += vertex.waterLevel * weight;
    }
    
    return {
      height: weightedHeight / totalWeight,
      waterLevel: weightedWater / totalWeight
    };
  }
}

/**
 * Utility function to get terrain collision detector instance
 */
export function getTerrainCollisionDetector(): TerrainCollisionDetector {
  return TerrainCollisionDetector.getInstance();
}
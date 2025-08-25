import * as THREE from 'three';
import { terrainHeightMapGenerator } from '~/components/debug/TerrainHeightMap';
import { terrainNormalMapGenerator } from '~/components/debug/TerrainNormalMap';
import { getTerrainCollisionDetector } from './terrain-collision';

export interface PathValidationResult {
  isValid: boolean;
  blockedAt?: THREE.Vector3;
  reason?: string;
  alternativePath?: THREE.Vector3[];
  confidence: number; // 0-1, how confident we are in this result
}

export interface PathfindingOptions {
  maxSlopeAngle: number;
  avoidWater: boolean;
  samples: number;
  useHeightMap: boolean;
  useNormalMap: boolean;
  generateAlternatives: boolean;
}

/**
 * Enhanced pathfinding system that uses multiple validation approaches
 */
export class EnhancedPathfinder {
  private static instance: EnhancedPathfinder | null = null;
  
  private readonly defaultOptions: PathfindingOptions = {
    maxSlopeAngle: Math.PI / 4, // 45 degrees
    avoidWater: true,
    samples: 20,
    useHeightMap: true,
    useNormalMap: true,
    generateAlternatives: true
  };

  static getInstance(): EnhancedPathfinder {
    EnhancedPathfinder.instance ??= new EnhancedPathfinder();
    return EnhancedPathfinder.instance;
  }

  /**
   * Validate a path using multiple approaches for maximum accuracy
   */
  validatePath(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    options: Partial<PathfindingOptions> = {}
  ): PathValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const results: PathValidationResult[] = [];

    // Approach 1: Traditional terrain collision detection
    const traditionalResult = this.validateWithTraditionalCollision(startPos, endPos, opts);
    results.push(traditionalResult);

    // Approach 2: Height map validation
    if (opts.useHeightMap) {
      const heightMapResult = this.validateWithHeightMap(startPos, endPos, opts);
      if (heightMapResult) results.push(heightMapResult);
    }

    // Approach 3: Normal map validation
    if (opts.useNormalMap) {
      const normalMapResult = this.validateWithNormalMap(startPos, endPos, opts);
      if (normalMapResult) results.push(normalMapResult);
    }

    // Combine results using weighted voting
    return this.combineValidationResults(results, opts, endPos);
  }

  /**
   * Validate using traditional terrain collision detection
   */
  private validateWithTraditionalCollision(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    options: PathfindingOptions
  ): PathValidationResult {
    const detector = getTerrainCollisionDetector();
    const path = this.generatePathPoints(startPos, endPos, options.samples);

    for (let i = 1; i < path.length; i++) {
      const prevPoint = path[i - 1];
      const currPoint = path[i];
      if (!prevPoint || !currPoint) continue;
      
      const result = detector.checkMovement(prevPoint, currPoint);
      
      if (!result.canMove) {
        return {
          isValid: false,
          blockedAt: path[i],
          reason: result.isWater ? 'Water obstacle' : 'Steep terrain',
          confidence: 0.8
        };
      }
    }

    return { isValid: true, confidence: 0.8 };
  }

  /**
   * Validate using height map
   */
  private validateWithHeightMap(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    options: PathfindingOptions
  ): PathValidationResult | null {
    const heightMapResult = terrainHeightMapGenerator.validatePath(
      startPos,
      endPos,
      options.maxSlopeAngle,
      options.samples
    );

    if (!heightMapResult) return null;

    return {
      isValid: heightMapResult.valid,
      blockedAt: heightMapResult.blockedAt,
      reason: heightMapResult.reason,
      confidence: 0.9 // Height maps are typically very accurate
    };
  }

  /**
   * Validate using normal map
   */
  private validateWithNormalMap(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    options: PathfindingOptions
  ): PathValidationResult | null {
    const path = this.generatePathPoints(startPos, endPos, options.samples);

    for (const point of path) {
      if (!terrainNormalMapGenerator.isTraversable(point, options.maxSlopeAngle)) {
        const slopeAngle = terrainNormalMapGenerator.getSlopeAngle(point);
        return {
          isValid: false,
          blockedAt: point,
          reason: `Slope too steep: ${slopeAngle ? (slopeAngle * 180 / Math.PI).toFixed(1) : 'unknown'}°`,
          confidence: 0.85
        };
      }
    }

    return { isValid: true, confidence: 0.85 };
  }

  /**
   * Combine multiple validation results using weighted voting
   */
  private combineValidationResults(
    results: PathValidationResult[],
    options: PathfindingOptions,
    endPos: THREE.Vector3
  ): PathValidationResult {
    if (results.length === 0) {
      return { isValid: false, reason: 'No validation methods available', confidence: 0 };
    }

    // Calculate weighted scores
    let totalWeight = 0;
    let weightedValidScore = 0;
    let highestConfidenceInvalid: PathValidationResult | null = null;

    for (const result of results) {
      totalWeight += result.confidence;
      if (result.isValid) {
        weightedValidScore += result.confidence;
      } else {
        if (!highestConfidenceInvalid || result.confidence > highestConfidenceInvalid.confidence) {
          highestConfidenceInvalid = result;
        }
      }
    }

    const validityScore = weightedValidScore / totalWeight;
    const threshold = 0.5; // Require majority confidence for validity

    if (validityScore >= threshold) {
      // Generate alternative path if requested
      const alternativePath = options.generateAlternatives 
        ? this.generateAlternativePath(results[0]?.blockedAt, endPos, options)
        : undefined;

      return {
        isValid: true,
        confidence: validityScore,
        alternativePath
      };
    } else {
      return {
        isValid: false,
        blockedAt: highestConfidenceInvalid?.blockedAt,
        reason: highestConfidenceInvalid?.reason ?? 'Path blocked',
        confidence: 1 - validityScore
      };
    }
  }

  /**
   * Generate alternative path around obstacles
   */
  private generateAlternativePath(
    blockedPoint: THREE.Vector3 | undefined,
    endPos: THREE.Vector3,
    options: PathfindingOptions
  ): THREE.Vector3[] | undefined {
    if (!blockedPoint) return undefined;

    // Simple alternative: try paths with lateral offsets
    const alternatives: THREE.Vector3[] = [];
    const offsets = [0.5, -0.5, 1.0, -1.0]; // Try different lateral offsets

    for (const offset of offsets) {
      // Create perpendicular vector for lateral movement
      const toBlocked = blockedPoint.clone().normalize();
      const perpendicular = new THREE.Vector3()
        .crossVectors(toBlocked, new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(offset);

      const alternativePoint = blockedPoint.clone().add(perpendicular);
      
      // Validate this alternative point
      if (terrainNormalMapGenerator.isTraversable(alternativePoint, options.maxSlopeAngle)) {
        alternatives.push(alternativePoint);
      }
    }

    return alternatives.length > 0 ? alternatives : undefined;
  }

  /**
   * Generate intermediate points along a path
   */
  private generatePathPoints(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    samples: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      
      // Spherical interpolation for better paths on globe
      const startNorm = startPos.clone().normalize();
      const endNorm = endPos.clone().normalize();
      const angle = startNorm.angleTo(endNorm);
      
      if (angle < 0.01) {
        // Points are very close, use linear interpolation
        points.push(startPos.clone().lerp(endPos, t));
      } else {
        // Spherical interpolation
        const axis = new THREE.Vector3().crossVectors(startNorm, endNorm).normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(axis, angle * t);
        
        const interpolatedDir = startNorm.clone().applyQuaternion(quaternion);
        const startDist = startPos.length();
        const endDist = endPos.length();
        const interpolatedDist = startDist + (endDist - startDist) * t;
        
        points.push(interpolatedDir.multiplyScalar(interpolatedDist));
      }
    }
    
    return points;
  }

  /**
   * Find the best path between two points with obstacle avoidance
   */
  findBestPath(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    options: Partial<PathfindingOptions> = {}
  ): { path: THREE.Vector3[]; confidence: number } {
    const validation = this.validatePath(startPos, endPos, options);
    
    if (validation.isValid) {
      return {
        path: this.generatePathPoints(startPos, endPos, options.samples ?? this.defaultOptions.samples),
        confidence: validation.confidence
      };
    } else if (validation.alternativePath) {
      // Try to create path using alternative points
      const alternativePath: THREE.Vector3[] = [startPos];
      alternativePath.push(...validation.alternativePath);
      alternativePath.push(endPos);
      
      return {
        path: alternativePath,
        confidence: validation.confidence * 0.7 // Lower confidence for alternative paths
      };
    } else {
      // Return direct path with low confidence
      return {
        path: this.generatePathPoints(startPos, endPos, 3), // Fewer samples for fallback
        confidence: 0.1
      };
    }
  }
}

// Export singleton instance
export const enhancedPathfinder = EnhancedPathfinder.getInstance();

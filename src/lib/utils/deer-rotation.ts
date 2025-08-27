import * as THREE from "three";

/**
 * Centralized deer rotation utilities following Three.js standards
 * Uses quaternions for shortest-path rotation and smooth interpolation
 */

export interface DeerRotationConfig {
  /** Base rotation speed multiplier */
  baseSpeed: number;
  /** Speed multiplier for large angle changes (>30 degrees) */
  fastTurnMultiplier: number;
  /** Maximum rotation speed per frame */
  maxSpeed: number;
}

export const DEFAULT_ROTATION_CONFIG: DeerRotationConfig = {
  baseSpeed: 8.0,
  fastTurnMultiplier: 3.0,
  maxSpeed: 0.5,
};

/**
 * Calculate target quaternion for deer to face movement direction
 * Handles surface-aware rotation for globe movement
 */
export function calculateTargetRotation(
  currentPosition: THREE.Vector3,
  movementDirection: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
): THREE.Quaternion {
  // Project movement direction onto surface tangent plane
  const tangentialMovement = movementDirection
    .clone()
    .sub(
      surfaceNormal
        .clone()
        .multiplyScalar(movementDirection.dot(surfaceNormal)),
    )
    .normalize();

  if (tangentialMovement.length() < 0.01) {
    // No significant movement, return identity quaternion
    return new THREE.Quaternion();
  }

  // Calculate target look-at position
  const lookAtPosition = currentPosition.clone().add(tangentialMovement);

  // Use Three.js standard approach: temporary object with lookAt
  const tempObject = new THREE.Object3D();
  tempObject.position.copy(currentPosition);
  tempObject.up.copy(surfaceNormal); // Surface normal as "up" direction
  tempObject.lookAt(lookAtPosition);

  return tempObject.quaternion.clone();
}

/**
 * Calculate smooth rotation interpolation using Three.js slerp
 * Automatically handles shortest path rotation
 */
export function calculateSmoothedRotation(
  currentQuaternion: THREE.Quaternion,
  targetQuaternion: THREE.Quaternion,
  delta: number,
  customSpeed?: number,
  config: DeerRotationConfig = DEFAULT_ROTATION_CONFIG,
): THREE.Quaternion {
  // Calculate angular difference
  const rotationDiff = currentQuaternion.angleTo(targetQuaternion);

  // Use custom speed if provided, otherwise use config-based calculation
  let rotationSpeed: number;

  if (customSpeed !== undefined) {
    rotationSpeed = customSpeed * delta;
  } else {
    // Adaptive rotation speed based on angle difference
    rotationSpeed = config.baseSpeed * delta;

    // Faster rotation for significant direction changes (>30 degrees)
    if (rotationDiff > Math.PI / 6) {
      rotationSpeed = Math.min(
        rotationSpeed * config.fastTurnMultiplier,
        config.maxSpeed,
      );
    }
  }

  // Use Three.js standard slerp for shortest path interpolation
  const newQuaternion = currentQuaternion.clone();
  newQuaternion.slerp(targetQuaternion, rotationSpeed);

  return newQuaternion;
}

/**
 * Convert movement direction to Y-axis rotation (for Euler angle systems)
 * Includes angle normalization to prevent 320°→20° spinning issue
 */
export function calculateYRotationFromDirection(
  movementDirection: THREE.Vector3,
  currentYRotation?: number,
): number {
  const targetRotationY = Math.atan2(movementDirection.x, movementDirection.z);

  // If we have a current rotation, ensure shortest path
  if (currentYRotation !== undefined) {
    return normalizeRotationDifference(currentYRotation, targetRotationY);
  }

  return targetRotationY;
}

/**
 * Normalize rotation to take shortest path between current and target angles
 * Fixes the 320°→20° spinning issue by choosing +60° instead of -300°
 */
export function normalizeRotationDifference(
  currentAngle: number,
  targetAngle: number,
): number {
  // Normalize angles to [-π, π] range
  const normalizeAngle = (angle: number) => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  };

  const current = normalizeAngle(currentAngle);
  const target = normalizeAngle(targetAngle);

  // Calculate difference
  let diff = target - current;

  // Ensure shortest path by wrapping difference to [-π, π]
  if (diff > Math.PI) {
    diff -= 2 * Math.PI;
  } else if (diff < -Math.PI) {
    diff += 2 * Math.PI;
  }

  return current + diff;
}

/**
 * Helper to extract position and movement vectors from different coordinate systems
 */
export function extractMovementVectors(
  position: [number, number, number] | THREE.Vector3,
  direction: [number, number, number] | THREE.Vector3,
): {
  positionVec: THREE.Vector3;
  directionVec: THREE.Vector3;
  surfaceNormal: THREE.Vector3;
} {
  const positionVec = Array.isArray(position)
    ? new THREE.Vector3(...position)
    : position.clone();

  const directionVec = Array.isArray(direction)
    ? new THREE.Vector3(...direction)
    : direction.clone();

  // Calculate surface normal (pointing away from globe center)
  const surfaceNormal = positionVec.clone().normalize();

  return { positionVec, directionVec, surfaceNormal };
}

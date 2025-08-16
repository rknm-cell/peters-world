import * as THREE from "three";

// Define object-specific metadata for proper placement
export const OBJECT_METADATA = {
  // Trees
  pine: {
    bottomOffset: -0.15, // Embed slightly into surface
    baseRadius: 0.15, // For collision detection
  },
  oak: {
    bottomOffset: -0.15,
    baseRadius: 0.18,
  },
  birch: {
    bottomOffset: -0.15,
    baseRadius: 0.1,
  },

  // Structures
  house: {
    bottomOffset: -0.15,
    baseRadius: 0.8, // Foundation size
  },
  tower: {
    bottomOffset: -0.15,
    baseRadius: 0.5,
  },
  bridge: {
    bottomOffset: -0.15,
    baseRadius: 1.0,
  },

  // Decorations
  rock: {
    bottomOffset: -0.15, // Embed slightly into surface
    baseRadius: 0.3,
  },
  flower: {
    bottomOffset: -0.15, // Embed slightly into surface
    baseRadius: 0.1,
  },
} as const;

export interface PlacementInfo {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  canPlace: boolean;
  surfaceNormal?: THREE.Vector3;
}

/**
 * Calculate the optimal placement position and rotation for an object
 * based on surface intersection and object metadata
 */
export function calculatePlacement(
  objectType: string,
  intersectionPoint: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
  existingObjects: Array<{
    position: [number, number, number];
    type: string;
    id: string;
  }> = [],
): PlacementInfo {
  const metadata =
    OBJECT_METADATA[objectType as keyof typeof OBJECT_METADATA] ||
    OBJECT_METADATA.pine; // Default fallback

  // Calculate the final position - embed slightly into surface
  const finalPosition = intersectionPoint.clone();
  
  // Move along surface normal by the bottom offset (negative = embed into surface)
  finalPosition.add(
    surfaceNormal.clone().multiplyScalar(metadata.bottomOffset),
  );

  // Calculate rotation - align perfectly to surface normal
  // This makes objects point away from the globe center
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    up,
    surfaceNormal,
  );
  
  // Add random Y rotation around the surface normal axis
  const yRotation = Math.random() * Math.PI * 2;
  const yQuaternion = new THREE.Quaternion().setFromAxisAngle(
    surfaceNormal,
    yRotation,
  );
  quaternion.multiply(yQuaternion);
  
  // Convert to euler with consistent order
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');

  // Check for collisions with existing objects using bounding box
  const canPlace = checkPlacementValidity(
    finalPosition,
    metadata.baseRadius,
    objectType,
    existingObjects,
  );

  return {
    position: finalPosition,
    rotation,
    canPlace,
    surfaceNormal: surfaceNormal.clone(),
  };
}

/**
 * Check if an object can be placed at the given position without colliding
 */
function checkPlacementValidity(
  position: THREE.Vector3,
  radius: number,
  objectType: string,
  existingObjects: Array<{
    position: [number, number, number];
    type: string;
    id: string;
  }>,
): boolean {
  // Check distance from globe center (3D distance for sphere)
  const distanceFromCenter = Math.sqrt(
    position.x ** 2 + position.y ** 2 + position.z ** 2,
  );
  if (distanceFromCenter > 7.0) {
    // Slightly larger than smooth globe radius (6) for placement buffer
    return false;
  }

  // Check collisions with existing objects using improved bounding box approach
  for (const existing of existingObjects) {
    const existingPos = new THREE.Vector3(...existing.position);
    const distance = position.distanceTo(existingPos);

    const existingMetadata =
      OBJECT_METADATA[existing.type as keyof typeof OBJECT_METADATA] ||
      OBJECT_METADATA.pine;

    // Calculate minimum distance based on object dimensions
    // Use the larger of the two radii plus a small buffer
    const minDistance = Math.max(radius, existingMetadata.baseRadius) + 0.1;

    if (distance < minDistance) {
      return false;
    }
  }

  return true;
}

/**
 * Get detailed raycast intersection with surface normal
 */
export function getDetailedIntersection(
  raycaster: THREE.Raycaster,
  mesh: THREE.Mesh,
): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
  const intersects = raycaster.intersectObject(mesh);

  if (intersects.length === 0) {
    return null;
  }

  const intersection = intersects[0];
  if (!intersection?.face) {
    return null;
  }

  // Get the face normal in world coordinates
  const face = intersection.face;
  const normal = face.normal.clone();

  // Transform normal to world space if needed
  if (mesh.matrixWorld) {
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    normal.applyMatrix3(normalMatrix).normalize();
  }

  return {
    point: intersection.point,
    normal: normal,
  };
}

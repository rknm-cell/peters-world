import * as THREE from "three";

// Define object-specific metadata for proper placement
export const OBJECT_METADATA = {
  // Trees
  tree: {
    bottomOffset: -0.15, // Embed slightly into surface
    baseRadius: 0.15, // For collision detection
  },
  "tree-baobab": {
    bottomOffset: -0.15,
    baseRadius: 0.2,
  },
  "tree-beech": {
    bottomOffset: -0.15,
    baseRadius: 0.18,
  },
  "tree-birch": {
    bottomOffset: -0.15,
    baseRadius: 0.1,
  },
  "tree-conifer": {
    bottomOffset: -0.15,
    baseRadius: 0.12,
  },
  "tree-elipse": {
    bottomOffset: -0.15,
    baseRadius: 0.16,
  },
  "tree-fir": {
    bottomOffset: -0.15,
    baseRadius: 0.14,
  },
  "tree-forest": {
    bottomOffset: -0.15,
    baseRadius: 0.25,
  },
  "tree-lime": {
    bottomOffset: -0.15,
    baseRadius: 0.17,
  },
  "tree-maple": {
    bottomOffset: -0.15,
    baseRadius: 0.19,
  },
  "tree-oak": {
    bottomOffset: -0.15,
    baseRadius: 0.18,
  },
  "tree-round": {
    bottomOffset: -0.15,
    baseRadius: 0.15,
  },
  "tree-spruce": {
    bottomOffset: -0.15,
    baseRadius: 0.13,
  },
  "tree-tall": {
    bottomOffset: -0.15,
    baseRadius: 0.11,
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

  // Grass models
  "grass/grass": {
    bottomOffset: -0.01,
    baseRadius: 0.03,
  },
  "grass/grass-basic": {
    bottomOffset: -0.01,
    baseRadius: 0.02,
  },
  "grass/grass-clumb": {
    bottomOffset: -0.01,
    baseRadius: 0.04,
  },
  "grass/grass-long": {
    bottomOffset: -0.01,
    baseRadius: 0.025,
  },
  "grass/grass-tall": {
    bottomOffset: -0.01,
    baseRadius: 0.035,
  },

  // Animal models
  "animals/deer": {
    bottomOffset: -0.1, // Deer should stand on the ground
    baseRadius: 0.4, // Deer collision radius
  },
  "animals/wolf": {
    bottomOffset: -0.08,
    baseRadius: 0.3,
  },
  "animals/seagull": {
    bottomOffset: -0.05,
    baseRadius: 0.2,
  },
  "animals/crab": {
    bottomOffset: -0.02,
    baseRadius: 0.15,
  },
  "animals/butterfly": {
    bottomOffset: 0.1, // Butterfly should float above ground
    baseRadius: 0.08,
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
    OBJECT_METADATA.tree; // Default fallback

  // Calculate the final position - embed slightly into surface
  const finalPosition = intersectionPoint.clone();
  
  // Move along surface normal by the bottom offset (negative = embed into surface)
  finalPosition.add(
    surfaceNormal.clone().multiplyScalar(metadata.bottomOffset),
  );

  // Calculate rotation based on object type
  let rotation: THREE.Euler;
  
  // Animals should stand mostly upright, not aligned with surface normal
  if (objectType.startsWith("animals/")) {
    // For animals, use minimal rotation - just keep them mostly upright
    rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'); // Random Y rotation for variety
  } else {
    // For other objects (trees, structures, etc.), align with surface normal but limit excessive rotation
    const up = new THREE.Vector3(0, 1, 0);
    
    // Create a rotation that makes the object's up vector align with the surface normal
    // but without flipping the object upside down
    const quaternion = new THREE.Quaternion();
    
    // Handle the case where the surface normal is pointing directly up or down
    if (Math.abs(surfaceNormal.y) > 0.99) {
      // If surface normal is nearly vertical, just use identity rotation
      quaternion.identity();
    } else {
      // Calculate the rotation axis (cross product of up and surface normal)
      const rotationAxis = new THREE.Vector3().crossVectors(up, surfaceNormal).normalize();
      
      // Calculate the rotation angle
      let rotationAngle = Math.acos(up.dot(surfaceNormal));
      
      // Apply a gradual reduction to rotation as it gets steeper
      // This prevents objects from becoming parallel while maintaining natural appearance
      if (rotationAngle > Math.PI / 2.2) { // If rotation is more than 82 degrees
        // Gradually reduce the rotation using a smooth curve
        const excessRotation = rotationAngle - Math.PI / 2.2;
        const reductionFactor = Math.max(0.3, 1 - (excessRotation / (Math.PI / 2.2)));
        rotationAngle = Math.PI / 2.2 + (excessRotation * reductionFactor);
      }
      
      // Create quaternion from axis and angle
      quaternion.setFromAxisAngle(rotationAxis, rotationAngle);
    }
    
    // Convert to euler with consistent order
    rotation = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  }

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
  if (distanceFromCenter > 9.0) {
    // Increased buffer for deformed terrain
    return false;
  }

  // Check collisions with existing objects using improved bounding box approach
  for (const existing of existingObjects) {
    const existingPos = new THREE.Vector3(...existing.position);
    const distance = position.distanceTo(existingPos);

    const existingMetadata =
      OBJECT_METADATA[existing.type as keyof typeof OBJECT_METADATA] ||
      OBJECT_METADATA.tree;

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

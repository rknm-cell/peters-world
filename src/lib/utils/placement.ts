import * as THREE from "three";

/**
 * Extract rotation from ArrowHelper's internal orientation logic
 * This ensures identical orientation calculations as debug arrows
 */
function getArrowHelperRotation(direction: THREE.Vector3): THREE.Euler {
  // Create a temporary ArrowHelper to extract its rotation logic
  const tempArrowHelper = new THREE.ArrowHelper(
    direction,                    // Direction vector
    new THREE.Vector3(0, 0, 0),  // Origin (doesn't affect rotation)
    1,                           // Length (doesn't affect rotation)
    0x000000                     // Color (doesn't affect rotation)
  );
  
  // Extract the rotation - this is ArrowHelper's exact orientation calculation
  const rotation = tempArrowHelper.rotation.clone();
  
  // Clean up temporary object to prevent memory leaks
  tempArrowHelper.dispose();
  
  return rotation;
}

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
  "tree-elipse": {
    bottomOffset: -0.15,
    baseRadius: 0.16,
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
  "building-cabin-small": {
    bottomOffset: -0.15,
    baseRadius: 0.5, // Small cabin foundation - adjusted for scale
  },
  "building-cabin-big": {
    bottomOffset: -0.15,
    baseRadius: 0.7, // Big cabin foundation - adjusted for scale
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
  "animals/sheep-white": {
    bottomOffset: -0.1, // Sheep should stand on the ground
    baseRadius: 0.35, // Sheep collision radius
  },
  "animals/bear_brown": {
    bottomOffset: -0.1, // Bear should stand on the ground
    baseRadius: 0.5, // Bear collision radius (larger than deer)
  },
  "animals/cow": {
    bottomOffset: -0.1, // Cow should stand on the ground
    baseRadius: 0.6, // Cow collision radius (largest land animal)
  },
  "animals/hen": {
    bottomOffset: -0.05, // Hen should stand on the ground
    baseRadius: 0.2, // Hen collision radius
  },
  "animals/horse": {
    bottomOffset: -0.1, // Horse should stand on the ground
    baseRadius: 0.55, // Horse collision radius
  },
  "animals/penguin": {
    bottomOffset: -0.05, // Penguin should stand on the ground
    baseRadius: 0.25, // Penguin collision radius
  },
  "animals/pig": {
    bottomOffset: -0.1, // Pig should stand on the ground
    baseRadius: 0.4, // Pig collision radius
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
 * 
 * CRITICAL: Uses ArrowHelper.rotation to extract IDENTICAL orientation logic
 * as the debug arrows, ensuring perfect synchronization between debug visualization
 * and actual object placement.
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

  // Use mathematical surface normal for consistency with debug system
  // This ensures placement arrows and actual placement use the same reference
  const globeRadius = 6; // Match SurfaceNormalDebug exactly
  const mathNormal = intersectionPoint.clone().normalize(); // Points outward from sphere center
  const mathSurfacePoint = mathNormal.clone().multiplyScalar(globeRadius);

  // Calculate the final position using mathematical approach
  const finalPosition = mathSurfacePoint.clone();
  
  // Move along mathematical normal by the bottom offset (negative = embed into surface)
  finalPosition.add(
    mathNormal.clone().multiplyScalar(metadata.bottomOffset),
  );

  // Calculate rotation using ArrowHelper's orientation logic for perfect consistency
  let rotation: THREE.Euler;
  
  // Animals should stand mostly upright, not aligned with surface normal
  if (objectType.startsWith("animals/")) {
    // For animals, use minimal rotation - just keep them mostly upright
    rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'); // Random Y rotation for variety
  } else {
    // Use ArrowHelper's internal logic to determine orientation
    // This ensures IDENTICAL orientation to what debug arrows show
    rotation = getArrowHelperRotation(mathNormal);
    
    // Apply slope reduction for natural appearance (optional)
    // Gradually reduce extreme rotations while keeping the ArrowHelper base orientation
    const rotationMagnitude = Math.sqrt(rotation.x * rotation.x + rotation.z * rotation.z);
    if (rotationMagnitude > Math.PI / 2.2) { // If rotation is more than ~82 degrees
      const reductionFactor = Math.max(0.3, (Math.PI / 2.2) / rotationMagnitude);
      rotation.x *= reductionFactor;
      rotation.z *= reductionFactor;
    }
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
    surfaceNormal: mathNormal.clone(), // Return mathematical normal for consistency
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
    // Ensure the mesh's world matrix is up to date
    mesh.updateMatrixWorld(true);
    
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    normal.applyMatrix3(normalMatrix).normalize();
  }
  
  // Ensure the normal points outward from the globe center
  // For a sphere, the normal should point away from the center (0,0,0)
  const centerToPoint = intersection.point.clone().normalize();
  if (normal.dot(centerToPoint) < 0) {
    normal.negate();
  }

  return {
    point: intersection.point,
    normal: normal,
  };
}

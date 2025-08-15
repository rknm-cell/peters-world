import * as THREE from 'three';

// Define object-specific metadata for proper placement
export const OBJECT_METADATA = {
  // Trees
  pine: { 
    bottomOffset: 0.4,      // Tree trunk base height
    alignToNormal: false,   // Trees grow vertically regardless of surface
    baseRadius: 0.15        // For collision detection
  },
  oak: { 
    bottomOffset: 0.4,      // Tree trunk base height
    alignToNormal: false, 
    baseRadius: 0.18 
  },
  birch: { 
    bottomOffset: 0.6,      // Birch is taller, higher base
    alignToNormal: false, 
    baseRadius: 0.1 
  },
  
  // Structures
  house: { 
    bottomOffset: 0.5,      // House foundation height
    alignToNormal: false,   // Houses stay upright for stability
    baseRadius: 0.8         // Foundation size
  },
  tower: { 
    bottomOffset: 0.8,      // Tower base height
    alignToNormal: false,   // Towers stay vertical
    baseRadius: 0.5 
  },
  bridge: { 
    bottomOffset: 0.2,      // Bridge deck height
    alignToNormal: true,    // Bridges follow terrain
    baseRadius: 1.0 
  },
  
  // Decorations
  rock: { 
    bottomOffset: 0.15,     // Half of rock height to sit on surface
    alignToNormal: true,    // Rocks conform to surface angle
    baseRadius: 0.3 
  },
  flower: { 
    bottomOffset: 0.0,      // Flowers grow from ground
    alignToNormal: false,   // Flowers grow upward
    baseRadius: 0.1 
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
  existingObjects: Array<{ position: [number, number, number]; type: string; id: string }> = []
): PlacementInfo {
  
  const metadata = OBJECT_METADATA[objectType as keyof typeof OBJECT_METADATA] || 
    OBJECT_METADATA.pine; // Default fallback

  // Calculate the final position
  const finalPosition = intersectionPoint.clone();
  
  // Adjust position based on object's bottom offset
  if (metadata.alignToNormal) {
    // Move along surface normal by the bottom offset
    finalPosition.add(surfaceNormal.clone().multiplyScalar(metadata.bottomOffset));
  } else {
    // Move vertically regardless of surface angle
    finalPosition.y += metadata.bottomOffset;
  }

  // Calculate rotation
  const rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0); // Random Y rotation
  
  if (metadata.alignToNormal) {
    // Align object to surface normal
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, surfaceNormal);
    rotation.setFromQuaternion(quaternion);
    
    // Add random Y rotation while maintaining surface alignment
    const yRotation = Math.random() * Math.PI * 2;
    const yQuaternion = new THREE.Quaternion().setFromAxisAngle(surfaceNormal, yRotation);
    quaternion.multiply(yQuaternion);
    rotation.setFromQuaternion(quaternion);
  }

  // Check for collisions with existing objects
  const canPlace = checkPlacementValidity(
    finalPosition, 
    metadata.baseRadius, 
    objectType,
    existingObjects
  );

  return {
    position: finalPosition,
    rotation,
    canPlace,
    surfaceNormal: surfaceNormal.clone()
  };
}

/**
 * Check if an object can be placed at the given position without colliding
 */
function checkPlacementValidity(
  position: THREE.Vector3,
  radius: number,
  objectType: string,
  existingObjects: Array<{ position: [number, number, number]; type: string; id: string }>
): boolean {
  
  // Check distance from island center
  const distanceFromCenter = Math.sqrt(position.x ** 2 + position.z ** 2);
  if (distanceFromCenter > 7.5) { // Slightly smaller than island radius
    return false;
  }

  // Check collisions with existing objects
  for (const existing of existingObjects) {
    const existingPos = new THREE.Vector3(...existing.position);
    const distance = position.distanceTo(existingPos);
    
    const existingMetadata = OBJECT_METADATA[existing.type as keyof typeof OBJECT_METADATA] || 
      OBJECT_METADATA.pine;
    
    const minDistance = radius + existingMetadata.baseRadius + 0.2; // Small buffer
    
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
  mesh: THREE.Mesh
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
    normal: normal
  };
}
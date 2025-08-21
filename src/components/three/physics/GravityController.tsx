"use client";

import { useRef } from 'react';
import { useRapier } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PhysicsBodyUserData } from '~/lib/types';

/**
 * GravityController - Applies custom radial gravity toward globe center
 * This creates the effect of objects being pulled toward the globe surface
 * regardless of their position around the sphere
 */
export function GravityController() {
  const { world } = useRapier();
  const lastCorrectionTime = useRef<Map<string, number>>(new Map());
  
  useFrame(() => {
    const currentTime = Date.now();
    
    // Apply surface adherence correction to deer physics bodies
    world.forEachRigidBody((body) => {
      const userData = body.userData as PhysicsBodyUserData & { isMoving?: boolean };
      if (userData?.isDeer && userData.objectId) {
        // Skip correction if deer is actively moving to prevent flickering
        if (userData.isMoving) {
          return;
        }
        
        const position = body.translation();
        const objectId = userData.objectId;
        
        // Limit correction frequency to prevent flickering
        const lastCorrection = lastCorrectionTime.current.get(objectId) ?? 0;
        const timeSinceLastCorrection = currentTime - lastCorrection;
        
        // Only correct every 500ms to prevent flickering
        if (timeSinceLastCorrection < 500) {
          return;
        }
        
        const surfaceDistance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        const idealSurfaceDistance = 6.05; // Match the initial positioning  
        const tolerance = 0.2; // Reasonable tolerance to reduce corrections
        
        let needsCorrection = false;
        let correctedPosition: THREE.Vector3 | null = null;
        
        // If deer is significantly too far from surface
        if (surfaceDistance > idealSurfaceDistance + tolerance) {
          const correctionDirection = new THREE.Vector3(-position.x, -position.y, -position.z).normalize();
          correctedPosition = correctionDirection.multiplyScalar(idealSurfaceDistance);
          needsCorrection = true;
        }
        
        // If deer is significantly too close to surface
        if (surfaceDistance < idealSurfaceDistance - tolerance) {
          const correctionDirection = new THREE.Vector3(position.x, position.y, position.z).normalize();
          correctedPosition = correctionDirection.multiplyScalar(idealSurfaceDistance);
          needsCorrection = true;
        }
        
        if (needsCorrection && correctedPosition) {
          body.setTranslation(correctedPosition, true);
          lastCorrectionTime.current.set(objectId, currentTime);
        }
      }
    });
  });
  
  return null; // This component doesn't render anything
}
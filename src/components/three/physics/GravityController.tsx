"use client";

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
  
  useFrame(() => {
    // Apply radial gravity to all physics bodies marked as deer
    world.forEachRigidBody((body) => {
      const userData = body.userData as PhysicsBodyUserData;
      if (userData?.isDeer) {
        const position = body.translation();
        
        // Calculate gravity vector pointing toward globe center (0, 0, 0)
        const gravityDirection = new THREE.Vector3(
          -position.x, 
          -position.y, 
          -position.z
        ).normalize();
        
        // Apply stronger gravity than Earth for better surface adhesion
        const gravityStrength = 20.0; // 2x Earth gravity for reliable surface contact
        const mass = body.mass();
        
        const gravityForce = gravityDirection.multiplyScalar(mass * gravityStrength);
        
        // Apply the radial gravity force
        body.addForce({
          x: gravityForce.x,
          y: gravityForce.y, 
          z: gravityForce.z
        }, true);
        
        // Optional: Add slight surface normal force to prevent sinking
        const surfaceDistance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        const idealSurfaceDistance = 6.2; // Slightly above globe surface
        
        if (surfaceDistance < idealSurfaceDistance) {
          // Push away from center if too close (prevent sinking into globe)
          const repulsionForce = gravityDirection.clone()
            .negate()
            .multiplyScalar(mass * 5.0 * (idealSurfaceDistance - surfaceDistance));
          
          body.addForce({
            x: repulsionForce.x,
            y: repulsionForce.y,
            z: repulsionForce.z
          }, true);
        }
      }
    });
  });
  
  return null; // This component doesn't render anything
}
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
  // DISABLED: Deer position corrections - DeerPhysics handles surface adherence
  // const lastCorrectionTime = useRef<Map<string, number>>(new Map());
  
  useFrame(() => {
    // DISABLED: GravityController corrections for deer
    // Physics-based deer (DeerPhysics) now handle their own surface adherence
    // This prevents conflicts between GravityController and DeerPhysics position updates
    
    // Could implement gravity for other objects here if needed in future
    // world.forEachRigidBody((body) => { ... });
    
    return; // No-op for now since we only have deer physics bodies
  });
  
  return null; // This component doesn't render anything
}
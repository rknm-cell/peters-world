"use client";

// DISABLED: GravityController functionality - DeerPhysics handles surface adherence
// import { useRef } from 'react';
// import { useRapier } from '@react-three/rapier';
// import { useFrame } from '@react-three/fiber';
// import * as THREE from 'three';
// import type { PhysicsBodyUserData } from '~/lib/types';

/**
 * GravityController - Previously applied custom radial gravity toward globe center
 * DISABLED: Physics-based deer now handle their own surface adherence internally
 * This prevents conflicts between GravityController and DeerPhysics position updates
 */
export function GravityController() {
  // DISABLED: No longer needed since DeerPhysics components handle surface adherence
  // const { world } = useRapier();
  // const lastCorrectionTime = useRef<Map<string, number>>(new Map());
  
  // DISABLED: No frame updates needed
  // useFrame(() => { ... });
  
  return null; // This component doesn't render anything
}
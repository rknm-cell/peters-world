"use client";

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { Deer } from '~/components/three/objects/Deer';

interface DeerPhysicsProps {
  objectId: string;
  position: [number, number, number];
  type: string;
  selected?: boolean;
}

/**
 * DeerPhysics - Physics-enabled deer with realistic movement and surface adhesion
 * Uses Rapier physics for natural movement, collision detection, and surface following
 */
export function DeerPhysics({ objectId, position, type, selected = false }: DeerPhysicsProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const [lastTargetTime, setLastTargetTime] = useState(Date.now());
  const { world } = useRapier();
  
  // Movement parameters
  const MOVEMENT_FORCE = 300; // Force applied for movement
  const TARGET_DISTANCE_MIN = 1.0;
  const TARGET_DISTANCE_MAX = 3.0;
  const TARGET_UPDATE_INTERVAL = 3000; // 3 seconds between new targets
  
  useFrame(() => {
    if (!rigidBodyRef.current) return;
    
    const body = rigidBodyRef.current;
    const currentPosition = body.translation();
    const currentTime = Date.now();
    
    // Generate new target if needed
    const distanceToTarget = target ? 
      Math.sqrt(
        Math.pow(currentPosition.x - target.x, 2) + 
        Math.pow(currentPosition.y - target.y, 2) + 
        Math.pow(currentPosition.z - target.z, 2)
      ) : Infinity;
    
    const needsNewTarget = 
      !target || 
      distanceToTarget < 0.5 ||
      currentTime - lastTargetTime > TARGET_UPDATE_INTERVAL;
    
    if (needsNewTarget) {
      const newTarget = generateSurfaceTarget(currentPosition);
      if (newTarget) {
        setTarget(newTarget);
        setLastTargetTime(currentTime);
        console.log(`🦌 Physics Deer ${objectId}: New target [${newTarget.x.toFixed(2)}, ${newTarget.y.toFixed(2)}, ${newTarget.z.toFixed(2)}]`);
      }
    }
    
    // Apply movement force toward target
    if (target) {
      const direction = new THREE.Vector3(
        target.x - currentPosition.x,
        target.y - currentPosition.y,
        target.z - currentPosition.z
      ).normalize();
      
      const moveForce = direction.multiplyScalar(MOVEMENT_FORCE);
      
      body.addForce({
        x: moveForce.x,
        y: moveForce.y,
        z: moveForce.z
      }, true);
      
      // Rotate deer to face movement direction (only Y-axis rotation for natural look)
      const lookDirection = new THREE.Vector2(direction.x, direction.z).normalize();
      const targetRotationY = Math.atan2(lookDirection.x, lookDirection.y);
      
      // Get current rotation and smoothly rotate toward target
      const currentRotation = body.rotation();
      const currentEuler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion(currentRotation.x, currentRotation.y, currentRotation.z, currentRotation.w)
      );
      
      // Smooth rotation interpolation
      const rotationSpeed = 0.1;
      const newRotationY = THREE.MathUtils.lerp(currentEuler.y, targetRotationY, rotationSpeed);
      
      const newQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(currentEuler.x, newRotationY, currentEuler.z)
      );
      
      body.setRotation({
        x: newQuaternion.x,
        y: newQuaternion.y,
        z: newQuaternion.z,
        w: newQuaternion.w
      }, true);
    }
    
    // Apply damping to prevent excessive speed
    const velocity = body.linvel();
    const maxSpeed = 5.0;
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    
    if (speed > maxSpeed) {
      const dampingFactor = maxSpeed / speed;
      body.setLinvel({
        x: velocity.x * dampingFactor,
        y: velocity.y * dampingFactor,
        z: velocity.z * dampingFactor
      }, true);
    }
  });
  
  /**
   * Generate a random target position on the globe surface
   */
  function generateSurfaceTarget(currentPos: { x: number; y: number; z: number }): THREE.Vector3 | null {
    // Create random local movement target
    const angle = Math.random() * Math.PI * 2;
    const distance = TARGET_DISTANCE_MIN + Math.random() * (TARGET_DISTANCE_MAX - TARGET_DISTANCE_MIN);
    
    // Calculate current surface normal (direction from center to current position)
    const currentRadius = Math.sqrt(currentPos.x ** 2 + currentPos.y ** 2 + currentPos.z ** 2);
    const normal = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).normalize();
    
    // Create tangent vectors for local coordinate system
    const tangent1 = new THREE.Vector3();
    const tangent2 = new THREE.Vector3();
    
    // Generate perpendicular vectors
    if (Math.abs(normal.y) < 0.9) {
      tangent1.set(0, 1, 0).cross(normal).normalize();
    } else {
      tangent1.set(1, 0, 0).cross(normal).normalize();
    }
    tangent2.crossVectors(normal, tangent1).normalize();
    
    // Generate target in local tangent space
    const localX = Math.cos(angle) * distance;
    const localZ = Math.sin(angle) * distance;
    
    // Convert to world coordinates
    const targetDirection = normal.clone()
      .add(tangent1.clone().multiplyScalar(localX))
      .add(tangent2.clone().multiplyScalar(localZ))
      .normalize();
    
    // Use current radius for target (assumes roughly spherical surface)
    const targetRadius = 6.2; // Slightly above globe surface for physics stability
    return targetDirection.multiplyScalar(targetRadius);
  }
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      colliders={false}
      userData={{ isDeer: true, objectId }}
      mass={60} // 60kg deer
      linearDamping={2.0} // Higher damping for more controlled movement
      angularDamping={5.0} // Prevent excessive spinning
      ccd={true} // Continuous collision detection for fast movement
    >
      {/* Capsule collider for deer body - realistic deer proportions */}
      <CapsuleCollider args={[0.6, 0.3]} position={[0, 0.6, 0]} />
      
      {/* Visual deer model */}
      <group position={[0, -0.3, 0]}> {/* Offset visual model to align with collider */}
        <Deer 
          type={type}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[1, 1, 1]}
          selected={selected}
          objectId={objectId}
          preview={false}
          canPlace={true}
        />
      </group>
    </RigidBody>
  );
}
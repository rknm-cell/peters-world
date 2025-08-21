"use client";

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { Deer } from '~/components/three/objects/Deer';
import { useWorldStore } from '~/lib/store';

interface DeerPhysicsProps {
  objectId: string;
  position: [number, number, number];
  type: string;
  selected?: boolean;
}

// Character controller interface for proper typing
interface CharacterController {
  enableAutostep(maxStepHeight: number, minStepWidth: number, enableDynamic: boolean): void;
  enableSnapToGround(distance: number): void;
  computeColliderMovement(collider: unknown, desiredMovement: { x: number; y: number; z: number }): void;
  computedMovement(): { x: number; y: number; z: number };
  free?(): void;
}

/**
 * DeerPhysics - Physics-enabled deer with realistic movement and surface adhesion
 * Uses Rapier physics for natural movement, collision detection, and surface following
 */
export function DeerPhysics({ objectId, position, type, selected = false }: DeerPhysicsProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  
  // Ensure deer starts on globe surface (globe radius is 6.0)
  const initialPosition = new THREE.Vector3(...position);
  const surfacePosition = initialPosition.normalize().multiplyScalar(6.05); // Place just above surface
  
  const [currentPosition, setCurrentPosition] = useState(surfacePosition);
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const [lastTargetTime, setLastTargetTime] = useState(Date.now());
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(Date.now());
  
  const { rapier, world } = useRapier();
  const characterController = useRef<CharacterController | null>(null);
  
  // Initialize character controller and deer orientation
  useEffect(() => {
    if (!characterController.current && rapier && world) {
      const controller = world.createCharacterController(0.01) as CharacterController; // Small offset for stability
      controller.enableAutostep(0.5, 0.2, true); // Enable stepping over small obstacles
      controller.enableSnapToGround(0.5); // Snap to ground within 0.5 units
      characterController.current = controller;
      console.log('🦌 Character controller initialized for deer', objectId);
    }
    
    // Set initial deer orientation to match surface normal
    if (rigidBodyRef.current) {
      const surfaceNormal = surfacePosition.clone().normalize();
      
      // Create initial orientation matrix with deer facing "north" relative to surface
      const localUp = surfaceNormal;
      const worldUp = new THREE.Vector3(0, 1, 0);
      const localForward = worldUp.clone()
        .sub(localUp.clone().multiplyScalar(worldUp.dot(localUp)))
        .normalize();
      
      // If forward is too small, use an alternative direction
      if (localForward.length() < 0.1) {
        const worldForward = new THREE.Vector3(1, 0, 0);
        localForward.copy(worldForward)
          .sub(localUp.clone().multiplyScalar(worldForward.dot(localUp)))
          .normalize();
      }
      
      const localRight = localForward.clone().cross(localUp).normalize();
      localForward.crossVectors(localUp, localRight).normalize();
      
      // Create rotation matrix and apply to deer
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeBasis(localRight, localUp, localForward.negate());
      const initialQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
      
      rigidBodyRef.current.setRotation(initialQuaternion, true);
    }
    
    return () => {
      if (characterController.current) {
        characterController.current.free?.();
        characterController.current = null;
      }
    };
  }, [rapier, world, objectId, surfacePosition]);
  
  // Movement parameters for stable wandering
  const MOVEMENT_SPEED = 0.8; // Units per second
  const TARGET_DISTANCE = { min: 0.5, max: 1.2 }; // Distance to wander
  const TARGET_UPDATE_INTERVAL = { min: 2000, max: 4000 }; // Time between targets
  const IDLE_PROBABILITY = 0.3; // Chance to idle
  const IDLE_DURATION = { min: 1000, max: 3000 }; // Idle time
  
  useFrame((state, delta) => {
    if (!rigidBodyRef.current || !characterController.current) return;
    
    const body = rigidBodyRef.current;
    const currentTime = Date.now();
    
    // === CHARACTER CONTROLLER LOGIC ===
    
    // Handle idle state
    if (isIdle) {
      const idleDuration = currentTime - idleStartTime;
      const maxIdleDuration = IDLE_DURATION.min + Math.random() * (IDLE_DURATION.max - IDLE_DURATION.min);
      
      if (idleDuration > maxIdleDuration) {
        setIsIdle(false);
        setTarget(null); // Force new target generation
      }
      // During idle, no movement
      return;
    }
    
    // Check if we need a new target
    const distanceToTarget = target ? currentPosition.distanceTo(target) : Infinity;
    const timeSinceLastTarget = currentTime - lastTargetTime;
    const maxTargetInterval = TARGET_UPDATE_INTERVAL.min + 
      Math.random() * (TARGET_UPDATE_INTERVAL.max - TARGET_UPDATE_INTERVAL.min);
    
    const needsNewTarget = 
      !target || 
      distanceToTarget < 0.2 || // Close to target
      timeSinceLastTarget > maxTargetInterval; // Time for new target
    
    if (needsNewTarget) {
      // Decide if deer should idle or move
      if (Math.random() < IDLE_PROBABILITY) {
        setIsIdle(true);
        setIdleStartTime(currentTime);
        setTarget(null);
        return;
      } else {
        // Generate new wandering target
        const newTarget = generateWanderingTarget(currentPosition);
        if (newTarget) {
          setTarget(newTarget);
          setLastTargetTime(currentTime);
        }
      }
    }
    
    // Move toward target using character controller
    if (target && !isIdle && characterController.current) {
      const direction = target.clone().sub(currentPosition).normalize();
      
      // Get surface normal for surface-parallel movement
      const surfaceNormal = currentPosition.clone().normalize();
      
      // Project movement onto surface (remove component along surface normal)
      const surfaceMovement = direction.clone()
        .sub(surfaceNormal.clone().multiplyScalar(direction.dot(surfaceNormal)))
        .normalize();
      
      // Calculate movement for this frame
      const movement = surfaceMovement.multiplyScalar(MOVEMENT_SPEED * delta);
      
      // Use character controller to compute safe movement
      const collider = body.collider(0);
      if (collider) {
        characterController.current.computeColliderMovement(
          collider,
          { x: movement.x, y: movement.y, z: movement.z }
        );
        
        const correctedMovement = characterController.current.computedMovement();
        
        // Apply the corrected movement
        const currentPos = body.translation();
        const newPosition = new THREE.Vector3(
          currentPos.x + correctedMovement.x,
          currentPos.y + correctedMovement.y,
          currentPos.z + correctedMovement.z
        );
        
        // Update physics body position
        body.setTranslation(newPosition, true);
        setCurrentPosition(newPosition);
        
        // Rotate deer to face movement direction relative to surface normal
        if (Math.abs(correctedMovement.x) > 0.001 || Math.abs(correctedMovement.z) > 0.001) {
          const movementVector = new THREE.Vector3(correctedMovement.x, correctedMovement.y, correctedMovement.z);
          
          // Get surface normal (pointing away from globe center)
          const surfaceNormal = newPosition.clone().normalize();
          
          // Calculate local "up" direction relative to surface
          const localUp = surfaceNormal;
          
          // Project movement onto surface tangent plane
          const tangentialMovement = movementVector.clone()
            .sub(localUp.clone().multiplyScalar(movementVector.dot(localUp)))
            .normalize();
          
          if (tangentialMovement.length() > 0.1) {
            // Calculate local "forward" direction (where deer should face)
            const localForward = tangentialMovement;
            
            // Calculate local "right" direction using cross product
            const localRight = localForward.clone().cross(localUp).normalize();
            
            // Recalculate forward to ensure orthogonality
            localForward.crossVectors(localUp, localRight).normalize();
            
            // Create rotation matrix from local coordinate system
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeBasis(localRight, localUp, localForward.negate());
            
            // Extract quaternion from rotation matrix
            const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
            
            // Get current rotation
            const currentRotation = body.rotation();
            const currentQuaternion = new THREE.Quaternion(
              currentRotation.x, 
              currentRotation.y, 
              currentRotation.z, 
              currentRotation.w
            );
            
            // Smoothly interpolate to target rotation
            const rotationSpeed = 3.0 * delta;
            const newQuaternion = currentQuaternion.slerp(targetQuaternion, rotationSpeed);
            
            body.setRotation(newQuaternion, true);
          }
        }
      }
    }
    
    // === POSITION SYNC ===
    // Update store with physics position
    const store = useWorldStore.getState();
    const currentObject = store.objects.find(obj => obj.id === objectId);
    
    if (currentObject) {
      const threshold = 0.01;
      const currentPos = currentObject.position;
      
      if (Math.abs(currentPos[0] - currentPosition.x) > threshold ||
          Math.abs(currentPos[1] - currentPosition.y) > threshold ||
          Math.abs(currentPos[2] - currentPosition.z) > threshold) {
        
        store.updateObject(objectId, {
          position: [currentPosition.x, currentPosition.y, currentPosition.z]
        });
      }
    }
  });
  
  /**
   * Generate a random wandering target on the globe surface
   */
  function generateWanderingTarget(currentPos: THREE.Vector3): THREE.Vector3 | null {
    // Generate random direction and distance for wandering
    const angle = Math.random() * Math.PI * 2;
    const distance = TARGET_DISTANCE.min + Math.random() * (TARGET_DISTANCE.max - TARGET_DISTANCE.min);
    
    // Get current surface normal
    const normal = currentPos.clone().normalize();
    
    // Create tangent vectors for local movement
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
    
    // Use consistent surface radius to keep deer on surface
    const targetRadius = 6.05; // Match initial positioning and gravity controller
    return targetDirection.multiplyScalar(targetRadius);
  }
  
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[surfacePosition.x, surfacePosition.y, surfacePosition.z]}
      type="kinematicPosition" // Kinematic body controlled by character controller
      colliders={false}
      userData={{ isDeer: true, objectId }}
    >
      {/* Capsule collider for character controller */}
      <CapsuleCollider 
        args={[0.2, 0.4]} // Smaller collider for better surface contact
        position={[0, 0.2, 0]} // Lower position for better surface adherence
        friction={1.0} // Good friction for walking
        restitution={0.0} // No bounce
      />
      
      {/* Visual deer model - aligned with collider center */}
      <group position={[0, 0, 0]}>
        <Deer 
          type={type}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[1, 1, 1]}
          selected={selected}
          objectId={objectId}
          preview={false}
          canPlace={true}
          disablePositionSync={true}
          isPhysicsControlled={true}
        />
      </group>
    </RigidBody>
  );
}
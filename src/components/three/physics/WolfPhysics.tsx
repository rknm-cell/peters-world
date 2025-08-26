"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { Wolf } from '~/components/three/objects/Wolf';
import { useWorldStore } from '~/lib/store';
import { WOLF_CONFIG } from '~/lib/constants';
import { calculateTargetRotation, calculateSmoothedRotation, extractMovementVectors } from '~/lib/utils/deer-rotation';
import { useDeerRenderQueue } from '~/lib/utils/render-queue';
import { getTerrainCollisionDetector } from '~/lib/utils/terrain-collision';

interface WolfPhysicsProps {
  objectId: string;
  position: [number, number, number];
  type: string;
  // Removed selected prop - selection handled externally to prevent re-renders
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
 * WolfPhysics - Physics-enabled wolf with realistic movement, surface adhesion, and deer-chasing behavior
 * Uses Rapier physics for natural movement, collision detection, and hunting behavior
 */
function WolfPhysicsComponent({ objectId, position, type }: WolfPhysicsProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  
  // Render queue for batching updates and preventing multiple simultaneous re-renders
  const { queueDeerTransformUpdate, cancelDeerUpdates } = useDeerRenderQueue();
  
  // Ensure wolf starts on globe surface (globe radius is 6.0)
  const initialPosition = new THREE.Vector3(...position);
  const surfacePosition = initialPosition.normalize().multiplyScalar(6.05); // Place just above surface
  
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const [lastTargetTime, setLastTargetTime] = useState(Date.now());
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(Date.now());

  // Wolf-specific hunting states
  const [isHunting, setIsHunting] = useState(false);
  const [huntingTarget, setHuntingTarget] = useState<string | null>(null); // Deer object ID being hunted
  const [huntingStartTime, setHuntingStartTime] = useState(0);
  const lastUpdateTime = useRef(0);
  
  // Bounce animation state
  const bouncePhase = useRef(0);
  const lastMovementSpeed = useRef(0);
  
  const { rapier, world } = useRapier();
  const terrainCollisionDetector = getTerrainCollisionDetector();
  
  // Clean up queued updates when component unmounts
  useEffect(() => {
    return () => {
      cancelDeerUpdates(objectId);
    };
  }, [objectId, cancelDeerUpdates]);
  
  const characterController = useRef<CharacterController | null>(null);
  
  // Initialize character controller and wolf orientation
  useEffect(() => {
    if (!characterController.current && rapier && world) {
      const controller = world.createCharacterController(0.01) as CharacterController; // Small offset for stability
      controller.enableAutostep(0.5, 0.2, true); // Enable stepping over small obstacles
      controller.enableSnapToGround(0.5); // Snap to ground within 0.5 units
      characterController.current = controller;
    }
    
    // Set initial wolf orientation to match surface normal
    if (rigidBodyRef.current) {
      const surfaceNormal = surfacePosition.clone().normalize();
      
      // Create initial orientation matrix with wolf facing "north" relative to surface
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
      
      // Create rotation matrix and apply to wolf
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
  
  // Movement parameters for wolf behavior
  const MOVEMENT_SPEED = WOLF_CONFIG.movement.moveSpeed.min + Math.random() * 
    (WOLF_CONFIG.movement.moveSpeed.max - WOLF_CONFIG.movement.moveSpeed.min);
  const TARGET_DISTANCE = WOLF_CONFIG.movement.targetDistance;
  const TARGET_UPDATE_INTERVAL = { min: 3000, max: 6000 }; // Longer intervals for wolves
  const IDLE_PROBABILITY = 0.15; // Lower idle probability for more active wolves
  const IDLE_DURATION = WOLF_CONFIG.movement.idleTime;
  
  // Function to find nearby deer for hunting
  const findNearbyDeer = (wolfPosition: THREE.Vector3) => {
    const store = useWorldStore.getState();
    const deerObjects = store.objects.filter(obj => obj.type === 'animals/deer');
    
    let closestDeer = null;
    let closestDistance: number = WOLF_CONFIG.hunting.detectionRadius;
    
    for (const deer of deerObjects) {
      const deerPosition = new THREE.Vector3(...deer.position);
      const distance = wolfPosition.distanceTo(deerPosition);
      
      if (distance < closestDistance) {
        closestDeer = deer;
        closestDistance = distance;
      }
    }
    
    return closestDeer;
  };

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    
    const body = rigidBodyRef.current;
    const currentTime = Date.now();
    
    // Throttle updates to prevent flickering (max 60 FPS)
    const minUpdateInterval = 16.67; // ~60 FPS
    if (currentTime - lastUpdateTime.current < minUpdateInterval) {
      return;
    }
    lastUpdateTime.current = currentTime;
    
    // === CHARACTER CONTROLLER LOGIC ===
    
    // Get current position from physics body (needed for all logic below)
    const currentPos = body.translation();
    const currentPosition = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
    
    // Handle idle state
    if (isIdle) {
      const idleDuration = currentTime - idleStartTime;
      const maxIdleDuration = IDLE_DURATION.min + Math.random() * (IDLE_DURATION.max - IDLE_DURATION.min);
      
      if (idleDuration > maxIdleDuration) {
        setIsIdle(false);
        setTarget(null); // Force new target generation
      }
      
      // Apply bounce decay when idle
      const bounceDecayRate = 5.0; // How quickly bounce fades when idle
      lastMovementSpeed.current = Math.max(0, lastMovementSpeed.current - bounceDecayRate * delta);
      
      // Continue bounce animation with decaying speed
      bouncePhase.current += lastMovementSpeed.current * 8.0 * delta;
      
      // Calculate fading bounce height
      const maxBounceHeight = 0.08;
      const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(lastMovementSpeed.current / MOVEMENT_SPEED, 1.0);
      
      // Apply subtle bounce to wolf position even when idle
      if (Math.abs(bounceHeight) > 0.01) {
        const idealSurfaceDistance = 6.05 + bounceHeight;
        const adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance);
        body.setTranslation(adjustedPosition, true);
      }
      
      // During idle, no movement
      return;
    }
    
    // === HUNTING LOGIC ===
    
    // Handle hunting state
    if (isHunting && huntingTarget) {
      const store = useWorldStore.getState();
      const targetDeer = store.objects.find(obj => obj.id === huntingTarget);
      
      if (targetDeer) {
        const deerPosition = new THREE.Vector3(...targetDeer.position);
        const distanceToDeer = currentPosition.distanceTo(deerPosition);
        
        // Stop hunting if deer is too far away or we've been hunting too long
        const huntingDuration = currentTime - huntingStartTime;
        const maxHuntingTime = 15000; // 15 seconds max hunting time
        
        if (distanceToDeer > WOLF_CONFIG.hunting.chaseRadius || huntingDuration > maxHuntingTime) {
          setIsHunting(false);
          setHuntingTarget(null);
          setTarget(null); // Force new target generation
        } else {
          // Continue hunting - set deer position as target
          setTarget(deerPosition);
        }
      } else {
        // Target deer no longer exists
        setIsHunting(false);
        setHuntingTarget(null);
        setTarget(null);
      }
    }
    
    // Look for nearby deer if not currently hunting
    if (!isHunting) {
      const nearbyDeer = findNearbyDeer(currentPosition);
      
      if (nearbyDeer && Math.random() < WOLF_CONFIG.hunting.huntingProbability) {
        setIsHunting(true);
        setHuntingTarget(nearbyDeer.id);
        setHuntingStartTime(currentTime);
        setTarget(new THREE.Vector3(...nearbyDeer.position));
        setIsIdle(false);
      }
    }
    
    // Check if we need a new target (only if not hunting)
    if (!isHunting) {
      const distanceToTarget = target ? currentPosition.distanceTo(target) : Infinity;
      const timeSinceLastTarget = currentTime - lastTargetTime;
      const maxTargetInterval = TARGET_UPDATE_INTERVAL.min + 
        Math.random() * (TARGET_UPDATE_INTERVAL.max - TARGET_UPDATE_INTERVAL.min);
      
      const needsNewTarget = 
        !target || 
        distanceToTarget < 0.2 || // Close to target
        timeSinceLastTarget > maxTargetInterval; // Time for new target
      
      if (needsNewTarget) {
        // Decide if wolf should idle or move
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
    }
    
    // Move toward target using kinematic movement
    if (target && !isIdle) {
      const direction = target.clone().sub(currentPosition).normalize();
      
      // Get surface normal for surface-parallel movement
      const surfaceNormal = currentPosition.clone().normalize();
      
      // Project movement onto surface (remove component along surface normal)
      const surfaceMovement = direction.clone()
        .sub(surfaceNormal.clone().multiplyScalar(direction.dot(surfaceNormal)))
        .normalize();
      
      // Use hunting speed if hunting, normal speed otherwise
      const currentSpeed = isHunting ? WOLF_CONFIG.hunting.chaseSpeed : MOVEMENT_SPEED;
      
      // Calculate movement for this frame
      const movement = surfaceMovement.multiplyScalar(currentSpeed * delta);
      
      // Update bounce animation based on movement speed
      const currentMovementSpeed = movement.length() / delta;
      lastMovementSpeed.current = currentMovementSpeed;
      
      // Advance bounce phase based on movement speed
      const bounceFrequency = 8.0; // How fast the bounce cycles
      bouncePhase.current += currentMovementSpeed * bounceFrequency * delta;
      
      // Calculate bounce height (small vertical offset)
      const maxBounceHeight = 0.08; // Maximum bounce height
      const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(currentMovementSpeed / currentSpeed, 1.0);
      
      // Calculate target position for this frame
      let targetPosition = currentPosition.clone().add(movement);
      
      // ** BUILDING AND TERRAIN COLLISION DETECTION **
      console.log(`🐺 Wolf ${objectId}: Checking movement from ${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)} to ${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}`);
      
      // Check for collisions (terrain, water, buildings)
      const terrainCollision = terrainCollisionDetector.checkMovement(currentPosition, targetPosition);
      console.log(`🐺 Wolf ${objectId}: Collision result: canMove=${terrainCollision.canMove}, groundHeight=${terrainCollision.groundHeight.toFixed(2)}, isWater=${terrainCollision.isWater}, isBuildingBlocked=${terrainCollision.isBuildingBlocked}`);
      
      // Handle collision detection results
      if (!terrainCollision.canMove) {
        let blockReason = 'Unknown obstacle';
        if (terrainCollision.isBuildingBlocked) {
          blockReason = `Blocked by building (${terrainCollision.blockedByBuilding})`;
        } else if (terrainCollision.isWater) {
          blockReason = 'Blocked by water';
        } else {
          blockReason = 'Blocked by steep slope';
        }
        
        console.log(`🐺 Wolf ${objectId}: Movement blocked - ${blockReason}`);
        
        // For building collisions, generate a new target instead of using adjusted position
        if (terrainCollision.isBuildingBlocked) {
          console.log(`🐺 Wolf ${objectId}: Blocked by building (${terrainCollision.blockedByBuilding}), generating new target`);
          setTarget(null); // Force new target generation
          return; // Skip movement this frame
        } else if (terrainCollision.adjustedPosition) {
          targetPosition = terrainCollision.adjustedPosition;
          console.log(`🐺 Wolf ${objectId}: Using terrain adjusted position`);
        } else {
          // No alternative available, generate new target
          setTarget(null);
          console.log(`🐺 Wolf ${objectId}: Generating new target due to blocked movement`);
          return; // Skip movement this frame
        }
      }
      
      // Ensure wolf stays on surface (handle this here instead of GravityController to avoid conflicts)
      const idealSurfaceDistance = 6.05 + bounceHeight; // Add bounce height to surface distance
      const currentDistance = targetPosition.length();

      // Only correct if significantly off surface to prevent micro-corrections
      if (Math.abs(currentDistance - (6.05 + bounceHeight)) > 0.1) {
        targetPosition = targetPosition.normalize().multiplyScalar(idealSurfaceDistance);
      }
      
      // Calculate actual movement that occurred (for rotation)
      const actualMovement = targetPosition.clone().sub(currentPosition);
      
      // Queue the transform update to prevent multiple simultaneous updates
      queueDeerTransformUpdate(objectId, () => {
        // For kinematic bodies, directly set the new position (single source of truth)
        body.setTranslation(targetPosition, true);
        
        // Rotate wolf to face the direction they actually moved using centralized utility
        if (actualMovement.length() > 0.01) {
          const { positionVec, directionVec, surfaceNormal } = extractMovementVectors(
            currentPosition,
            actualMovement
          );
          
          // Calculate target rotation using centralized utility
          const targetQuaternion = calculateTargetRotation(
            positionVec,
            directionVec,
            surfaceNormal
          );
          
          if (targetQuaternion.length() > 0) {
            // Get current rotation as quaternion
            const currentRotation = body.rotation();
            const currentQuaternion = new THREE.Quaternion(
              currentRotation.x, 
              currentRotation.y, 
              currentRotation.z, 
              currentRotation.w
            );
            
            // Calculate smoothed rotation using centralized utility (faster for hunting)
            const rotationSpeed = isHunting ? 12.0 : 8.0; // Faster rotation when hunting
            const newQuaternion = calculateSmoothedRotation(
              currentQuaternion,
              targetQuaternion,
              delta,
              rotationSpeed
            );
            
            body.setRotation(newQuaternion, true);
          }
        }
      }, 'normal');
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
    
    // Use consistent surface radius to keep wolf on surface
    const targetRadius = 6.05; // Match initial positioning and gravity controller
    return targetDirection.multiplyScalar(targetRadius);
  }
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[surfacePosition.x, surfacePosition.y, surfacePosition.z]}
      type="kinematicPosition" // Kinematic body controlled by character controller
      colliders={false}
      userData={{ isWolf: true, objectId, isMoving: !isIdle && target !== null, isHunting: isHunting }}
    >
      {/* Capsule collider for character controller */}
      <CapsuleCollider 
        args={[0.25, 0.45]} // Slightly larger than deer
        position={[0, 0.25, 0]} // Lower position for better surface adherence
        friction={1.0} // Good friction for walking
        restitution={0.0} // No bounce
      />
      
      {/* Visual wolf model - inherits rotation from RigidBody */}
      <group>
        <Wolf 
          type={type}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[1, 1, 1]}
          selected={false}
          objectId={objectId}
          preview={false}
          canPlace={true}
          disablePositionSync={true}
          isPhysicsControlled={true}
        />
        
        {/* Hunting indicator */}
        {isHunting && (
          <mesh position={[0, 1.4, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="red" />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}

// Temporarily disable memoization to test if it's interfering with animations  
export const WolfPhysics = WolfPhysicsComponent;
"use client";

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { Deer } from '~/components/three/objects/Deer';
import { useWorldStore } from '~/lib/store';
import { calculateTargetRotation, calculateSmoothedRotation, extractMovementVectors } from '~/lib/utils/deer-rotation';
import { useDeerRenderQueue } from '~/lib/utils/render-queue';
import { getTerrainCollisionDetector } from '~/lib/utils/terrain-collision';

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
  
  // Render queue for batching updates and preventing multiple simultaneous re-renders
  const { queueDeerTransformUpdate, cancelDeerUpdates } = useDeerRenderQueue();
  
  // Ensure deer starts on globe surface (globe radius is 6.0)
  const initialPosition = new THREE.Vector3(...position);
  const surfacePosition = initialPosition.normalize().multiplyScalar(6.05); // Place just above surface
  
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const [lastTargetTime, setLastTargetTime] = useState(Date.now());
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(Date.now());

  const [isEating, setIsEating] = useState(false);
  const [eatingStartTime, setEatingStartTime] = useState(0);
  const [eatingGrassId, setEatingGrassId] = useState<string | null>(null);
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
  const MOVEMENT_SPEED = 1.5; // Reduced slightly to reduce potential frame conflicts
  const TARGET_DISTANCE = { min: 0.8, max: 1.5 }; // Distance to wander
  const TARGET_UPDATE_INTERVAL = { min: 2000, max: 4000 }; // Time between targets
  const IDLE_PROBABILITY = 0.2; // Reduced idle probability to see more movement
  const IDLE_DURATION = { min: 1000, max: 3000 }; // Idle time
  
  // Eating parameters
  const GRASS_DETECTION_RADIUS = 0.6; // How close deer needs to be to detect grass
  const EATING_DURATION = 3000; // 3 seconds of eating before grass disappears
  const GRASS_APPROACH_DISTANCE = 0.3; // How close deer gets before eating
  
  // Function to find nearby grass
  const findNearbyGrass = (deerPosition: THREE.Vector3) => {
    const store = useWorldStore.getState();
    const grassObjects = store.objects.filter(obj => obj.type.toLowerCase().includes('grass'));
    
    let closestGrass = null;
    let closestDistance = GRASS_DETECTION_RADIUS;
    
    for (const grass of grassObjects) {
      const grassPosition = new THREE.Vector3(...grass.position);
      const distance = deerPosition.distanceTo(grassPosition);
      
      if (distance < closestDistance) {
        closestGrass = grass;
        closestDistance = distance;
      }
    }
    
    return closestGrass;
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
      
      // Deer should not bounce if idle
      if (Math.abs(bounceHeight) > 0.01) {
        const idealSurfaceDistance = 6.05 + bounceHeight;
        const adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance);
        body.setTranslation(adjustedPosition, true);
      }
      
      // During idle, no movement
      return;
    }
    

    
    // === GRASS EATING LOGIC ===
    
    // Handle eating state
    if (isEating) {
      const eatingDuration = currentTime - eatingStartTime;
      
      // Check if eating is complete (3 seconds)
      if (eatingDuration >= EATING_DURATION) {
        // Remove the grass from the world
        if (eatingGrassId) {
          const store = useWorldStore.getState();
          store.removeObject(eatingGrassId);
          console.log(`🦌 Deer ${objectId}: Finished eating grass ${eatingGrassId}`);
        }
        
        // Stop eating and return to normal behavior
        setIsEating(false);
        setEatingGrassId(null);
        setTarget(null); // Force new target generation
      }
      
      // Apply bounce decay when eating (slower decay than idle)
      const bounceDecayRate = 3.0; // Slower decay while eating
      lastMovementSpeed.current = Math.max(0, lastMovementSpeed.current - bounceDecayRate * delta);
      
      // Continue gentle bounce animation while eating
      bouncePhase.current += lastMovementSpeed.current * 4.0 * delta; // Slower frequency while eating
      
      // Calculate gentle bounce height while eating
      const maxBounceHeight = 0.04; // Smaller bounce while eating
      const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(lastMovementSpeed.current / MOVEMENT_SPEED, 1.0);
      
      // Apply subtle bounce to deer position while eating
      if (Math.abs(bounceHeight) > 0.005) {
        const idealSurfaceDistance = 6.05 + bounceHeight;
        const adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance);
        body.setTranslation(adjustedPosition, true);
      }
      
      // During eating, no movement
      return;
    }
    
    // Look for nearby grass if not currently eating or approaching grass
    const nearbyGrass = findNearbyGrass(currentPosition);
    
    if (nearbyGrass && !isEating) {
      const grassPosition = new THREE.Vector3(...nearbyGrass.position);
      const distanceToGrass = currentPosition.distanceTo(grassPosition);
      
      // If close enough to grass, start eating
      if (distanceToGrass <= GRASS_APPROACH_DISTANCE) {
        console.log(`🦌 Deer ${objectId}: Started eating grass ${nearbyGrass.id}`);
        setIsEating(true);
        setEatingStartTime(currentTime);
        setEatingGrassId(nearbyGrass.id);
        setTarget(null);
        setIsIdle(false);
        return;
      }
      
      // If grass is nearby but not close enough, approach it
      const timeSinceLastTarget = currentTime - lastTargetTime;
      if (timeSinceLastTarget > 500) { // Update target every 500ms when approaching grass
        setTarget(grassPosition);
        setLastTargetTime(currentTime);
        setIsIdle(false);
        console.log(`🦌 Deer ${objectId}: Approaching grass ${nearbyGrass.id}`);
      }
    }
    
    // Check if we need a new target (only if not pursuing grass)
    if (!nearbyGrass) {
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
    }
    
    // Move toward target using simple kinematic movement
    if (target && !isIdle) {
      const direction = target.clone().sub(currentPosition).normalize();
      
      // Get surface normal for surface-parallel movement
      const surfaceNormal = currentPosition.clone().normalize();
      
      // Project movement onto surface (remove component along surface normal)
      const surfaceMovement = direction.clone()
        .sub(surfaceNormal.clone().multiplyScalar(direction.dot(surfaceNormal)))
        .normalize();
      
      // Calculate movement for this frame
      const movement = surfaceMovement.multiplyScalar(MOVEMENT_SPEED * delta);
      
      // Calculate target position for this frame (before collision checking)
      let targetPosition = currentPosition.clone().add(movement);
      
      // ** TERRAIN COLLISION DETECTION **
      const terrainCollision = terrainCollisionDetector.checkMovement(currentPosition, targetPosition);
      
      // If movement is blocked by terrain, handle collision
      if (!terrainCollision.canMove) {
        console.log(`🦌 Deer ${objectId}: Movement blocked by terrain`, {
          isWater: terrainCollision.isWater,
          slopeAngle: (terrainCollision.slopeAngle * 180 / Math.PI).toFixed(1) + '°',
          groundHeight: terrainCollision.groundHeight.toFixed(2)
        });
        
        // Use alternative position if available, otherwise generate new target
        if (terrainCollision.adjustedPosition) {
          targetPosition = terrainCollision.adjustedPosition;
          console.log(`🦌 Deer ${objectId}: Using adjusted position`);
        } else {
          // Generate new target in a different direction
          setTarget(null);
          console.log(`🦌 Deer ${objectId}: Generating new target due to terrain collision`);
          return; // Skip movement this frame
        }
      } else {
        // Use terrain-sampled ground height for accurate positioning
        const terrainGroundHeight = terrainCollision.groundHeight;
        const surfaceNormal = targetPosition.clone().normalize();
        targetPosition = surfaceNormal.multiplyScalar(terrainGroundHeight + 0.05); // Small offset above ground
      }
      
      // Calculate actual movement that occurred (for rotation and bounce animation)
      const actualMovement = targetPosition.clone().sub(currentPosition);
      
      // Update bounce animation based on movement speed
      const currentMovementSpeed = actualMovement.length() / delta;
      lastMovementSpeed.current = currentMovementSpeed;
      
      // Advance bounce phase based on movement speed
      const bounceFrequency = 8.0; // How fast the bounce cycles
      bouncePhase.current += currentMovementSpeed * bounceFrequency * delta;
      
      // Calculate bounce height (small vertical offset)
      const maxBounceHeight = 0.08; // Maximum bounce height
      const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(currentMovementSpeed / MOVEMENT_SPEED, 1.0);
      
      // Apply bounce to final position
      const bounceOffset = targetPosition.clone().normalize().multiplyScalar(bounceHeight);
      targetPosition.add(bounceOffset);
      
      // Queue the transform update to prevent multiple simultaneous updates
      queueDeerTransformUpdate(objectId, () => {
        // For kinematic bodies, directly set the new position (single source of truth)
        body.setTranslation(targetPosition, true);
        
        // Rotate deer to face the direction they actually moved using centralized utility
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
            
            // Calculate smoothed rotation using centralized utility
            const newQuaternion = calculateSmoothedRotation(
              currentQuaternion,
              targetQuaternion,
              delta
            );
            
            body.setRotation(newQuaternion, true);
          }
        }
      }, 'normal');
    }
  });
  
  /**
   * Generate a random wandering target on the globe surface
   * Now includes terrain collision checking to avoid impassable areas
   */
  function generateWanderingTarget(currentPos: THREE.Vector3): THREE.Vector3 | null {
    const maxAttempts = 16; // Try multiple directions to find valid target
    
    const baseDistance = TARGET_DISTANCE.min + Math.random() * (TARGET_DISTANCE.max - TARGET_DISTANCE.min);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random direction and distance for wandering
      const angle = Math.random() * Math.PI * 2;
      const distance = baseDistance * (attempt > maxAttempts / 2 ? 0.7 : 1.0); // Reduce distance for later attempts
      
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
      const candidateTarget = targetDirection.multiplyScalar(targetRadius);
      
      // Check if this target is reachable (not blocked by terrain)
      const terrainCollision = terrainCollisionDetector.checkMovement(currentPos, candidateTarget);
      
      if (terrainCollision.canMove) {
        console.log(`🦌 Deer ${objectId}: Found valid target after ${attempt + 1} attempts`);
        return candidateTarget;
      }
    }
    
    console.log(`🦌 Deer ${objectId}: Could not find valid wandering target after ${maxAttempts} attempts`);
    return null; // No valid target found, deer will idle
  }
  
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[surfacePosition.x, surfacePosition.y, surfacePosition.z]}
      type="kinematicPosition" // Kinematic body controlled by character controller
      colliders={false}

      userData={{ isDeer: true, objectId, isMoving: !isIdle && target !== null, isEating: isEating }}

    >
      {/* Capsule collider for character controller */}
      <CapsuleCollider 
        args={[0.2, 0.4]} // Smaller collider for better surface contact
        position={[0, 0.2, 0]} // Lower position for better surface adherence
        friction={1.0} // Good friction for walking
        restitution={0.0} // No bounce
      />
      
      {/* Visual deer model - inherits rotation from RigidBody */}

      <group>
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
        
        {/* Eating indicator */}
        {isEating && (
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="green" />
          </mesh>
        )}
      </group>

    </RigidBody>
  );
}
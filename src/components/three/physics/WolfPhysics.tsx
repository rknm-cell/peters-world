"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { Wolf } from '~/components/three/objects/Wolf';
import { useWorldStore, useIsUserInteractingOptimized, useRemoveObject, useGrassObjectsOnly, useTreeObjectsOnly, useAnimalObjectsOnly } from '~/lib/store';
import { WOLF_CONFIG } from '~/lib/constants';
import { calculateTargetRotation, calculateSmoothedRotation, extractMovementVectors } from '~/lib/utils/deer-rotation';
import { useDeerRenderQueue } from '~/lib/utils/render-queue';
import { getTerrainCollisionDetector } from '~/lib/utils/terrain-collision';
import { enhancedPathfinder } from '~/lib/utils/enhanced-pathfinding';
import { terrainHeightMapGenerator } from '~/components/debug/TerrainHeightMap';
import { COLLISION_GROUPS, COLLISION_INTERACTIONS } from '~/lib/constants';

// Type for debug window functions
interface DebugWindow extends Window {
  updateWolfDebug?: (wolfId: string, data: {
    position?: THREE.Vector3;
    target?: THREE.Vector3 | null;
    state?: string;
    lastDecision?: string;
    collisionPoints?: THREE.Vector3[];
  }) => void;
}

interface WolfPhysicsProps {
  objectId: string;
  position: [number, number, number];
  type: string;
  // Removed selected prop - will get it from store internally
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
 * WolfPhysics - Physics-enabled wolf with realistic movement, surface adhesion, and deer-hunting behavior
 * Uses Rapier physics for natural movement, collision detection, and hunting behavior
 * Mirrors DeerPhysics architecture exactly for consistent behavior
 */
function WolfPhysicsComponent({ objectId, position, type }: WolfPhysicsProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  
  // Use optimized hooks to prevent unnecessary rerenders
  const isUserInteracting = useIsUserInteractingOptimized();
  
  // Use stable action selectors that won't cause rerenders
  const removeObject = useRemoveObject();
  
  // Use ultra-optimized category-specific hooks to prevent rerenders from irrelevant object changes
  const grassObjects = useGrassObjectsOnly();
  const treeObjects = useTreeObjectsOnly();
  const otherAnimals = useAnimalObjectsOnly();
  
  // Filter out this animal from the other animals list to prevent self-reference
  const otherAnimalsFiltered = React.useMemo(() => 
    otherAnimals.filter(animal => animal.id !== objectId), 
    [otherAnimals, objectId]
  );
  
  // Combine relevant objects for pathfinding and behavior
  const relevantObjects = React.useMemo(() => [
    ...grassObjects,
    ...treeObjects,
    ...otherAnimalsFiltered
  ], [grassObjects, treeObjects, otherAnimalsFiltered]);
  
  // Selection is handled externally - wolves don't need to know about selection state
  // This prevents re-renders when selection changes elsewhere in the app
  
  // Render queue for batching updates and preventing multiple simultaneous re-renders
  const { queueDeerTransformUpdate, cancelDeerUpdates } = useDeerRenderQueue(isUserInteracting);
  
  // Ensure wolf starts on globe surface (globe radius is 6.0)
  const initialPosition = new THREE.Vector3(...position);
  const surfacePosition = initialPosition.normalize().multiplyScalar(6.05); // Place just above surface
  
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(Date.now());

  const [isHunting, setIsHunting] = useState(false);
  const [huntingStartTime, setHuntingStartTime] = useState(0);
  const [huntingTargetId, setHuntingTargetId] = useState<string | null>(null);
  const [huntingOrientation, setHuntingOrientation] = useState<THREE.Quaternion | null>(null);
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
      console.log('🐺 Character controller initialized for wolf', objectId);
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
  
  // Movement parameters for wolf behavior (using WOLF_CONFIG like deer use their params)
  const MOVEMENT_SPEED = WOLF_CONFIG.movement.moveSpeed.min + Math.random() * 
    (WOLF_CONFIG.movement.moveSpeed.max - WOLF_CONFIG.movement.moveSpeed.min);
  const TARGET_DISTANCE = WOLF_CONFIG.movement.targetDistance;
  const TARGET_REACHED_THRESHOLD = 0.3; // How close wolf needs to be to consider target reached
  const IDLE_PROBABILITY = 0.2; // Lower than deer for more active hunting behavior
  const IDLE_DURATION = WOLF_CONFIG.movement.idleTime;
  
  // Hunting parameters
  const DEER_DETECTION_RADIUS = WOLF_CONFIG.hunting.detectionRadius;
  const HUNTING_DURATION = 15000; // 15 seconds of hunting before giving up
  const DEER_APPROACH_DISTANCE = 0.5; // How close wolf gets before "catching" deer
  
  // Function to find nearby deer for hunting
  const findNearbyDeer = (wolfPosition: THREE.Vector3) => {
    const deerObjects = otherAnimalsFiltered.filter(obj => obj.type === 'animals/deer');
    
    let closestDeer = null;
    let closestDistance: number = DEER_DETECTION_RADIUS;
    
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
    
    // Staggered update system to prevent synchronized twitching
    // Each wolf gets a unique update offset based on their objectId
    const updateOffset = parseInt(objectId.slice(-2), 36) % 8; // 0-8ms offset
    const minUpdateInterval = 16.67; // ~60 FPS base interval
    const staggeredInterval = minUpdateInterval + updateOffset;
    
    if (currentTime - lastUpdateTime.current < staggeredInterval) {
      return;
    }
    lastUpdateTime.current = currentTime;
    
    // === CHARACTER CONTROLLER LOGIC ===
    
    // Get current position from physics body (needed for all logic below)
    const currentPos = body.translation();
    const currentPosition = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
    
    // Report debug state
    const debugWindow = window as DebugWindow;
    if (debugWindow.updateWolfDebug) {
      const distanceToTarget = target ? currentPosition.distanceTo(target) : 0;
      let decision = 'Seeking target';
      
      if (isHunting) {
        decision = `Hunting deer`;
      } else if (isIdle) {
        decision = `Idle for ${((currentTime - idleStartTime) / 1000).toFixed(1)}s`;
      } else if (target) {
        decision = `Traveling (${distanceToTarget.toFixed(1)}m to go)`;
      }
      
      debugWindow.updateWolfDebug(objectId, {
        position: currentPosition,
        target: target,
        state: isHunting ? 'hunting' : isIdle ? 'idle' : 'moving',
        lastDecision: decision
      });
    }
    
    // Handle idle state (exactly like deer)
    if (isIdle) {
      const idleDuration = currentTime - idleStartTime;
      const maxIdleDuration = IDLE_DURATION.min + Math.random() * (IDLE_DURATION.max - IDLE_DURATION.min);
      
      if (idleDuration > maxIdleDuration) {
        setIsIdle(false);
        setTarget(null); // Force new target generation
      }
      
      // Reset movement speed when entering idle to stop any residual bounce
      lastMovementSpeed.current = 0;
      
      // === SURFACE ALIGNMENT MAINTENANCE DURING IDLE ===
      // Prevent orientation drift by maintaining surface-relative alignment
      
      const surfaceNormal = currentPosition.clone().normalize();
      const currentRotation = body.rotation();
      const currentQuaternion = new THREE.Quaternion(
        currentRotation.x, 
        currentRotation.y, 
        currentRotation.z, 
        currentRotation.w
      );
      
      // Calculate what the correct surface-aligned orientation should be
      // Use a default forward direction (wolf facing "north" relative to surface)
      const worldUp = new THREE.Vector3(0, 1, 0);
      const localForward = worldUp.clone()
        .sub(surfaceNormal.clone().multiplyScalar(worldUp.dot(surfaceNormal)))
        .normalize();
      
      // If forward vector is too small (e.g., at poles), use alternative direction
      if (localForward.length() < 0.1) {
        const worldForward = new THREE.Vector3(1, 0, 0);
        localForward.copy(worldForward)
          .sub(surfaceNormal.clone().multiplyScalar(worldForward.dot(surfaceNormal)))
          .normalize();
      }
      
      // Calculate target surface-aligned rotation using existing utilities
      const targetQuaternion = calculateTargetRotation(
        currentPosition,
        localForward, // Default forward direction for idle wolf
        surfaceNormal
      );
      
      // Check how far we've drifted from proper surface alignment
      const orientationDifference = currentQuaternion.angleTo(targetQuaternion);
      const ORIENTATION_DRIFT_THRESHOLD = 0.1; // ~6 degrees - only correct if significantly misaligned
      
      // Skip orientation corrections during user interactions to prevent jittering
      if (orientationDifference > ORIENTATION_DRIFT_THRESHOLD && !isUserInteracting) {
        // Gradually correct orientation drift during idle
        // Use slower correction speed to avoid jittery movement
        const IDLE_CORRECTION_SPEED = 0.5; // Slower than normal movement rotation
        const correctedQuaternion = calculateSmoothedRotation(
          currentQuaternion,
          targetQuaternion,
          delta,
          IDLE_CORRECTION_SPEED
        );
        
        // Apply the corrected orientation with micro-stagger to prevent sync
        queueDeerTransformUpdate(`${objectId}-idle-orient`, () => {
          body.setRotation(correctedQuaternion, true);
        }, 'low'); // Low priority since this is just orientation maintenance
        
        // Debug logging (can be removed later)
        if (orientationDifference > 0.2) { // Only log significant corrections
          console.log(`🐺 Wolf ${objectId}: Correcting orientation drift (${(orientationDifference * 180 / Math.PI).toFixed(1)}°)`);
        }
      }
      
      // During idle, no movement but orientation is maintained
      return;
    }
    
    // === DEER HUNTING LOGIC ===
    
    // Handle hunting state
    if (isHunting) {
      const huntingDuration = currentTime - huntingStartTime;
      
      // Check if hunting is complete (15 seconds) or deer no longer exists
      if (huntingDuration >= HUNTING_DURATION) {
        // Stop hunting and return to normal behavior
        setIsHunting(false);
        setHuntingTargetId(null);
        setHuntingOrientation(null);
        setTarget(null); // Force new target generation
        console.log(`🐺 Wolf ${objectId}: Hunting timeout, returning to wandering`);
      } else if (huntingTargetId) {
        // Check if target deer still exists
        const store = useWorldStore.getState();
        const targetDeer = store.objects.find(obj => obj.id === huntingTargetId);
        
        if (targetDeer) {
          const deerPosition = new THREE.Vector3(...targetDeer.position);
          const distanceToDeer = currentPosition.distanceTo(deerPosition);
          
          // If close enough to deer, "catch" it (stop hunting)
          if (distanceToDeer <= DEER_APPROACH_DISTANCE) {
            setIsHunting(false);
            setHuntingTargetId(null);
            setHuntingOrientation(null);
            setTarget(null);
            setIsIdle(true);
            setIdleStartTime(currentTime);
            console.log(`🐺 Wolf ${objectId}: Caught deer, resting`);
            return;
          }
          
          // Continue hunting - set deer position as target
          setTarget(deerPosition);
        } else {
          // Target deer no longer exists
          setIsHunting(false);
          setHuntingTargetId(null);
          setHuntingOrientation(null);
          setTarget(null);
          console.log(`🐺 Wolf ${objectId}: Target deer disappeared`);
        }
      }
      
      // === SURFACE ALIGNMENT MAINTENANCE DURING HUNTING ===
      // Similar to deer eating behavior - maintain orientation while hunting
      
      const surfaceNormal = currentPosition.clone().normalize();
      const currentRotation = body.rotation();
      const currentQuaternion = new THREE.Quaternion(
        currentRotation.x, 
        currentRotation.y, 
        currentRotation.z, 
        currentRotation.w
      );
      
      // Use the captured orientation from when hunting started, or fallback to default
      let targetQuaternion: THREE.Quaternion;
      
      if (huntingOrientation) {
        // Maintain the exact orientation the wolf had when it started hunting
        targetQuaternion = huntingOrientation.clone();
      } else {
        // Fallback: Calculate surface-aligned orientation
        const worldUp = new THREE.Vector3(0, 1, 0);
        const localForward = worldUp.clone()
          .cross(surfaceNormal)
          .normalize();
        
        // Handle edge case where surface normal is parallel to world up
        if (localForward.length() < 0.1) {
          localForward.set(1, 0, 0)
            .cross(surfaceNormal)
            .normalize();
        }
        
        targetQuaternion = calculateTargetRotation(
          currentPosition,
          localForward,
          surfaceNormal
        );
      }
      
      // Check how far we've drifted from proper surface alignment
      const orientationDifference = currentQuaternion.angleTo(targetQuaternion);
      const ORIENTATION_DRIFT_THRESHOLD = 0.1;
      
      // Skip orientation corrections during user interactions to prevent jittering
      if (orientationDifference > ORIENTATION_DRIFT_THRESHOLD && !isUserInteracting) {
        const HUNTING_CORRECTION_SPEED = 0.3; // Even slower than idle to be gentle
        const correctedQuaternion = calculateSmoothedRotation(
          currentQuaternion,
          targetQuaternion,
          delta,
          HUNTING_CORRECTION_SPEED
        );
        
        queueDeerTransformUpdate(objectId, () => {
          body.setRotation(correctedQuaternion, true);
        }, 'low');
        
        if (orientationDifference > 0.2) {
          const orientationType = huntingOrientation ? "captured" : "default";
          console.log(`🐺 Wolf ${objectId}: Correcting orientation drift while hunting using ${orientationType} orientation (${(orientationDifference * 180 / Math.PI).toFixed(1)}°)`);
        }
      }
      
      // During hunting, movement continues below (unlike eating deer which return here)
    }
    
    // Look for nearby deer if not currently hunting
    const nearbyDeer = findNearbyDeer(currentPosition);
    
    if (nearbyDeer && !isHunting && Math.random() < WOLF_CONFIG.hunting.huntingProbability) {
      const deerPosition = new THREE.Vector3(...nearbyDeer.position);
      const distanceToDeer = currentPosition.distanceTo(deerPosition);
      
      // Start hunting if deer is within detection range
      if (distanceToDeer <= DEER_DETECTION_RADIUS) {
        // Capture current orientation to maintain during hunting
        const currentRotation = body.rotation();
        const capturedOrientation = new THREE.Quaternion(
          currentRotation.x,
          currentRotation.y,
          currentRotation.z,
          currentRotation.w
        );
        
        setIsHunting(true);
        setHuntingStartTime(currentTime);
        setHuntingTargetId(nearbyDeer.id);
        setHuntingOrientation(capturedOrientation);
        setTarget(deerPosition);
        setIsIdle(false);
        console.log(`🐺 Wolf ${objectId}: Starting to hunt deer at distance ${distanceToDeer.toFixed(2)}`);
      }
    }
    
    // Check if we need a new target (only if not hunting specific deer)
    if (!isHunting || !huntingTargetId) {
      const distanceToTarget = target ? currentPosition.distanceTo(target) : Infinity;
      
      // Only generate new target when:
      // 1. No target exists
      // 2. Target has been reached (within threshold)
      const targetReached = distanceToTarget < TARGET_REACHED_THRESHOLD;
      const needsNewTarget = !target || targetReached;
      
      if (needsNewTarget) {
        // If we just reached a target, decide whether to idle or continue moving
        if (targetReached && target) {
          console.log(`🐺 Wolf ${objectId}: Reached target at distance ${distanceToTarget.toFixed(2)}`);
          
          // Decide if wolf should idle or move to new location
          if (Math.random() < IDLE_PROBABILITY) {
            setIsIdle(true);
            setIdleStartTime(currentTime);
            setTarget(null);
            console.log(`🐺 Wolf ${objectId}: Starting idle period`);
            return;
          }
        }
        
        // Generate new wandering target
        const newTarget = generateWanderingTarget(currentPosition);
        if (newTarget) {
          setTarget(newTarget);
          console.log(`🐺 Wolf ${objectId}: New target set at distance ${currentPosition.distanceTo(newTarget).toFixed(2)}`);
        }
      }
    }
    
    // Move toward target using kinematic movement (exactly like deer)
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
      
      // Calculate target position for this frame (before collision checking)
      let targetPosition = currentPosition.clone().add(movement);
      
      // ** ENHANCED TERRAIN COLLISION DETECTION ** (exactly like deer)
      console.log(`🐺 Wolf ${objectId}: Checking movement from ${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)} to ${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}`);
      
      // Use traditional collision detection with physics data (most reliable)
      const terrainCollision = terrainCollisionDetector.checkMovement(currentPosition, targetPosition);
      console.log(`🐺 Wolf ${objectId}: Collision result: canMove=${terrainCollision.canMove}, groundHeight=${terrainCollision.groundHeight.toFixed(2)}, isWater=${terrainCollision.isWater}`);
      
      let enhancedValidation = null;
      
      // Only use enhanced pathfinding for additional validation if traditional collision fails
      if (!terrainCollision.canMove) {
        enhancedValidation = enhancedPathfinder.validatePath(
          currentPosition,
          targetPosition,
          {
            maxSlopeAngle: Math.PI / 3, // 60 degrees
            avoidWater: true,
            samples: 3, // Quick validation for real-time movement
            useHeightMap: true,
            useNormalMap: false, // Disable normal map to reduce complexity
            generateAlternatives: true // Generate alternatives if path is blocked
          }
        );
        console.log(`🐺 Wolf ${objectId}: Enhanced validation result: isValid=${enhancedValidation.isValid}, confidence=${(enhancedValidation.confidence * 100).toFixed(1)}%`);
      }
      
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
        
        console.log(`🐺 Wolf ${objectId}: Traditional collision detection blocked movement`, {
          reason: blockReason,
          isWater: terrainCollision.isWater,
          isBuildingBlocked: terrainCollision.isBuildingBlocked,
          blockedByBuilding: terrainCollision.blockedByBuilding,
          slopeAngle: (terrainCollision.slopeAngle * 180 / Math.PI).toFixed(1) + '°',
          groundHeight: terrainCollision.groundHeight.toFixed(2)
        });
        
        // Report collision to debug system
        const debugWin = window as DebugWindow;
        if (debugWin.updateWolfDebug) {
          debugWin.updateWolfDebug(objectId, {
            lastDecision: blockReason,
            collisionPoints: [targetPosition]
          });
        }
        
        // For building collisions, generate a new target instead of using adjusted position
        if (terrainCollision.isBuildingBlocked) {
          console.log(`🐺 Wolf ${objectId}: Blocked by building (${terrainCollision.blockedByBuilding}), generating new target`);
          setTarget(null); // Force new target generation
          return; // Skip movement this frame
        } else if (enhancedValidation?.alternativePath && enhancedValidation.alternativePath.length > 0) {
          targetPosition = enhancedValidation.alternativePath[0]!;
          console.log(`🐺 Wolf ${objectId}: Using enhanced alternative path point`);
        } else if (terrainCollision.adjustedPosition) {
          targetPosition = terrainCollision.adjustedPosition;
          console.log(`🐺 Wolf ${objectId}: Using traditional adjusted position`);
        } else {
          // No alternative available, generate new target
          setTarget(null);
          console.log(`🐺 Wolf ${objectId}: Generating new target due to blocked movement`);
          return; // Skip movement this frame
        }
      } else {
        // Traditional collision detection passed, use accurate terrain height
        const terrainGroundHeight = terrainCollision.groundHeight;
        const surfaceNormal = targetPosition.clone().normalize();
        targetPosition = surfaceNormal.multiplyScalar(terrainGroundHeight);
        console.log(`🐺 Wolf ${objectId}: Movement allowed, positioning at height ${terrainGroundHeight.toFixed(2)}`);
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
      const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(currentMovementSpeed / currentSpeed, 1.0);
      
      // Apply bounce to final position
      const bounceOffset = targetPosition.clone().normalize().multiplyScalar(bounceHeight);
      targetPosition.add(bounceOffset);
      
      // Queue the transform update to prevent multiple simultaneous updates
      // Use direct mutation for physics updates (R3F best practice 2024)
      queueDeerTransformUpdate(`${objectId}-movement`, () => {
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
   * Enhanced with height map and multi-method terrain validation (exactly like deer)
   */
  function generateWanderingTarget(currentPos: THREE.Vector3): THREE.Vector3 | null {
    const maxAttempts = 20; // Increased attempts for enhanced validation
    
    const baseDistance = TARGET_DISTANCE.min + Math.random() * (TARGET_DISTANCE.max - TARGET_DISTANCE.min);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random direction and distance for wandering
      const angle = Math.random() * Math.PI * 2;
      const distance = baseDistance * (attempt > maxAttempts / 2 ? 0.6 : 1.0); // Reduce distance for later attempts
      
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
      
      // Use height map to get accurate terrain height at target location
      let targetRadius = 6.05; // Default surface radius
      const terrainHeight = terrainHeightMapGenerator.sampleHeight(targetDirection.clone().multiplyScalar(6.0));
      if (terrainHeight !== null && terrainHeight > 5.0) {
        targetRadius = terrainHeight + 0.05; // Small offset above terrain
      }
      
      const candidateTarget = targetDirection.multiplyScalar(targetRadius);
      
      // Use enhanced pathfinding for comprehensive validation
      const pathValidation = enhancedPathfinder.validatePath(
        currentPos,
        candidateTarget,
        {
          maxSlopeAngle: Math.PI / 3, // 60 degrees - wolves can climb moderate slopes
          avoidWater: true,
          samples: 8, // Fewer samples for performance during target generation
          useHeightMap: true,
          useNormalMap: true,
          generateAlternatives: false // Don't need alternatives during target generation
        }
      );
      
      if (pathValidation.isValid && pathValidation.confidence > 0.6) {
        console.log(`🐺 Wolf ${objectId}: Enhanced pathfinding found valid target after ${attempt + 1} attempts (confidence: ${(pathValidation.confidence * 100).toFixed(1)}%)`);
        return candidateTarget;
      } else if (pathValidation.confidence > 0.3) {
        // If path has moderate confidence but isn't fully valid, try traditional collision detection as fallback
        const terrainCollision = terrainCollisionDetector.checkMovement(currentPos, candidateTarget);
        if (terrainCollision.canMove) {
          console.log(`🐺 Wolf ${objectId}: Fallback collision detection found target after ${attempt + 1} attempts`);
          return candidateTarget;
        }
      }
      
      // Log why this target was rejected for debugging
      if (attempt % 5 === 0) { // Log every 5th attempt to avoid spam
        console.log(`🐺 Wolf ${objectId}: Target attempt ${attempt + 1} rejected - ${pathValidation.reason ?? 'Unknown reason'} (confidence: ${(pathValidation.confidence * 100).toFixed(1)}%)`);
      }
    }
    
    console.log(`🐺 Wolf ${objectId}: Could not find valid wandering target after ${maxAttempts} attempts`);
    return null; // No valid target found, wolf will idle
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
        args={[0.25, 0.5]} // Slightly larger than deer for wolf
        position={[0, 0.25, 0]} // Center the collider vertically
        friction={1.0} // Good friction for walking
        restitution={0.0} // No bounce
        collisionGroups={COLLISION_GROUPS.ANIMALS}
        solverGroups={COLLISION_INTERACTIONS.ANIMALS}
      />
      
      {/* Visual wolf model - inherits rotation from RigidBody */}
      <group>
        <Wolf 
          type={type}
          position={[0, 0, 0]}
          scale={[1, 1, 1]}
          objectId={objectId}
          preview={false}
          canPlace={true}
          disablePositionSync={true}
          isPhysicsControlled={true}
        />
        
        {/* Hunting indicator */}
        {isHunting && (
          <mesh position={[0, 1.4, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="red" />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}

// Smart memoization that prevents unnecessary re-renders while preserving useFrame
export const WolfPhysics = React.memo(WolfPhysicsComponent, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.objectId === nextProps.objectId &&
    prevProps.type === nextProps.type &&
    prevProps.position[0] === nextProps.position[0] &&
    prevProps.position[1] === nextProps.position[1] &&
    prevProps.position[2] === nextProps.position[2]
  );
});
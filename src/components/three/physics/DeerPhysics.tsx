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
import { enhancedPathfinder } from '~/lib/utils/enhanced-pathfinding';
import { terrainHeightMapGenerator } from '~/components/debug/TerrainHeightMap';


// Type for debug window functions
interface DebugWindow extends Window {
  updateDeerDebug?: (deerId: string, data: {
    position?: THREE.Vector3;
    target?: THREE.Vector3 | null;
    state?: string;
    lastDecision?: string;
    collisionPoints?: THREE.Vector3[];
  }) => void;
}

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
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(Date.now());

  const [isEating, setIsEating] = useState(false);
  const [eatingStartTime, setEatingStartTime] = useState(0);
  const [eatingGrassId, setEatingGrassId] = useState<string | null>(null);
  const [eatingOrientation, setEatingOrientation] = useState<THREE.Quaternion | null>(null);
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
  const TARGET_DISTANCE = { min: 2.0, max: 4.0 }; // Increased distance for longer journeys
  const TARGET_REACHED_THRESHOLD = 0.3; // How close deer needs to be to consider target reached
  const IDLE_PROBABILITY = 0.3; // Chance to idle after reaching target
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
    
    // Report debug state
    const debugWindow = window as DebugWindow;
    if (debugWindow.updateDeerDebug) {
      const distanceToTarget = target ? currentPosition.distanceTo(target) : 0;
      let decision = 'Seeking target';
      
      if (isEating) {
        decision = `Eating grass`;
      } else if (isIdle) {
        decision = `Idle for ${((currentTime - idleStartTime) / 1000).toFixed(1)}s`;
      } else if (target) {
        decision = `Traveling (${distanceToTarget.toFixed(1)}m to go)`;
      }
      
      debugWindow.updateDeerDebug(objectId, {
        position: currentPosition,
        target: target,
        state: isEating ? 'eating' : isIdle ? 'idle' : 'moving',
        lastDecision: decision
      });
    }
    
    // Handle idle state
    if (isIdle) {
      const idleDuration = currentTime - idleStartTime;
      const maxIdleDuration = IDLE_DURATION.min + Math.random() * (IDLE_DURATION.max - IDLE_DURATION.min);
      
      if (idleDuration > maxIdleDuration) {
        setIsIdle(false);
        setTarget(null); // Force new target generation
      }
      
      // DISABLED: Bounce animation during idle to preserve orientation
      // Previously this modified position which could interfere with surface alignment
      // Apply bounce decay when idle
      // const bounceDecayRate = 5.0; // How quickly bounce fades when idle
      // lastMovementSpeed.current = Math.max(0, lastMovementSpeed.current - bounceDecayRate * delta);
      
      // Continue bounce animation with decaying speed
      // bouncePhase.current += lastMovementSpeed.current * 8.0 * delta;
      
      // Calculate fading bounce height
      // const maxBounceHeight = 0.08;
      // const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(lastMovementSpeed.current / MOVEMENT_SPEED, 1.0);
      
      // Deer should not bounce if idle - DISABLED to preserve surface alignment
      // if (Math.abs(bounceHeight) > 0.01) {
      //   const idealSurfaceDistance = 6.05 + bounceHeight;
      //   const adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance);
      //   body.setTranslation(adjustedPosition, true);
      // }
      
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
      // Use a default forward direction (deer facing "north" relative to surface)
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
        localForward, // Default forward direction for idle deer
        surfaceNormal
      );
      
      // Check how far we've drifted from proper surface alignment
      const orientationDifference = currentQuaternion.angleTo(targetQuaternion);
      const ORIENTATION_DRIFT_THRESHOLD = 0.1; // ~6 degrees - only correct if significantly misaligned
      
      if (orientationDifference > ORIENTATION_DRIFT_THRESHOLD) {
        // Gradually correct orientation drift during idle
        // Use slower correction speed to avoid jittery movement
        const IDLE_CORRECTION_SPEED = 0.5; // Slower than normal movement rotation
        const correctedQuaternion = calculateSmoothedRotation(
          currentQuaternion,
          targetQuaternion,
          delta * IDLE_CORRECTION_SPEED
        );
        
        // Apply the corrected orientation
        queueDeerTransformUpdate(objectId, () => {
          body.setRotation(correctedQuaternion, true);
        }, 'low'); // Low priority since this is just orientation maintenance
        
        // Debug logging (can be removed later)
        if (orientationDifference > 0.2) { // Only log significant corrections
          console.log(`🦌 Deer ${objectId}: Correcting orientation drift (${(orientationDifference * 180 / Math.PI).toFixed(1)}°)`);
        }
      }
      
      // During idle, no movement but orientation is maintained
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
        }
        
        // Stop eating and return to normal behavior
        setIsEating(false);
        setEatingGrassId(null);
        setEatingOrientation(null);
        setTarget(null); // Force new target generation
      }
      
      // DISABLED: Bounce animation during eating to preserve orientation
      // Previously this modified position which could interfere with surface alignment
      // Apply bounce decay when eating (slower decay than idle)
      // const bounceDecayRate = 3.0; // Slower decay while eating
      // lastMovementSpeed.current = Math.max(0, lastMovementSpeed.current - bounceDecayRate * delta);
      
      // Continue gentle bounce animation while eating
      // bouncePhase.current += lastMovementSpeed.current * 4.0 * delta; // Slower frequency while eating
      
      // Calculate gentle bounce height while eating
      // const maxBounceHeight = 0.04; // Smaller bounce while eating
      // const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(lastMovementSpeed.current / MOVEMENT_SPEED, 1.0);
      
      // Apply subtle bounce to deer position while eating - DISABLED to preserve surface alignment
      // if (Math.abs(bounceHeight) > 0.005) {
      //   const idealSurfaceDistance = 6.05 + bounceHeight;
      //   const adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance);
      //   body.setTranslation(adjustedPosition, true);
      // }
      
      // Reset movement speed when eating to stop any residual bounce
      lastMovementSpeed.current = 0;
      
      // === SURFACE ALIGNMENT MAINTENANCE DURING EATING ===
      // Prevent orientation drift while eating by maintaining the captured eating orientation
      
      const surfaceNormal = currentPosition.clone().normalize();
      const currentRotation = body.rotation();
      const currentQuaternion = new THREE.Quaternion(
        currentRotation.x, 
        currentRotation.y, 
        currentRotation.z, 
        currentRotation.w
      );
      
      // Use the captured orientation from when eating started, or fallback to default
      let targetQuaternion: THREE.Quaternion;
      
      if (eatingOrientation) {
        // Maintain the exact orientation the deer had when it started eating
        targetQuaternion = eatingOrientation.clone();
      } else {
        // Fallback: Calculate what the correct surface-aligned orientation should be
        // Use a default forward direction (deer facing "north" relative to surface)
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
        
        // Calculate target surface-aligned rotation using existing utilities
        targetQuaternion = calculateTargetRotation(
          currentPosition,
          localForward, // Default forward direction for eating deer
          surfaceNormal
        );
      }
      
      // Check how far we've drifted from proper surface alignment
      const orientationDifference = currentQuaternion.angleTo(targetQuaternion);
      const ORIENTATION_DRIFT_THRESHOLD = 0.1; // ~6 degrees - only correct if significantly misaligned
      
      if (orientationDifference > ORIENTATION_DRIFT_THRESHOLD) {
        // Gradually correct orientation drift during eating
        // Use slower correction speed to avoid disturbing the eating animation
        const EATING_CORRECTION_SPEED = 0.3; // Even slower than idle to be gentle
        const correctedQuaternion = calculateSmoothedRotation(
          currentQuaternion,
          targetQuaternion,
          delta * EATING_CORRECTION_SPEED
        );
        
        // Apply the corrected orientation
        queueDeerTransformUpdate(objectId, () => {
          body.setRotation(correctedQuaternion, true);
        }, 'low'); // Low priority since this is just orientation maintenance
        
        // Debug logging (can be removed later)
        if (orientationDifference > 0.2) { // Only log significant corrections
          const orientationType = eatingOrientation ? "captured" : "default";
          console.log(`🦌 Deer ${objectId}: Correcting orientation drift while eating using ${orientationType} orientation (${(orientationDifference * 180 / Math.PI).toFixed(1)}°)`);
        }
      }
      
      // During eating, no movement but orientation is maintained
      return;
    }
    
    // Look for nearby grass if not currently eating or approaching grass
    const nearbyGrass = findNearbyGrass(currentPosition);
    
    if (nearbyGrass && !isEating) {
      const grassPosition = new THREE.Vector3(...nearbyGrass.position);
      const distanceToGrass = currentPosition.distanceTo(grassPosition);
      
      // If close enough to grass, start eating
      if (distanceToGrass <= GRASS_APPROACH_DISTANCE) {
        // Capture current orientation to maintain during eating
        const currentRotation = body.rotation();
        const capturedOrientation = new THREE.Quaternion(
          currentRotation.x,
          currentRotation.y,
          currentRotation.z,
          currentRotation.w
        );
        
        setIsEating(true);
        setEatingStartTime(currentTime);
        setEatingGrassId(nearbyGrass.id);
        setEatingOrientation(capturedOrientation);
        setTarget(null);
        setIsIdle(false);
        console.log(`🦌 Deer ${objectId}: Starting to eat grass`);
        return;
      }
      
      // If grass is nearby but not close enough, set it as target (only if not already targeting it)
      const targetingGrass = target && target.distanceTo(grassPosition) < 0.1;
      if (!targetingGrass) {
        setTarget(grassPosition);
        setIsIdle(false);
        console.log(`🦌 Deer ${objectId}: Found grass, moving to eat it`);
      }
    }
    
    // Check if we need a new target (only if not pursuing grass)
    if (!nearbyGrass) {
      const distanceToTarget = target ? currentPosition.distanceTo(target) : Infinity;
      
      // Only generate new target when:
      // 1. No target exists
      // 2. Target has been reached (within threshold)
      const targetReached = distanceToTarget < TARGET_REACHED_THRESHOLD;
      const needsNewTarget = !target || targetReached;
      
      if (needsNewTarget) {
        // If we just reached a target, decide whether to idle or continue moving
        if (targetReached && target) {
          console.log(`🦌 Deer ${objectId}: Reached target at distance ${distanceToTarget.toFixed(2)}`);
          
          // Decide if deer should idle or move to new location
          if (Math.random() < IDLE_PROBABILITY) {
            setIsIdle(true);
            setIdleStartTime(currentTime);
            setTarget(null);
            console.log(`🦌 Deer ${objectId}: Starting idle period`);
            return;
          }
        }
        
        // Generate new wandering target
        const newTarget = generateWanderingTarget(currentPosition);
        if (newTarget) {
          setTarget(newTarget);
          console.log(`🦌 Deer ${objectId}: New target set at distance ${currentPosition.distanceTo(newTarget).toFixed(2)}`);
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
      
      // ** ENHANCED TERRAIN COLLISION DETECTION **
      // Always use the most accurate collision detection available
      console.log(`🦌 Deer ${objectId}: Checking movement from ${currentPosition.x.toFixed(2)}, ${currentPosition.y.toFixed(2)}, ${currentPosition.z.toFixed(2)} to ${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}`);
      
      // Use traditional collision detection with physics data (most reliable)
      const terrainCollision = terrainCollisionDetector.checkMovement(currentPosition, targetPosition);
      console.log(`🦌 Deer ${objectId}: Collision result: canMove=${terrainCollision.canMove}, groundHeight=${terrainCollision.groundHeight.toFixed(2)}, isWater=${terrainCollision.isWater}`);
      
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
        console.log(`🦌 Deer ${objectId}: Enhanced validation result: isValid=${enhancedValidation.isValid}, confidence=${(enhancedValidation.confidence * 100).toFixed(1)}%`);
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
        
        console.log(`🦌 Deer ${objectId}: Traditional collision detection blocked movement`, {
          reason: blockReason,
          isWater: terrainCollision.isWater,
          isBuildingBlocked: terrainCollision.isBuildingBlocked,
          blockedByBuilding: terrainCollision.blockedByBuilding,
          slopeAngle: (terrainCollision.slopeAngle * 180 / Math.PI).toFixed(1) + '°',
          groundHeight: terrainCollision.groundHeight.toFixed(2)
        });
        
        // Report collision to debug system
        const debugWin = window as DebugWindow;
        if (debugWin.updateDeerDebug) {
          debugWin.updateDeerDebug(objectId, {
            lastDecision: blockReason,
            collisionPoints: [targetPosition]
          });
        }
        
        // For building collisions, generate a new target instead of using adjusted position
        if (terrainCollision.isBuildingBlocked) {
          console.log(`🦌 Deer ${objectId}: Blocked by building (${terrainCollision.blockedByBuilding}), generating new target`);
          setTarget(null); // Force new target generation
          return; // Skip movement this frame
        } else if (enhancedValidation?.alternativePath && enhancedValidation.alternativePath.length > 0) {
          targetPosition = enhancedValidation.alternativePath[0]!;
          console.log(`🦌 Deer ${objectId}: Using enhanced alternative path point`);
        } else if (terrainCollision.adjustedPosition) {
          targetPosition = terrainCollision.adjustedPosition;
          console.log(`🦌 Deer ${objectId}: Using traditional adjusted position`);
        } else {
          // No alternative available, generate new target
          setTarget(null);
          console.log(`🦌 Deer ${objectId}: Generating new target due to blocked movement`);
          return; // Skip movement this frame
        }
      } else {
        // Traditional collision detection passed, use accurate terrain height
        const terrainGroundHeight = terrainCollision.groundHeight;
        const surfaceNormal = targetPosition.clone().normalize();
        targetPosition = surfaceNormal.multiplyScalar(terrainGroundHeight);
        console.log(`🦌 Deer ${objectId}: Movement allowed, positioning at height ${terrainGroundHeight.toFixed(2)}`);
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
   * Enhanced with height map and multi-method terrain validation
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
          maxSlopeAngle: Math.PI / 3, // 60 degrees - deer can climb moderate slopes
          avoidWater: true,
          samples: 8, // Fewer samples for performance during target generation
          useHeightMap: true,
          useNormalMap: true,
          generateAlternatives: false // Don't need alternatives during target generation
        }
      );
      
      if (pathValidation.isValid && pathValidation.confidence > 0.6) {
        console.log(`🦌 Deer ${objectId}: Enhanced pathfinding found valid target after ${attempt + 1} attempts (confidence: ${(pathValidation.confidence * 100).toFixed(1)}%)`);
        return candidateTarget;
      } else if (pathValidation.confidence > 0.3) {
        // If path has moderate confidence but isn't fully valid, try traditional collision detection as fallback
        const terrainCollision = terrainCollisionDetector.checkMovement(currentPos, candidateTarget);
        if (terrainCollision.canMove) {
          console.log(`🦌 Deer ${objectId}: Fallback collision detection found target after ${attempt + 1} attempts`);
          return candidateTarget;
        }
      }
      
      // Log why this target was rejected for debugging
      if (attempt % 5 === 0) { // Log every 5th attempt to avoid spam
        console.log(`🦌 Deer ${objectId}: Target attempt ${attempt + 1} rejected - ${pathValidation.reason ?? 'Unknown reason'} (confidence: ${(pathValidation.confidence * 100).toFixed(1)}%)`);
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
          scale={[1, 1, 1]}
          selected={selected}
          objectId={objectId}
          preview={false}
          canPlace={true}
          disablePositionSync={true}
          isPhysicsControlled={true}
        />
        
        {/* Eating indicator */}
        {/* {isEating && (
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="green" />
          </mesh>
        )} */}
      </group>

    </RigidBody>
  );
}
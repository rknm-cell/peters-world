"use client";

import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { Wolf } from "~/components/three/objects/Wolf";
import {
  useIsUserInteractingOptimized,
  useAnimalRelevantObjectsAtomic,
} from "~/lib/store";
import { WOLF_CONFIG } from "~/lib/constants";
import {
  calculateTargetRotation,
  calculateSmoothedRotation,
  extractMovementVectors,
} from "~/lib/utils/deer-rotation";
import { useDeerRenderQueue } from "~/lib/utils/render-queue";
import { getTerrainCollisionDetector } from "~/lib/utils/terrain-collision";
import { enhancedPathfinder } from "~/lib/utils/enhanced-pathfinding";
import { terrainHeightMapGenerator } from "~/components/debug/TerrainHeightMap";
import { COLLISION_GROUPS, COLLISION_INTERACTIONS } from "~/lib/constants";

// Type for debug window functions
interface DebugWindow extends Window {
  updateWolfDebug?: (
    wolfId: string,
    data: {
      position?: THREE.Vector3;
      target?: THREE.Vector3 | null;
      state?: string;
      lastDecision?: string;
      collisionPoints?: THREE.Vector3[];
    },
  ) => void;
}

interface WolfPhysicsProps {
  objectId: string;
  position: [number, number, number];
  type: string;
}

/**
 * WolfPhysics - Physics-enabled wolf with realistic movement and deer-hunting behavior
 * Uses the same proven kinematic approach as DeerPhysics for reliable movement
 * NO CHARACTER CONTROLLER - uses direct kinematic body positioning like deer
 */
function WolfPhysicsComponent({ objectId, position, type }: WolfPhysicsProps) {
  // CRITICAL FIX: Create stable position reference to prevent rerenders from prop changes
  const posX = position[0];
  const posY = position[1]; 
  const posZ = position[2];
  const stablePosition = React.useMemo(() => {
    return [posX, posY, posZ] as [number, number, number];
  }, [posX, posY, posZ]);
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  // Use optimized hooks to prevent unnecessary rerenders
  const isUserInteracting = useIsUserInteractingOptimized();

  // Use stable action selectors that won't cause rerenders (removed unused removeObject)

  // Use the same atomic selector pattern as deer for consistency
  const relevantObjectsRecord = useAnimalRelevantObjectsAtomic(objectId);
  
  // Convert to array format for easier use
  const relevantObjects = React.useMemo(() => {
    return Object.entries(relevantObjectsRecord).map(([id, data]) => ({
      id,
      ...data
    }));
  }, [relevantObjectsRecord]);

  // Render queue for batching updates and preventing multiple simultaneous re-renders
  const { queueDeerTransformUpdate, cancelDeerUpdates } =
    useDeerRenderQueue(isUserInteracting);

  // CRITICAL FIX: Memoize surface position calculation
  const surfacePosition = React.useMemo(() => {
    const initialPosition = new THREE.Vector3(...stablePosition);
    return initialPosition.normalize().multiplyScalar(6.05); // Place just above surface
  }, [stablePosition]);

  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(Date.now());

  // Wolf-specific hunting behavior states
  const [isHunting, setIsHunting] = useState(false);
  const [huntingStartTime, setHuntingStartTime] = useState(0);
  const [huntingTargetId, setHuntingTargetId] = useState<string | null>(null);
  
  const lastUpdateTime = useRef(0);
  
  // Bounce animation state (same as deer)
  const bouncePhase = useRef(0);
  const lastMovementSpeed = useRef(0);
  
  const terrainCollisionDetector = getTerrainCollisionDetector();

  // Clean up queued updates when component unmounts
  useEffect(() => {
    return () => {
      cancelDeerUpdates(objectId);
    };
  }, [objectId, cancelDeerUpdates]);

  // Wolf movement parameters (using WOLF_CONFIG)
  const MOVEMENT_SPEED = WOLF_CONFIG.movement.moveSpeed.min + Math.random() * 
    (WOLF_CONFIG.movement.moveSpeed.max - WOLF_CONFIG.movement.moveSpeed.min);
  const TARGET_DISTANCE = WOLF_CONFIG.movement.targetDistance;
  const TARGET_REACHED_THRESHOLD = 0.3;
  const IDLE_PROBABILITY = 0.2;
  const IDLE_DURATION = WOLF_CONFIG.movement.idleTime;
  
  // Hunting parameters
  const DEER_DETECTION_RADIUS = WOLF_CONFIG.hunting.detectionRadius;
  const HUNTING_DURATION = 15000; // 15 seconds
  const DEER_APPROACH_DISTANCE = 0.5;
  
  // Function to find nearby deer for hunting
  const findNearbyDeer = (wolfPosition: THREE.Vector3) => {
    const deerObjects = relevantObjects.filter(obj => obj.type === 'animals/deer');
    
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
    
    // Staggered update system (same as deer)
    const updateOffset = parseInt(objectId.slice(-3), 36) % 16;
    const minUpdateInterval = 16.67; // ~60 FPS base interval
    const staggeredInterval = minUpdateInterval + updateOffset;
    
    if (currentTime - lastUpdateTime.current < staggeredInterval) {
      return;
    }
    lastUpdateTime.current = currentTime;
    
    // Get current position from physics body
    const currentPos = body.translation();
    const currentPosition = new THREE.Vector3(
      currentPos.x,
      currentPos.y,
      currentPos.z,
    );

    // Report debug state
    const debugWindow = window as DebugWindow;
    if (debugWindow.updateWolfDebug) {
      const distanceToTarget = target ? currentPosition.distanceTo(target) : 0;
      let decision = "Seeking target";

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
        state: isHunting ? "hunting" : isIdle ? "idle" : "moving",
        lastDecision: decision,
      });
    }

    // Handle idle state (same as deer)
    if (isIdle) {
      const idleDuration = currentTime - idleStartTime;
      const maxIdleDuration = IDLE_DURATION.min + Math.random() * (IDLE_DURATION.max - IDLE_DURATION.min);
      
      if (idleDuration > maxIdleDuration) {
        setIsIdle(false);
        setTarget(null); // Force new target generation
      }
      
      // Reset movement speed when entering idle
      lastMovementSpeed.current = 0;
      
      // Surface alignment maintenance during idle (same as deer)
      const surfaceNormal = currentPosition.clone().normalize();
      const currentRotation = body.rotation();
      const currentQuaternion = new THREE.Quaternion(
        currentRotation.x, 
        currentRotation.y, 
        currentRotation.z, 
        currentRotation.w
      );
      
      // Calculate correct surface-aligned orientation
      const worldUp = new THREE.Vector3(0, 1, 0);
      const localForward = worldUp.clone()
        .sub(surfaceNormal.clone().multiplyScalar(worldUp.dot(surfaceNormal)))
        .normalize();
      
      if (localForward.length() < 0.1) {
        const worldForward = new THREE.Vector3(1, 0, 0);
        localForward.copy(worldForward)
          .sub(surfaceNormal.clone().multiplyScalar(worldForward.dot(surfaceNormal)))
          .normalize();
      }
      
      const targetQuaternion = calculateTargetRotation(
        currentPosition,
        localForward,
        surfaceNormal
      );
      
      const orientationDifference = currentQuaternion.angleTo(targetQuaternion);
      const ORIENTATION_DRIFT_THRESHOLD = 0.1;
      
      if (orientationDifference > ORIENTATION_DRIFT_THRESHOLD && !isUserInteracting) {
        const IDLE_CORRECTION_SPEED = 0.5;
        const correctedQuaternion = calculateSmoothedRotation(
          currentQuaternion,
          targetQuaternion,
          delta,
          IDLE_CORRECTION_SPEED
        );
        
        queueDeerTransformUpdate(`${objectId}-idle-orient`, () => {
          body.setRotation(correctedQuaternion, true);
        }, 'low');
      }
      
      return; // Skip movement during idle
    }

    // === DEER HUNTING LOGIC ===
    
    // Handle hunting state
    if (isHunting) {
      const huntingDuration = currentTime - huntingStartTime;
      
      // Check if hunting is complete or deer no longer exists
      if (huntingDuration >= HUNTING_DURATION) {
        setIsHunting(false);
        setHuntingTargetId(null);
        setTarget(null);
      } else if (huntingTargetId) {
        // Check if target deer still exists
        const targetDeer = relevantObjects.find(obj => obj.id === huntingTargetId);
        
        if (targetDeer) {
          const deerPosition = new THREE.Vector3(...targetDeer.position);
          const distanceToDeer = currentPosition.distanceTo(deerPosition);
          
          // If close enough to deer, "catch" it
          if (distanceToDeer <= DEER_APPROACH_DISTANCE) {
            setIsHunting(false);
            setHuntingTargetId(null);
            setTarget(null);
            setIsIdle(true);
            setIdleStartTime(currentTime);
            return;
          }
          
          // Continue hunting - set deer position as target
          setTarget(deerPosition);
        } else {
          // Target deer no longer exists
          setIsHunting(false);
          setHuntingTargetId(null);
          setTarget(null);
        }
      }
    }

    // Look for nearby deer if not currently hunting
    const nearbyDeer = findNearbyDeer(currentPosition);
    
    if (nearbyDeer && !isHunting && Math.random() < WOLF_CONFIG.hunting.huntingProbability) {
      const deerPosition = new THREE.Vector3(...nearbyDeer.position);
      const distanceToDeer = currentPosition.distanceTo(deerPosition);
      
      // Start hunting if deer is within detection range
      if (distanceToDeer <= DEER_DETECTION_RADIUS) {
        setIsHunting(true);
        setHuntingStartTime(currentTime);
        setHuntingTargetId(nearbyDeer.id);
        setTarget(deerPosition);
        setIsIdle(false);
      }
    }

    // Check if we need a new target (only if not hunting specific deer)
    if (!isHunting || !huntingTargetId) {
      const distanceToTarget = target ? currentPosition.distanceTo(target) : Infinity;
      
      const targetReached = distanceToTarget < TARGET_REACHED_THRESHOLD;
      const needsNewTarget = !target || targetReached;
      
      if (needsNewTarget) {
        // If we just reached a target, decide whether to idle or continue moving
        if (targetReached && target) {
          
          // Decide if wolf should idle or move to new location
          if (Math.random() < IDLE_PROBABILITY) {
            setIsIdle(true);
            setIdleStartTime(currentTime);
            setTarget(null);
            return;
          }
        }
        
        // Generate new wandering target
        const newTarget = generateWanderingTarget(currentPosition);
        if (newTarget) {
          setTarget(newTarget);
        }
      }
    }

    // Move toward target using simple kinematic movement (SAME AS DEER)
    if (target && !isIdle) {
      const direction = target.clone().sub(currentPosition).normalize();
      
      // Get surface normal for surface-parallel movement
      const surfaceNormal = currentPosition.clone().normalize();
      
      // Project movement onto surface (remove component along surface normal)
      const surfaceMovement = direction
        .clone()
        .sub(surfaceNormal.clone().multiplyScalar(direction.dot(surfaceNormal)))
        .normalize();
      
      // Use hunting speed if hunting, normal speed otherwise
      const currentSpeed = isHunting ? WOLF_CONFIG.hunting.chaseSpeed : MOVEMENT_SPEED;
      
      // Calculate movement for this frame
      const movement = surfaceMovement.multiplyScalar(currentSpeed * delta);
      
      // Calculate target position for this frame (before collision checking)
      let targetPosition = currentPosition.clone().add(movement);
      
      // Use traditional collision detection (same as deer)
      const terrainCollision = terrainCollisionDetector.checkMovement(
        currentPosition,
        targetPosition,
      );
      
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
            useNormalMap: false,
            generateAlternatives: true
          }
        );
      }
      
      // Handle collision detection results (same as deer)
      if (!terrainCollision.canMove) {
        
        // For building collisions, generate a new target
        if (terrainCollision.isBuildingBlocked) {
          setTarget(null);
          return;
        } else if (enhancedValidation?.alternativePath && enhancedValidation.alternativePath.length > 0) {
          targetPosition = enhancedValidation.alternativePath[0]!;
        } else if (terrainCollision.adjustedPosition) {
          targetPosition = terrainCollision.adjustedPosition;
        } else {
          // No alternative available, generate new target
          setTarget(null);
          return;
        }
      } else {
        // Traditional collision detection passed, use accurate terrain height
        const terrainGroundHeight = terrainCollision.groundHeight;
        const surfaceNormal = targetPosition.clone().normalize();
        targetPosition = surfaceNormal.multiplyScalar(terrainGroundHeight);
      }
      
      // Calculate actual movement that occurred (for rotation and bounce animation)
      const actualMovement = targetPosition.clone().sub(currentPosition);
      
      // Update bounce animation based on movement speed (same as deer)
      const currentMovementSpeed = actualMovement.length() / delta;
      lastMovementSpeed.current = currentMovementSpeed;
      
      // Advance bounce phase based on movement speed
      const bounceFrequency = 8.0;
      bouncePhase.current += currentMovementSpeed * bounceFrequency * delta;
      
      // Calculate bounce height
      const maxBounceHeight = 0.08;
      const bounceHeight = Math.sin(bouncePhase.current) * maxBounceHeight * Math.min(currentMovementSpeed / currentSpeed, 1.0);
      
      // Apply bounce to final position
      const bounceOffset = targetPosition.clone().normalize().multiplyScalar(bounceHeight);
      targetPosition.add(bounceOffset);
      
      // Queue the transform update (SAME AS DEER - NO CHARACTER CONTROLLER)
      queueDeerTransformUpdate(
        `${objectId}-movement`,
        () => {
          // For kinematic bodies, directly set the new position
          body.setTranslation(targetPosition, true);
          
          // Rotate wolf to face the direction they actually moved
          if (actualMovement.length() > 0.01) {
            const { positionVec, directionVec, surfaceNormal } = extractMovementVectors(
              currentPosition,
              actualMovement
            );
            
            // Calculate target rotation
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
              
              // Calculate smoothed rotation (faster for hunting)
              const rotationSpeed = isHunting ? 12.0 : 8.0;
              const newQuaternion = calculateSmoothedRotation(
                currentQuaternion,
                targetQuaternion,
                delta,
                rotationSpeed
              );
              
              body.setRotation(newQuaternion, true);
            }
          }
        },
        "normal",
      );
    }
  });

  /**
   * Generate a random wandering target on the globe surface
   * Simplified version based on deer implementation
   */
  function generateWanderingTarget(currentPos: THREE.Vector3): THREE.Vector3 | null {
    const maxAttempts = 10; // Reduced for better performance
    
    const baseDistance = TARGET_DISTANCE.min + Math.random() * (TARGET_DISTANCE.max - TARGET_DISTANCE.min);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random direction and distance for wandering
      const angle = Math.random() * Math.PI * 2;
      const distance = baseDistance * (attempt > maxAttempts / 2 ? 0.6 : 1.0);
      
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
        targetRadius = terrainHeight + 0.05;
      }
      
      const candidateTarget = targetDirection.multiplyScalar(targetRadius);
      
      // Use simpler validation (like deer)
      const pathValidation = enhancedPathfinder.validatePath(
        currentPos,
        candidateTarget,
        {
          maxSlopeAngle: Math.PI / 3, // 60 degrees
          avoidWater: true,
          samples: 5, // Reduced samples for performance
          useHeightMap: true,
          useNormalMap: true,
          generateAlternatives: false
        }
      );
      
      // Lower confidence threshold for easier target generation
      if (pathValidation.isValid && pathValidation.confidence > 0.4) {
        return candidateTarget;
      } else if (pathValidation.confidence > 0.2) {
        // Fallback to traditional collision detection
        const terrainCollision = terrainCollisionDetector.checkMovement(currentPos, candidateTarget);
        if (terrainCollision.canMove) {
          return candidateTarget;
        }
      }
    }
    
    return null;
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[surfacePosition.x, surfacePosition.y, surfacePosition.z]}
      type="kinematicPosition" // Kinematic body - SAME AS DEER
      colliders={false}
      userData={{ 
        isWolf: true, 
        objectId, 
        isMoving: !isIdle && target !== null, 
        isHunting: isHunting 
      }}
    >
      {/* Capsule collider - same as deer but slightly larger */}
      <CapsuleCollider 
        args={[0.25, 0.5]} // Slightly larger than deer
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
export const WolfPhysics = React.memo(
  WolfPhysicsComponent,
  (prevProps, nextProps) => {
    // Only re-render if essential props change
    return (
      prevProps.objectId === nextProps.objectId &&
      prevProps.type === nextProps.type &&
      prevProps.position[0] === nextProps.position[0] &&
      prevProps.position[1] === nextProps.position[1] &&
      prevProps.position[2] === nextProps.position[2]
    );
  },
);

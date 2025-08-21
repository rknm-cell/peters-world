"use client";

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Deer } from '~/components/three/objects/Deer';
import { useWorldStore } from '~/lib/store';

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
  
  useFrame(() => {
    // Let gravity and collision physics do all the work
    // Sync store position with physics position for visual consistency
    if (!rigidBodyRef.current) return;
    
    const body = rigidBodyRef.current;
    const physicsPosition = body.translation();
    
    // Update store with physics position so other systems stay in sync
    const store = useWorldStore.getState();
    const currentObject = store.objects.find(obj => obj.id === objectId);
    
    if (currentObject) {
      // Only update if position has changed significantly to avoid constant updates
      const currentPos = currentObject.position;
      const threshold = 0.01; // 1cm threshold
      
      if (Math.abs(currentPos[0] - physicsPosition.x) > threshold ||
          Math.abs(currentPos[1] - physicsPosition.y) > threshold ||
          Math.abs(currentPos[2] - physicsPosition.z) > threshold) {
        
        store.updateObject(objectId, {
          position: [physicsPosition.x, physicsPosition.y, physicsPosition.z]
        });
      }
    }
  });
  
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      colliders={false}
      userData={{ isDeer: true, objectId }}
      mass={60} // 60kg deer
      linearDamping={0.5} // Low damping for natural physics
      angularDamping={0.5} // Low damping for natural physics
      ccd={true} // Continuous collision detection
    >
      {/* Capsule collider for deer body - centered at RigidBody origin */}
      <CapsuleCollider args={[0.3, 0.6]} position={[0, 0, 0]} />
      
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
        />
      </group>
    </RigidBody>
  );
}
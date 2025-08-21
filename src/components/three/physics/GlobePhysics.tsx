"use client";

import { forwardRef } from 'react';
import { RigidBody, MeshCollider } from '@react-three/rapier';
import { Globe } from '~/components/editor/Globe';
import type { Mesh } from 'three';

interface GlobePhysicsProps {
  onTerrainMeshReady?: (mesh: Mesh) => void;
}

/**
 * GlobePhysics - Physics-enabled globe with precise mesh collision
 * Wraps the existing Globe component with Rapier physics for accurate collision detection
 */
export const GlobePhysics = forwardRef<Mesh, GlobePhysicsProps>(
  function GlobePhysics({ onTerrainMeshReady }, ref) {
    return (
      <RigidBody 
        type="fixed" // Globe doesn't move
        colliders={false} // We'll use custom MeshCollider for precise collision
        userData={{ isGlobe: true }}
      >
        <MeshCollider 
          type="trimesh" // Precise mesh-based collision detection
        >
          <Globe 
            ref={ref}
            onTerrainMeshReady={onTerrainMeshReady}
          />
        </MeshCollider>
      </RigidBody>
    );
  }
);
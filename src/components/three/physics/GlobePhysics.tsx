"use client";

import { forwardRef, useRef, useEffect, useCallback } from "react";
import { RigidBody, useRapier } from "@react-three/rapier";
import type { RapierRigidBody, RapierCollider } from "@react-three/rapier";
import { Globe } from "~/components/editor/Globe";
import { useWorldStore } from "~/lib/store";
import { COLLISION_GROUPS } from "~/lib/constants";
import type { Mesh } from "three";

// Global reference to the terrain collider for debug visualization
// Global reference to terrain collider for external access
// Use unknown type to avoid Collider type issues
export interface GlobalTerrainCollider {
  collider: RapierCollider;
  vertices: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

export let globalTerrainCollider: GlobalTerrainCollider | null = null;

interface GlobePhysicsProps {
  onTerrainMeshReady?: (mesh: Mesh) => void;
}

/**
 * GlobePhysics - Physics-enabled globe with dynamic mesh collision
 * Supports real-time collider updates when terrain is deformed
 */
export const GlobePhysics = forwardRef<Mesh, GlobePhysicsProps>(
  function GlobePhysics({ onTerrainMeshReady }, ref) {
    const { world, rapier } = useRapier();
    const rigidBodyRef = useRef<RapierRigidBody | null>(null);
    const terrainMeshRef = useRef<Mesh | null>(null);
    const colliderRef = useRef<RapierCollider | null>(null);
    const { terrainVertices } = useWorldStore();
    const lastUpdateHash = useRef<string>("");

    /**
     * Creates a hash of terrain vertices to detect changes
     */
    const getTerrainHash = useCallback(() => {
      if (!terrainVertices || terrainVertices.length === 0) return "";

      // Sample vertices to create a hash (checking all would be too expensive)
      const sampleSize = Math.min(100, terrainVertices.length);
      const step = Math.floor(terrainVertices.length / sampleSize);
      let hash = "";

      for (let i = 0; i < terrainVertices.length; i += step) {
        const vertex = terrainVertices[i];
        if (vertex) {
          // Include height and water level in hash
          hash += `${vertex.height.toFixed(2)},${vertex.waterLevel.toFixed(2)};`;
        }
      }

      return hash;
    }, [terrainVertices]);

    /**
     * Updates the physics collider when terrain changes
     */
    const updateCollider = useCallback(() => {
      if (
        !rigidBodyRef.current ||
        !terrainMeshRef.current ||
        !world ||
        !rapier
      ) {
        return;
      }

      const geometry = terrainMeshRef.current.geometry;
      if (!geometry) {
        return;
      }

      try {
        // Remove old collider if it exists
        if (colliderRef.current) {
          world.removeCollider(colliderRef.current, true);
          colliderRef.current = null;
        }

        // Get the updated vertex positions
        const positions = geometry.attributes.position;
        if (!positions) {
          console.error("⚠️ No position attribute in geometry");
          return;
        }

        // Create vertices array for trimesh
        const vertices = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          vertices[i * 3] = positions.getX(i);
          vertices[i * 3 + 1] = positions.getY(i);
          vertices[i * 3 + 2] = positions.getZ(i);
        }

        // Get or generate indices
        let indices: Uint32Array;
        if (geometry.index) {
          indices = new Uint32Array(geometry.index.array);
        } else {
          // Generate indices for non-indexed geometry
          indices = new Uint32Array((positions.count - 2) * 3);
          for (let i = 0; i < positions.count - 2; i++) {
            indices[i * 3] = i;
            indices[i * 3 + 1] = i + 1;
            indices[i * 3 + 2] = i + 2;
          }
        }

        // Create new trimesh collider
        const colliderDesc = rapier.ColliderDesc.trimesh(vertices, indices);
        colliderDesc.setCollisionGroups(COLLISION_GROUPS.TERRAIN); // Use terrain collision group

        // Create and attach the new collider
        const newCollider = world.createCollider(
          colliderDesc,
          rigidBodyRef.current,
        );
        colliderRef.current = newCollider;

        // Store global reference for debug visualization
        globalTerrainCollider = {
          collider: newCollider,
          vertices: vertices,
          indices: indices,
          vertexCount: positions.count,
          triangleCount: indices.length / 3,
        };

      } catch (error) {
        console.error("❌ Failed to update terrain collider:", error);
      }
    }, [world, rapier]);

    /**
     * Handle terrain mesh ready callback
     */
    const handleTerrainMeshReady = useCallback(
      (mesh: Mesh) => {
        // Store the actual terrain mesh (from TerrainSystem)
        terrainMeshRef.current = mesh;

        // Call the parent callback
        if (onTerrainMeshReady) {
          onTerrainMeshReady(mesh);
        }

        // Initial collider update with slight delay to ensure mesh is ready
        setTimeout(() => updateCollider(), 500);
      },
      [onTerrainMeshReady, updateCollider],
    );

    /**
     * Monitor terrain changes and update collider when needed
     */
    useEffect(() => {
      if (!terrainMeshRef.current) return;

      const currentHash = getTerrainHash();

      if (currentHash !== lastUpdateHash.current && currentHash !== "") {
        lastUpdateHash.current = currentHash;

        // Debounce the update to avoid too frequent updates during terraforming
        const timeoutId = setTimeout(() => {
          updateCollider();
        }, 250); // Increased delay for better performance

        return () => clearTimeout(timeoutId);
      }
    }, [getTerrainHash, updateCollider, terrainVertices]); // Also watch terrainVertices directly

    /**
     * Store rigid body reference
     */
    const handleRigidBodyRef = useCallback((rb: RapierRigidBody | null) => {
      rigidBodyRef.current = rb;

      if (rb) {
        // console.log("📍 Globe rigid body initialized");
      }
    }, []);

    return (
      <RigidBody
        ref={handleRigidBodyRef}
        type="fixed" // Globe doesn't move
        colliders={false} // We'll create custom collider
        userData={{ isGlobe: true }}
      >
        <Globe ref={ref} onTerrainMeshReady={handleTerrainMeshReady} />
      </RigidBody>
    );
  },
);

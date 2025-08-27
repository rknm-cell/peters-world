"use client";

import { useEffect } from "react";
import { useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import type { PhysicsBody, RapierWorld } from "~/lib/types";

/**
 * PhysicsStatusLogger - Logs physics world status for debugging
 * Provides console commands to inspect the physics world state
 */
export function PhysicsStatusLogger() {
  const { world } = useRapier() as { world: RapierWorld };

  useEffect(() => {
    // Global functions for physics debugging
    window.logPhysicsStatus = () => {
      const bodyCount = world.bodies.len();
      const colliderCount = world.colliders.len();

      console.warn("🔧 Physics World Status:", {
        totalBodies: bodyCount,
        totalColliders: colliderCount,
        gravity: world.gravity,
        timestep: world.timestep,
      });

      // Log each body's status
      let bodyIndex = 0;
      world.forEachRigidBody((body: PhysicsBody) => {
        const userData = body.userData;
        const position = body.translation();
        const velocity = body.linvel();
        const mass = body.mass();

        console.warn(`  Body ${bodyIndex}:`, {
          isDeer: userData?.isDeer,
          objectId: userData?.objectId,
          position: [
            position.x.toFixed(2),
            position.y.toFixed(2),
            position.z.toFixed(2),
          ],
          velocity: [
            velocity.x.toFixed(2),
            velocity.y.toFixed(2),
            velocity.z.toFixed(2),
          ],
          mass: mass.toFixed(2),
          bodyType: body.bodyType(),
        });
        bodyIndex++;
      });
    };

    window.spawnPhysicsDeer = () => {
      console.warn("🔧 Attempting to spawn physics deer...");
      // This will trigger the existing spawn system
      const testSpawn = window.testDeerSpawn;
      if (testSpawn) {
        testSpawn();
      } else {
        console.error("testDeerSpawn function not available");
      }
    };

    return () => {
      delete window.logPhysicsStatus;
      delete window.spawnPhysicsDeer;
    };
  }, [world]);

  // Periodic status logging (optional)
  let logInterval = 0;
  useFrame(() => {
    logInterval++;
    // Log status every 5 seconds (300 frames at 60fps)
    if (logInterval % 300 === 0) {
      const deerCount = Array.from(world.bodies.getAll()).filter(
        (body: PhysicsBody) => {
          const userData = body.userData;
          return userData?.isDeer;
        },
      ).length;

      if (deerCount > 0) {
        console.log(`🦌 Physics: ${deerCount} deer active in physics world`);
      }
    }
  });

  return null;
}

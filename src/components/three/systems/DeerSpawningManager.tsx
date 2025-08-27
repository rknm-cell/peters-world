"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "~/lib/store";
import { DEER_CONFIG } from "~/lib/constants";

/**
 * DeerSpawningManager - Handles automatic spawning and despawning of deer on suitable terrain areas
 * This component should be included once in the scene to manage deer population
 */
export function DeerSpawningManager() {
  const attemptDeerSpawning = useWorldStore(
    (state) => state.attemptDeerSpawning,
  );
  const attemptDeerDespawning = useWorldStore(
    (state) => state.attemptDeerDespawning,
  );

  const testDeerMovement = useWorldStore((state) => state.testDeerMovement);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const isMovementPausedRef = useRef(false); // Add pause mechanism

  // Function to pause/resume movement
  const toggleMovement = useCallback(() => {
    isMovementPausedRef.current = !isMovementPausedRef.current;
    console.log(
      `🦌 Deer movement ${isMovementPausedRef.current ? "PAUSED" : "RESUMED"}`,
    );
  }, []);

  // We'll add the global functions after the callback definitions

  // Memoize the spawning function to prevent unnecessary re-renders
  const spawnDeer = useCallback(() => {
    if (isActiveRef.current) {
      attemptDeerSpawning();
    }
  }, [attemptDeerSpawning]);

  // Memoize the despawning function
  const despawnDeer = useCallback(() => {
    if (isActiveRef.current) {
      attemptDeerDespawning();
    }
  }, [attemptDeerDespawning]);

  // Movement is now handled by physics system - no longer needed
  const moveDeer = useCallback(() => {
    // Physics-based movement is handled automatically by DeerPhysics components
    console.debug("🦌 Movement handled by physics system");
  }, []);

  // Test function to check if movement system works
  const testMovement = useCallback(() => {
    if (isActiveRef.current) {
      console.log("🧪 DeerSpawningManager: Testing movement system...");
      testDeerMovement();

      // Wait a bit then test movement update
      setTimeout(() => {
        console.log("🧪 DeerSpawningManager: Testing movement update...");
        testDeerMovement();
      }, 1000);
    }
  }, [testDeerMovement]);

  // Expose debugging functions globally after all callbacks are defined
  useEffect(() => {
    // Define debug interface with proper typing
    interface DebugWindow {
      toggleDeerMovement?: () => void;
      forceDeerMovement?: () => void;
      testDeerSpawn?: () => void;
      checkDeerState?: () => void;
      checkSpawnRequirements?: () => void;
    }

    const debugWindow = window as Window & DebugWindow;

    debugWindow.toggleDeerMovement = toggleMovement;
    debugWindow.forceDeerMovement = () => {
      console.warn("🔧 Manually triggering deer movement...");
      moveDeer();
    };
    debugWindow.testDeerSpawn = () => {
      console.warn("🔧 Manually triggering deer spawn...");
      spawnDeer();
    };
    debugWindow.checkDeerState = () => {
      const state = useWorldStore.getState();
      const deer = state.objects.filter((obj) => obj.type === "animals/deer");
      console.warn("🔍 Current deer state:", deer);
      deer.forEach((d) => {
        console.warn(
          `   Deer ${d.id}: pos [${d.position.join(", ")}] - physics-controlled`,
        );
      });
    };
    debugWindow.checkSpawnRequirements = () => {
      const state = useWorldStore.getState();
      console.warn("🔍 Spawn requirements check:", {
        hasGlobeRef: !!state.globeRef,
        globeRefType: typeof state.globeRef,
        terrainVerticesCount: state.terrainVertices?.length || 0,
        currentDeerCount: state.objects.filter(
          (obj) => obj.type === "animals/deer",
        ).length,
        maxDeerInWorld: DEER_CONFIG.maxDeerInWorld,
        totalObjects: state.objects.length,
        objectTypes: [...new Set(state.objects.map((obj) => obj.type))],
      });
    };
    return () => {
      delete debugWindow.toggleDeerMovement;
      delete debugWindow.forceDeerMovement;
      delete debugWindow.testDeerSpawn;
      delete debugWindow.checkDeerState;
      delete debugWindow.checkSpawnRequirements;
    };
  }, [toggleMovement, moveDeer, spawnDeer]);

  useEffect(() => {
    // Copy ref to variable to avoid stale closure warning in cleanup
    const movementIntervalRefCurrent = movementIntervalRef.current;

    // Spawn a deer 1 second after scene loads for debugging
    const immediateSpawnDelay = setTimeout(() => {
      if (isActiveRef.current) {
        console.log(
          "🦌 DeerSpawningManager: Scene loaded, spawning debug deer in 1 second...",
        );
        setTimeout(() => {
          if (isActiveRef.current) {
            console.log(
              "🦌 DeerSpawningManager: Attempting immediate deer spawn for debugging...",
            );
            spawnDeer();

            // DISABLED: Store-based movement system - now using physics-based movement
            // Physics-based deer (DeerPhysics component) handles all movement automatically
            console.log(
              "🦌 DeerSpawningManager: Spawned deer - physics-based movement will take over",
            );
          }
        }, 1000); // 1 second delay after scene is ready
      }
    }, 1000); // 1 second to let scene settle

    // DISABLED: Store-based movement interval system
    // Physics-based movement is now handled by DeerPhysics components
    // const startMovementInterval = () => { ... };

    // Add a delay before starting to avoid spawning during initial scene setup
    const startDelay = setTimeout(() => {
      if (isActiveRef.current) {
        console.log(
          "🦌 DeerSpawningManager: Starting regular deer management cycle...",
        );
        // Spawn and despawn deer periodically with jitter to prevent synchronization
        const manageDeerWithJitter = () => {
          if (!isActiveRef.current) return;

          // Add ±15% jitter to prevent exact synchronization with other systems
          const jitter = (Math.random() - 0.5) * 0.3; // Range: -0.15 to +0.15
          const intervalWithJitter = DEER_CONFIG.checkInterval * (1 + jitter);

          intervalRef.current = setTimeout(() => {
            if (isActiveRef.current) {
              spawnDeer(); // Try to spawn new deer
              despawnDeer(); // Check if any deer should despawn
              manageDeerWithJitter(); // Schedule the next cycle
            }
          }, intervalWithJitter);
        };

        // Start the first deer management cycle
        manageDeerWithJitter();
      }
    }, 5000); // 5 second delay to let scene settle

    return () => {
      isActiveRef.current = false;
      clearTimeout(immediateSpawnDelay);
      clearTimeout(startDelay);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      // Use the copied ref value to avoid stale closure warning
      if (movementIntervalRefCurrent) {
        clearInterval(movementIntervalRefCurrent);
      }
    };
  }, [spawnDeer, despawnDeer, moveDeer, testMovement]);

  // This component doesn't render anything visible
  return null;
}

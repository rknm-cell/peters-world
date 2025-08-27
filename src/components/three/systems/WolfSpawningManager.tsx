"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "~/lib/store";
import { WOLF_CONFIG } from "~/lib/constants";

/**
 * WolfSpawningManager - Handles automatic spawning and despawning of wolves on suitable terrain areas
 * This component should be included once in the scene to manage wolf population
 */
export function WolfSpawningManager() {
  const attemptWolfSpawning = useWorldStore(
    (state) => state.attemptWolfSpawning,
  );
  const attemptWolfDespawning = useWorldStore(
    (state) => state.attemptWolfDespawning,
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Memoize the spawning function to prevent unnecessary re-renders
  const spawnWolf = useCallback(() => {
    if (isActiveRef.current) {
      attemptWolfSpawning();
    }
  }, [attemptWolfSpawning]);

  // Memoize the despawning function
  const despawnWolf = useCallback(() => {
    if (isActiveRef.current) {
      attemptWolfDespawning();
    }
  }, [attemptWolfDespawning]);

  // Expose debugging functions globally
  useEffect(() => {
    // Define debug interface with proper typing
    interface DebugWindow {
      testWolfSpawn?: () => void;
      checkWolfState?: () => void;
      checkWolfSpawnRequirements?: () => void;
    }

    const debugWindow = window as Window & DebugWindow;

    debugWindow.testWolfSpawn = () => {
      console.warn("🔧 Manually triggering wolf spawn...");
      spawnWolf();
    };
    debugWindow.checkWolfState = () => {
      const state = useWorldStore.getState();
      const wolves = state.objects.filter((obj) => obj.type === "animals/wolf");
      console.warn("🔍 Current wolf state:", wolves);
      wolves.forEach((w) => {
        console.warn(`   Wolf ${w.id}: pos [${w.position.join(", ")}]`);
      });
    };
    debugWindow.checkWolfSpawnRequirements = () => {
      const state = useWorldStore.getState();
      console.warn("🔍 Wolf spawn requirements check:", {
        hasGlobeRef: !!state.globeRef,
        globeRefType: typeof state.globeRef,
        terrainVerticesCount: state.terrainVertices?.length || 0,
        currentWolfCount: state.objects.filter(
          (obj) => obj.type === "animals/wolf",
        ).length,
        maxWolvesInWorld: WOLF_CONFIG.maxWolvesInWorld,
        totalObjects: state.objects.length,
        objectTypes: [...new Set(state.objects.map((obj) => obj.type))],
      });
    };
    return () => {
      delete debugWindow.testWolfSpawn;
      delete debugWindow.checkWolfState;
      delete debugWindow.checkWolfSpawnRequirements;
    };
  }, [spawnWolf]);

  useEffect(() => {
    // Spawn a wolf 10 seconds after scene loads for debugging (after deer)
    const immediateSpawnDelay = setTimeout(() => {
      if (isActiveRef.current) {
        console.log(
          "🐺 WolfSpawningManager: Scene loaded, spawning debug wolf in 10 seconds...",
        );
        setTimeout(() => {
          if (isActiveRef.current) {
            console.log(
              "🐺 WolfSpawningManager: Attempting immediate wolf spawn for debugging...",
            );
            spawnWolf();
          }
        }, 10000); // 10 second delay after scene is ready
      }
    }, 1000);

    // Add a delay before starting to avoid spawning during initial scene setup
    const startDelay = setTimeout(() => {
      if (isActiveRef.current) {
        console.log(
          "🐺 WolfSpawningManager: Starting regular wolf management cycle...",
        );
        // Spawn and despawn wolves periodically with jitter to prevent synchronization
        const manageWolvesWithJitter = () => {
          if (!isActiveRef.current) return;

          // Add ±20% jitter to prevent exact synchronization with deer system
          const jitter = (Math.random() - 0.5) * 0.4; // Range: -0.2 to +0.2
          const intervalWithJitter = WOLF_CONFIG.checkInterval * (1 + jitter);

          intervalRef.current = setTimeout(() => {
            if (isActiveRef.current) {
              spawnWolf(); // Try to spawn new wolves
              despawnWolf(); // Check if any wolves should despawn
              manageWolvesWithJitter(); // Schedule the next cycle
            }
          }, intervalWithJitter);
        };

        // Start the first wolf management cycle
        manageWolvesWithJitter();
      }
    }, 15000); // 15 second delay to let scene settle and deer spawn first

    return () => {
      isActiveRef.current = false;
      clearTimeout(immediateSpawnDelay);
      clearTimeout(startDelay);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [spawnWolf, despawnWolf]);

  // This component doesn't render anything visible
  return null;
}

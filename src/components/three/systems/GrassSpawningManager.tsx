"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "~/lib/store";
import { GRASS_CONFIG } from "~/lib/constants";

/**
 * GrassSpawningManager - Handles automatic spawning of grass on green terrain areas
 * This component should be included once in the scene to manage grass spawning
 */
export function GrassSpawningManager() {
  const attemptGrassSpawningDebounced = useWorldStore(
    (state) => state.attemptGrassSpawningDebounced,
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Memoize the spawning function to prevent unnecessary re-renders
  const spawnGrass = useCallback(() => {
    if (isActiveRef.current) {
      attemptGrassSpawningDebounced();
    }
  }, [attemptGrassSpawningDebounced]);

  useEffect(() => {
    // Add a small delay before starting to avoid spawning during initial scene setup
    const startDelay = setTimeout(() => {
      if (isActiveRef.current) {
        // Spawn grass periodically with jitter to prevent synchronization
        const spawnWithJitter = () => {
          if (!isActiveRef.current) return;

          // Add ±10% jitter to prevent exact synchronization with other systems
          const jitter = (Math.random() - 0.5) * 0.2; // Range: -0.1 to +0.1
          const intervalWithJitter = GRASS_CONFIG.checkInterval * (1 + jitter);

          intervalRef.current = setTimeout(() => {
            if (isActiveRef.current) {
              spawnGrass();
              spawnWithJitter(); // Schedule next spawn
            }
          }, intervalWithJitter);
        };

        // Start the first spawn cycle
        spawnWithJitter();
      }
    }, 2000); // 2 second delay to let scene settle

    return () => {
      isActiveRef.current = false;
      clearTimeout(startDelay);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [spawnGrass]);

  // This component doesn't render anything visible
  return null;
}

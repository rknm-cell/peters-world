"use client";

import { useEffect } from "react";
import { useWorldStore } from "~/lib/store";
import { TREE_LIFECYCLE_CONFIG } from "~/lib/constants";

/**
 * TreeLifecycleManager - Handles automatic progression of tree lifecycles
 * This component should be included once in the scene to manage all trees
 */
export function TreeLifecycleManager() {
  const tickTreeLifecycles = useWorldStore((state) => state.tickTreeLifecycles);
  const detectForests = useWorldStore((state) => state.detectForests);
  const attemptTreeSpawning = useWorldStore(
    (state) => state.attemptTreeSpawning,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive) {
        // Tree lifecycle updated
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // This component doesn't render anything visible
  return null;
}

"use client";

import { useEffect } from 'react';
import { useWorldStore } from '~/lib/store';
import { TREE_LIFECYCLE_CONFIG } from '~/lib/constants';

/**
 * TreeLifecycleManager - Handles automatic progression of tree lifecycles
 * This component should be included once in the scene to manage all trees
 */
export function TreeLifecycleManager() {
  const tickTreeLifecycles = useWorldStore((state) => state.tickTreeLifecycles);
  const detectForests = useWorldStore((state) => state.detectForests);
  const attemptTreeSpawning = useWorldStore((state) => state.attemptTreeSpawning);
  
  useEffect(() => {
    // Check tree lifecycles, attempt spawning, and detect forests every minute
    const interval = setInterval(() => {
      tickTreeLifecycles(); // Age existing trees
      attemptTreeSpawning(); // Try to spawn new trees from adult trees
      detectForests(); // Run forest detection after lifecycle updates and spawning
    }, TREE_LIFECYCLE_CONFIG.checkInterval);

    return () => clearInterval(interval);
  }, [tickTreeLifecycles, attemptTreeSpawning, detectForests]);

  // This component doesn't render anything visible
  return null;
}
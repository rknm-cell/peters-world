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
    console.log(`🕒 TreeLifecycleManager starting with ${TREE_LIFECYCLE_CONFIG.checkInterval / 1000}s interval`);
    
    // Check tree lifecycles, attempt spawning, and detect forests every minute
    const interval = setInterval(() => {
      console.log("⏰ TreeLifecycleManager tick - running lifecycle updates...");
      tickTreeLifecycles(); // Age existing trees
      attemptTreeSpawning(); // Try to spawn new trees from adult trees
      detectForests(); // Run forest detection after lifecycle updates and spawning
    }, TREE_LIFECYCLE_CONFIG.checkInterval);

    return () => {
      console.log("🛑 TreeLifecycleManager stopped");
      clearInterval(interval);
    };
  }, [tickTreeLifecycles, attemptTreeSpawning, detectForests]);

  // This component doesn't render anything visible
  return null;
}
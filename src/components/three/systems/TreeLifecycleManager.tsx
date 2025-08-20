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
  
  useEffect(() => {
    // Check tree lifecycles and detect forests every minute
    const interval = setInterval(() => {
      tickTreeLifecycles();
      detectForests(); // Run forest detection after lifecycle updates
    }, TREE_LIFECYCLE_CONFIG.checkInterval);

    return () => clearInterval(interval);
  }, [tickTreeLifecycles, detectForests]);

  // This component doesn't render anything visible
  return null;
}
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
  
  useEffect(() => {
    // Check tree lifecycles every minute
    const interval = setInterval(() => {
      tickTreeLifecycles();
    }, TREE_LIFECYCLE_CONFIG.checkInterval);

    return () => clearInterval(interval);
  }, [tickTreeLifecycles]);

  // This component doesn't render anything visible
  return null;
}
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
    
    // Check tree lifecycles with randomized intervals to spread out events
    let timeoutId: NodeJS.Timeout | null = null;
    let isActive = true;
    
    const scheduleNextCheck = () => {
      if (!isActive) return;
      
      // Add small ±5% jitter to prevent exact synchronization
      const jitter = (Math.random() - 0.5) * 0.1; // Range: -0.05 to +0.05
      const intervalWithJitter = TREE_LIFECYCLE_CONFIG.checkInterval * (1 + jitter);
      
      timeoutId = setTimeout(() => {
        if (!isActive) return;
        
        console.log("⏰ TreeLifecycleManager tick - running lifecycle updates...");
        tickTreeLifecycles(); // Age existing trees
        attemptTreeSpawning(); // Try to spawn new trees from adult trees
        detectForests(); // Run forest detection after lifecycle updates and spawning
        scheduleNextCheck(); // Schedule the next check with new random interval
      }, intervalWithJitter);
    };
    
    // Start the first check
    scheduleNextCheck();

    return () => {
      console.log("🛑 TreeLifecycleManager stopped");
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [tickTreeLifecycles, attemptTreeSpawning, detectForests]);

  // This component doesn't render anything visible
  return null;
}
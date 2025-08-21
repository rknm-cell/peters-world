"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useWorldStore } from '~/lib/store';
import { DEER_CONFIG } from '~/lib/constants';

/**
 * DeerSpawningManager - Handles automatic spawning and despawning of deer on suitable terrain areas
 * This component should be included once in the scene to manage deer population
 */
export function DeerSpawningManager() {
  const attemptDeerSpawning = useWorldStore((state) => state.attemptDeerSpawning);
  const attemptDeerDespawning = useWorldStore((state) => state.attemptDeerDespawning);
  const updateDeerMovement = useWorldStore((state) => state.updateDeerMovement);
  const testDeerMovement = useWorldStore((state) => state.testDeerMovement);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const isMovementPausedRef = useRef(false); // Add pause mechanism
  
  // Function to pause/resume movement
  const toggleMovement = useCallback(() => {
    isMovementPausedRef.current = !isMovementPausedRef.current;
    console.log(`🦌 Deer movement ${isMovementPausedRef.current ? 'PAUSED' : 'RESUMED'}`);
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

  // Memoize the movement function
  const moveDeer = useCallback(() => {
    console.warn(`🦌 moveDeer called - isActive: ${isActiveRef.current}, isPaused: ${isMovementPausedRef.current}`);
    if (isActiveRef.current && !isMovementPausedRef.current) {
      console.warn("🦌 moveDeer: Conditions met, calling updateDeerMovement...");
      updateDeerMovement();
    } else {
      console.warn("🦌 moveDeer: Conditions NOT met - movement blocked");
    }
  }, [updateDeerMovement]);

  // Test function to check if movement system works
  const testMovement = useCallback(() => {
    if (isActiveRef.current) {
      console.log("🧪 DeerSpawningManager: Testing movement system...");
      testDeerMovement();
      
      // Wait a bit then test movement update
      setTimeout(() => {
        console.log("🧪 DeerSpawningManager: Testing movement update...");
        updateDeerMovement();
      }, 1000);
    }
  }, [testDeerMovement, updateDeerMovement]);

  // Expose debugging functions globally after all callbacks are defined
  useEffect(() => {
    (window as any).toggleDeerMovement = toggleMovement;
    (window as any).forceDeerMovement = () => {
      console.warn("🔧 Manually triggering deer movement...");
      moveDeer();
    };
    (window as any).testDeerSpawn = () => {
      console.warn("🔧 Manually triggering deer spawn...");
      spawnDeer();
    };
    (window as any).checkDeerState = () => {
      const state = useWorldStore.getState();
      const deer = state.objects.filter(obj => obj.type === "animals/deer");
      console.warn("🔍 Current deer state:", deer);
      deer.forEach(d => {
        console.warn(`   Deer ${d.id}: pos [${d.position.join(', ')}], movement:`, d.deerMovement);
      });
    };
    (window as any).checkSpawnRequirements = () => {
      const state = useWorldStore.getState();
      console.warn("🔍 Spawn requirements check:", {
        hasGlobeRef: !!state.globeRef,
        globeRefType: typeof state.globeRef,
        terrainVerticesCount: state.terrainVertices?.length || 0,
        currentDeerCount: state.objects.filter(obj => obj.type === "animals/deer").length,
        maxDeerInWorld: DEER_CONFIG.maxDeerInWorld,
        totalObjects: state.objects.length,
        objectTypes: [...new Set(state.objects.map(obj => obj.type))]
      });
    };
    return () => {
      delete (window as any).toggleDeerMovement;
      delete (window as any).forceDeerMovement;
      delete (window as any).testDeerSpawn;
      delete (window as any).checkDeerState;
      delete (window as any).checkSpawnRequirements;
    };
  }, [toggleMovement, moveDeer, spawnDeer]);
  
  useEffect(() => {
    // Spawn a deer 1 second after scene loads for debugging
    const immediateSpawnDelay = setTimeout(() => {
      if (isActiveRef.current) {
        console.log("🦌 DeerSpawningManager: Scene loaded, spawning debug deer in 1 second...");
        setTimeout(() => {
          if (isActiveRef.current) {
            console.log("🦌 DeerSpawningManager: Attempting immediate deer spawn for debugging...");
            spawnDeer();
            
            // Start movement immediately after spawning
            setTimeout(() => {
              console.log("🦌 DeerSpawningManager: Starting movement after spawn...");
              
              // Test movement function immediately
              console.log("🦌 DeerSpawningManager: Testing movement function...");
              
              // Test if the function exists
              if (typeof updateDeerMovement === 'function') {
                console.log("🦌 DeerSpawningManager: updateDeerMovement is a function, calling it...");
                try {
                  updateDeerMovement();
                  console.log("🦌 DeerSpawningManager: updateDeerMovement called successfully");
                } catch (error) {
                  console.error("🦌 DeerSpawningManager: Error calling updateDeerMovement:", error);
                }
              } else {
                console.error("🦌 DeerSpawningManager: updateDeerMovement is not a function:", typeof updateDeerMovement);
                console.log("🦌 DeerSpawningManager: Available store functions:", Object.keys(useWorldStore.getState()));
              }
              
              // Additional debugging - check store state directly
              const currentState = useWorldStore.getState();
              console.warn("🦌 Current store state debug:", {
                totalObjects: currentState.objects.length,
                deerObjects: currentState.objects.filter(obj => obj.type === "animals/deer").length,
                objectTypes: currentState.objects.map(obj => obj.type),
                firstDeer: currentState.objects.find(obj => obj.type === "animals/deer")
              });
              
              // Test store state
              const storeState = useWorldStore.getState();
              console.log("🦌 DeerSpawningManager: Store state test:", {
                objectsCount: storeState.objects.length,
                hasDeer: storeState.objects.some(obj => obj.type === "animals/deer"),
                deerCount: storeState.objects.filter(obj => obj.type === "animals/deer").length,
                availableFunctions: Object.keys(storeState).filter(key => typeof (storeState as any)[key] === 'function')
              });
              
              // Test the movement system
              setTimeout(() => {
                console.log("🧪 DeerSpawningManager: Running movement system test...");
                testMovement();
              }, 2000); // Test movement 2 seconds after spawn
              
              // Then start the regular movement interval
              startMovementInterval();
            }, 500); // Start movement 500ms after spawn
          }
        }, 1000); // 1 second delay after scene is ready
      }
    }, 1000); // 1 second to let scene settle
    
    // Start deer movement updates (every 100ms for smooth movement)
    const startMovementInterval = () => {
      if (isActiveRef.current) {
        console.log("🦌 DeerSpawningManager: Starting movement interval...");
        
        // Use recursive setTimeout instead of setInterval for better control
        const runMovement = () => {
          if (isActiveRef.current) {
            console.warn("🦌 DeerSpawningManager: Movement tick - calling updateDeerMovement...");
            moveDeer();
            // Schedule next movement update
            setTimeout(runMovement, DEER_CONFIG.movement.updateInterval);
          }
        };
        
        // Start the first movement update
        runMovement();
      }
    };
    
    // Start movement after a short delay (removed this since we start after spawn now)
    // setTimeout(startMovementInterval, 3000);
    
    // Add a delay before starting to avoid spawning during initial scene setup
    const startDelay = setTimeout(() => {
      if (isActiveRef.current) {
        console.log("🦌 DeerSpawningManager: Starting regular deer management cycle...");
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
      if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
      }
    };
  }, [spawnDeer, despawnDeer, moveDeer, testMovement]);

  // This component doesn't render anything visible
  return null;
}

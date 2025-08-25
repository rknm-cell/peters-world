import { useState, useCallback } from 'react';

interface PlacementDebugState {
  enabled: boolean;
  problematicOnly: boolean;
  density: number;
}

/**
 * Hook for managing placement debug visualization state
 */
export function usePlacementDebug() {
  const [debugState, setDebugState] = useState<PlacementDebugState>({
    enabled: false,
    problematicOnly: false,
    density: 16
  });

  const toggleDebug = useCallback((enabled: boolean) => {
    setDebugState(prev => ({ ...prev, enabled }));
  }, []);

  const toggleProblematicOnly = useCallback((problematicOnly: boolean) => {
    setDebugState(prev => ({ ...prev, problematicOnly }));
  }, []);

  const setDensity = useCallback((density: number) => {
    setDebugState(prev => ({ ...prev, density }));
  }, []);

  return {
    debugState,
    toggleDebug,
    toggleProblematicOnly,
    setDensity
  };
}

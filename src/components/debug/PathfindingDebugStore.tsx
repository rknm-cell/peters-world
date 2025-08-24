"use client";

import { create } from 'zustand';

interface PathfindingDebugState {
  showPathfinding: boolean;
  showTargets: boolean;
  showPaths: boolean;
  showDecisions: boolean;
  showCollisionChecks: boolean;
  pathColor: string;
  targetColor: string;
  
  togglePathfinding: () => void;
  setShowTargets: (show: boolean) => void;
  setShowPaths: (show: boolean) => void;
  setShowDecisions: (show: boolean) => void;
  setShowCollisionChecks: (show: boolean) => void;
  setPathColor: (color: string) => void;
  setTargetColor: (color: string) => void;
}

export const usePathfindingDebugStore = create<PathfindingDebugState>((set) => ({
  showPathfinding: false,
  showTargets: true,
  showPaths: true,
  showDecisions: true,
  showCollisionChecks: false,
  pathColor: '#ffff00',
  targetColor: '#ff0000',
  
  togglePathfinding: () => set((state) => ({ 
    showPathfinding: !state.showPathfinding 
  })),
  
  setShowTargets: (show) => set({ showTargets: show }),
  setShowPaths: (show) => set({ showPaths: show }),
  setShowDecisions: (show) => set({ showDecisions: show }),
  setShowCollisionChecks: (show) => set({ showCollisionChecks: show }),
  setPathColor: (color) => set({ pathColor: color }),
  setTargetColor: (color) => set({ targetColor: color }),
}));

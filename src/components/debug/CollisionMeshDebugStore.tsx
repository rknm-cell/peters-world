"use client";

import { create } from "zustand";

interface CollisionDebugState {
  showCollisionMesh: boolean;
  wireframe: boolean;
  opacity: number;
  color: string;
  toggleCollisionMesh: () => void;
  setWireframe: (wireframe: boolean) => void;
  setOpacity: (opacity: number) => void;
  setColor: (color: string) => void;
}

export const useCollisionDebugStore = create<CollisionDebugState>((set) => ({
  showCollisionMesh: false,
  wireframe: true,
  opacity: 0.3,
  color: "#00ff00",

  toggleCollisionMesh: () =>
    set((state) => ({
      showCollisionMesh: !state.showCollisionMesh,
    })),

  setWireframe: (wireframe) => set({ wireframe }),
  setOpacity: (opacity) => set({ opacity }),
  setColor: (color) => set({ color }),
}));

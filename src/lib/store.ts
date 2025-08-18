import { create } from "zustand";
import type { Vector3 } from "three";

export interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export type TimeOfDay = "day" | "sunset" | "night";

interface WorldState {
  objects: PlacedObject[];
  selectedObject: string | null;
  selectedObjectType: string | null;
  timeOfDay: TimeOfDay;
  isPlacing: boolean;
  showDebugNormals: boolean;
  showWireframe: boolean;

  // Actions
  addObject: (type: string, position: Vector3) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  updateTimeOfDay: (time: TimeOfDay) => void;
  setPlacing: (placing: boolean) => void;
  updateObject: (id: string, updates: Partial<PlacedObject>) => void;
  setSelectedObjectType: (type: string | null) => void;
  setShowDebugNormals: (show: boolean) => void;
  setShowWireframe: (show: boolean) => void;
  exitPlacementMode: () => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  objects: [],
  selectedObject: null,
  selectedObjectType: null,
  timeOfDay: "day",
  isPlacing: false,
  showDebugNormals: false,
  showWireframe: false,

  addObject: (type: string, position: Vector3) => {
    const id = Math.random().toString(36).substring(7);
    const newObject: PlacedObject = {
      id,
      type,
      position: [position.x, position.y, position.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    set((state) => ({
      objects: [...state.objects, newObject],
      selectedObject: id,
      // Keep isPlacing as true so user can continue placing more objects
      isPlacing: true,
    }));
  },

  removeObject: (id: string) => {
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedObject: state.selectedObject === id ? null : state.selectedObject,
    }));
  },

  selectObject: (id: string | null) => {
    set({ selectedObject: id });
  },

  updateTimeOfDay: (time: TimeOfDay) => {
    set({ timeOfDay: time });
  },

  setPlacing: (placing: boolean) => {
    set({ isPlacing: placing });
  },

  exitPlacementMode: () => {
    set({ isPlacing: false, selectedObjectType: null });
  },

  updateObject: (id: string, updates: Partial<PlacedObject>) => {
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, ...updates } : obj,
      ),
    }));
  },

  setSelectedObjectType: (type: string | null) => {
    set({ selectedObjectType: type });
  },

  setShowDebugNormals: (show: boolean) => {
    set({ showDebugNormals: show });
  },

  setShowWireframe: (show: boolean) => {
    set({ showWireframe: show });
  },
}));

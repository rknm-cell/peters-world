import { create } from 'zustand';
import { Vector3 } from 'three';

export interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export type TimeOfDay = 'day' | 'sunset' | 'night';

interface WorldState {
  objects: PlacedObject[];
  selectedObject: string | null;
  selectedObjectType: string | null;
  timeOfDay: TimeOfDay;
  isPlacing: boolean;
  
  // Actions
  addObject: (type: string, position: Vector3) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  updateTimeOfDay: (time: TimeOfDay) => void;
  setPlacing: (placing: boolean) => void;
  updateObject: (id: string, updates: Partial<PlacedObject>) => void;
  setSelectedObjectType: (type: string | null) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  objects: [],
  selectedObject: null,
  timeOfDay: 'day',
  isPlacing: false,

  addObject: (type: string, position: Vector3) => {
    const id = Math.random().toString(36).substring(7);
    const newObject: PlacedObject = {
      id,
      type,
      position: [position.x, position.y, position.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    
    set(state => ({
      objects: [...state.objects, newObject],
      selectedObject: id,
      isPlacing: false,
    }));
  },

  removeObject: (id: string) => {
    set(state => ({
      objects: state.objects.filter(obj => obj.id !== id),
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

  updateObject: (id: string, updates: Partial<PlacedObject>) => {
    set(state => ({
      objects: state.objects.map(obj => 
        obj.id === id ? { ...obj, ...updates } : obj
      ),
    }));
  },
}));
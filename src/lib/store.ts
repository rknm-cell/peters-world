import { create } from "zustand";
import type { Vector3 } from "three";
import { TerrainOctree } from "./utils/spatial-partitioning";
import { TREE_LIFECYCLE, TREE_LIFECYCLE_CONFIG } from "./constants";

export type TreeLifecycleStage = 
  | "youth-small" | "youth-medium" | "youth-medium-high" | "youth-big"
  | "adult" 
  | "dead-standing" | "broken" | "logs";

export interface TreeLifecycleData {
  stage: TreeLifecycleStage;
  stageStartTime: number; // timestamp when current stage started
  adultTreeType?: string; // which adult tree type this will become
  deathTreeType?: string; // which death model to use
}

export interface PlacedObject {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  treeLifecycle?: TreeLifecycleData; // Only for tree objects
}

export interface TerrainVertex {
  x: number;
  y: number;
  z: number;
  height: number;
  waterLevel: number;
}

export type TimeOfDay = "day" | "sunset" | "night";
export type TerraformMode = "raise" | "lower" | "water" | "smooth" | "none";

interface WorldState {
  objects: PlacedObject[];
  selectedObject: string | null;
  selectedObjectType: string | null;
  timeOfDay: TimeOfDay;
  isPlacing: boolean;
  showDebugNormals: boolean;
  showWireframe: boolean;
  
  // Terrain state
  terrainVertices: TerrainVertex[];
  terrainOctree: TerrainOctree | null;
  terraformMode: TerraformMode;
  brushSize: number;
  brushStrength: number;
  isTerraforming: boolean;

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
  
  // Tree lifecycle actions
  advanceTreeLifecycle: (id: string) => void;
  updateTreeStage: (id: string, stage: TreeLifecycleStage) => void;
  tickTreeLifecycles: () => void;
  
  // Terrain actions
  setTerraformMode: (mode: TerraformMode) => void;
  setBrushSize: (size: number) => void;
  setBrushStrength: (strength: number) => void;
  setIsTerraforming: (isTerraforming: boolean) => void;
  updateTerrainVertex: (index: number, updates: Partial<TerrainVertex>) => void;
  setTerrainVertices: (vertices: TerrainVertex[]) => void;
  updateTerrainOctree: () => void;
  resetTerrain: () => void;
}

export const useWorldStore = create<WorldState>((set, _get) => ({
  objects: [],
  selectedObject: null,
  selectedObjectType: null,
  timeOfDay: "day",
  isPlacing: false,
  showDebugNormals: false,
  showWireframe: false,
  
  // Terrain state
  terrainVertices: [],
  terrainOctree: null,
  terraformMode: "none",
  brushSize: 0.5,
  brushStrength: 0.1,
  isTerraforming: false,

  addObject: (type: string, position: Vector3) => {
    const id = Math.random().toString(36).substring(7);
    const newObject: PlacedObject = {
      id,
      type,
      position: [position.x, position.y, position.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    // Initialize tree lifecycle if it's a tree
    if ((TREE_LIFECYCLE.adult as readonly string[]).includes(type) || type === "tree") {
      const adultTreeType = type === "tree" ? TREE_LIFECYCLE.adult[Math.floor(Math.random() * TREE_LIFECYCLE.adult.length)] : type;
      newObject.treeLifecycle = {
        stage: "adult",
        stageStartTime: Date.now(),
        adultTreeType,
      };
      // Use the actual adult tree type for user-placed trees
      newObject.type = adultTreeType!;
    }

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
  
  // Terrain actions
  setTerraformMode: (mode: TerraformMode) => {
    set({ terraformMode: mode });
  },
  
  setBrushSize: (size: number) => {
    set({ brushSize: size });
  },
  
  setBrushStrength: (strength: number) => {
    set({ brushStrength: strength });
  },
  
  setIsTerraforming: (isTerraforming: boolean) => {
    set({ isTerraforming });
  },
  
  updateTerrainVertex: (index: number, updates: Partial<TerrainVertex>) => {
    set((state) => ({
      terrainVertices: state.terrainVertices.map((vertex, i) =>
        i === index ? { ...vertex, ...updates } : vertex
      ),
    }));
  },
  
  setTerrainVertices: (vertices: TerrainVertex[]) => {
    set({ terrainVertices: vertices });
  },
  
  updateTerrainOctree: () => {
    set((state) => {
      if (state.terrainVertices.length === 0) {
        return { terrainOctree: null };
      }
      
      const octree = new TerrainOctree(6);
      octree.partitionVertices(state.terrainVertices);
      return { terrainOctree: octree };
    });
  },
  
  resetTerrain: () => {
    set({ terrainVertices: [], terrainOctree: null });
  },
  
  // Tree lifecycle functions
  advanceTreeLifecycle: (id: string) => {
    set((state) => {
      const object = state.objects.find(obj => obj.id === id);
      if (!object?.treeLifecycle) return state;

      const { stage, adultTreeType } = object.treeLifecycle;
      const now = Date.now();
      let newStage: TreeLifecycleStage = stage;
      let newType = object.type;
      let deathTreeType = object.treeLifecycle.deathTreeType;

      // Determine next stage based on current stage
      switch (stage) {
        case "youth-small":
          // Check if tree should die or grow
          if (Math.random() < TREE_LIFECYCLE_CONFIG.deathProbability.youthSmall) {
            newStage = "dead-standing";
            const selectedDeathType = TREE_LIFECYCLE.death.standing[Math.floor(Math.random() * TREE_LIFECYCLE.death.standing.length)]!;
            deathTreeType = selectedDeathType;
            newType = selectedDeathType;
          } else {
            newStage = "youth-medium";
            newType = TREE_LIFECYCLE.youth.medium;
          }
          break;
        case "youth-medium":
          if (Math.random() < TREE_LIFECYCLE_CONFIG.deathProbability.youthMedium) {
            newStage = "dead-standing";
            const selectedDeathType = TREE_LIFECYCLE.death.standing[Math.floor(Math.random() * TREE_LIFECYCLE.death.standing.length)]!;
            deathTreeType = selectedDeathType;
            newType = selectedDeathType;
          } else {
            newStage = "youth-medium-high";
            newType = TREE_LIFECYCLE.youth.mediumHigh;
          }
          break;
        case "youth-medium-high":
          if (Math.random() < TREE_LIFECYCLE_CONFIG.deathProbability.youthMediumHigh) {
            newStage = "dead-standing";
            const selectedDeathType = TREE_LIFECYCLE.death.standing[Math.floor(Math.random() * TREE_LIFECYCLE.death.standing.length)]!;
            deathTreeType = selectedDeathType;
            newType = selectedDeathType;
          } else {
            newStage = "youth-big";
            newType = TREE_LIFECYCLE.youth.big;
          }
          break;
        case "youth-big":
          if (Math.random() < TREE_LIFECYCLE_CONFIG.deathProbability.youthBig) {
            newStage = "dead-standing";
            const selectedDeathType = TREE_LIFECYCLE.death.standing[Math.floor(Math.random() * TREE_LIFECYCLE.death.standing.length)]!;
            deathTreeType = selectedDeathType;
            newType = selectedDeathType;
          } else {
            newStage = "adult";
            newType = adultTreeType ?? "tree";
          }
          break;
        case "adult":
          if (Math.random() < TREE_LIFECYCLE_CONFIG.deathProbability.adult) {
            newStage = "dead-standing";
            const selectedDeathType = TREE_LIFECYCLE.death.standing[Math.floor(Math.random() * TREE_LIFECYCLE.death.standing.length)]!;
            deathTreeType = selectedDeathType;
            newType = selectedDeathType;
          }
          break;
        case "dead-standing":
          newStage = "broken";
          newType = TREE_LIFECYCLE.death.broken;
          break;
        case "broken":
          newStage = "logs";
          newType = TREE_LIFECYCLE.death.logs[Math.floor(Math.random() * TREE_LIFECYCLE.death.logs.length)]!;
          break;
        case "logs":
          // Final stage - logs stay forever, no further progression
          return state;
      }

      return {
        objects: state.objects.map(obj =>
          obj.id === id
            ? {
                ...obj,
                type: newType,
                treeLifecycle: {
                  ...obj.treeLifecycle!,
                  stage: newStage,
                  stageStartTime: now,
                  deathTreeType,
                }
              }
            : obj
        )
      };
    });
  },

  updateTreeStage: (id: string, stage: TreeLifecycleStage) => {
    set((state) => ({
      objects: state.objects.map(obj =>
        obj.id === id && obj.treeLifecycle
          ? {
              ...obj,
              treeLifecycle: {
                ...obj.treeLifecycle,
                stage,
                stageStartTime: Date.now(),
              }
            }
          : obj
      )
    }));
  },

  tickTreeLifecycles: () => {
    set((state) => {
      const now = Date.now();
      let hasChanges = false;
      
      const updatedObjects = state.objects.map(obj => {
        if (!obj.treeLifecycle) return obj;
        
        const { stage, stageStartTime } = obj.treeLifecycle;
        const stageAge = (now - stageStartTime) / 1000; // Convert to seconds
        
        let shouldAdvance = false;
        
        // Check if enough time has passed for this stage
        switch (stage) {
          case "youth-small":
            shouldAdvance = stageAge >= TREE_LIFECYCLE_CONFIG.stageDurations.youthSmall;
            break;
          case "youth-medium":
            shouldAdvance = stageAge >= TREE_LIFECYCLE_CONFIG.stageDurations.youthMedium;
            break;
          case "youth-medium-high":
            shouldAdvance = stageAge >= TREE_LIFECYCLE_CONFIG.stageDurations.youthMediumHigh;
            break;
          case "youth-big":
            shouldAdvance = stageAge >= TREE_LIFECYCLE_CONFIG.stageDurations.youthBig;
            break;
          case "adult":
            shouldAdvance = stageAge >= TREE_LIFECYCLE_CONFIG.stageDurations.adult;
            break;
          case "dead-standing":
            shouldAdvance = stageAge >= TREE_LIFECYCLE_CONFIG.stageDurations.deadStanding;
            break;
          case "broken":
            shouldAdvance = stageAge >= TREE_LIFECYCLE_CONFIG.stageDurations.broken;
            break;
          case "logs":
            // Logs are permanent - never advance
            shouldAdvance = false;
            break;
        }
        
        if (shouldAdvance) {
          hasChanges = true;
          // Trigger advancement for this tree
          setTimeout(() => _get().advanceTreeLifecycle(obj.id), 0);
        }
        
        return obj;
      });
      
      return hasChanges ? { objects: updatedObjects } : state;
    });
  },
}));

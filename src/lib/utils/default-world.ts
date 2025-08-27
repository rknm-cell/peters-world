import type { PlacedObject, TerrainVertex, TimeOfDay, TerraformMode } from "../store";
import type { SerializedWorld } from "./world-serialization";

// Default world template - captured from a curated development world
const DEFAULT_WORLD_TEMPLATE: SerializedWorld = {
  version: "1.0.0",
  objects: [
    // A few starter trees to create a nice scene
    {
      id: "default-tree-1",
      type: "tree-oak.glb",
      position: [0.3, 0, 1.05],
      rotation: [0, 0.5, 0],
      scale: [1, 1, 1],
      treeLifecycle: {
        stage: "adult",
        stageStartTime: Date.now() - 30000, // Started 30 seconds ago
        adultTreeType: "tree-oak.glb",
        isPartOfForest: false
      }
    },
    {
      id: "default-tree-2", 
      type: "tree-birch.glb",
      position: [-0.4, 0, 1.02],
      rotation: [0, -0.8, 0],
      scale: [0.9, 0.9, 0.9],
      treeLifecycle: {
        stage: "adult",
        stageStartTime: Date.now() - 45000, // Started 45 seconds ago
        adultTreeType: "tree-birch.glb",
        isPartOfForest: false
      }
    },
    {
      id: "default-tree-3",
      type: "tree-maple.glb", 
      position: [0, 0, 1.08],
      rotation: [0, 1.2, 0],
      scale: [1.1, 1.1, 1.1],
      treeLifecycle: {
        stage: "adult",
        stageStartTime: Date.now() - 60000, // Started 1 minute ago
        adultTreeType: "tree-maple.glb",
        isPartOfForest: false
      }
    },
    // Some grass around the trees
    {
      id: "default-grass-1",
      type: "grass/grass-basic.glb",
      position: [0.5, 0, 1.01],
      rotation: [0, 0.3, 0],
      scale: [1, 1, 1]
    },
    {
      id: "default-grass-2",
      type: "grass/grass-tall.glb",
      position: [-0.2, 0, 1.03],
      rotation: [0, -0.5, 0],
      scale: [0.8, 0.8, 0.8]
    },
    {
      id: "default-grass-3",
      type: "grass/grass-clumb.glb",
      position: [0.1, 0, 1.06],
      rotation: [0, 1.8, 0],
      scale: [1.2, 1.2, 1.2]
    },
    // A friendly deer
    {
      id: "default-deer-1",
      type: "animals/deer.glb",
      position: [-0.6, 0, 1.01],
      rotation: [0, 0.7, 0],
      scale: [1, 1, 1]
    },
    // Some decorative flowers
    {
      id: "default-flower-1",
      type: "decorations/flower-red.glb",
      position: [0.7, 0, 1.02],
      rotation: [0, -0.2, 0],
      scale: [1, 1, 1]
    },
    {
      id: "default-flower-2",
      type: "decorations/roses.glb",
      position: [-0.8, 0, 1.04],
      rotation: [0, 1.5, 0],
      scale: [0.9, 0.9, 0.9]
    }
  ],
  terrain: {
    vertices: [], // Start with flat terrain
    terraformMode: "none",
    brushSize: 0.5,
    brushStrength: 0.1
  },
  environment: {
    timeOfDay: "day"
  },
  metadata: {
    created: Date.now(),
    objectCount: 9
  }
};

export interface DefaultWorldState {
  objects: PlacedObject[];
  terrainVertices: TerrainVertex[];
  terraformMode: TerraformMode;
  brushSize: number;
  brushStrength: number;
  timeOfDay: TimeOfDay;
}

/**
 * Get the default world state for new users
 */
export function getDefaultWorld(): DefaultWorldState {
  return {
    objects: DEFAULT_WORLD_TEMPLATE.objects,
    terrainVertices: DEFAULT_WORLD_TEMPLATE.terrain.vertices,
    terraformMode: DEFAULT_WORLD_TEMPLATE.terrain.terraformMode,
    brushSize: DEFAULT_WORLD_TEMPLATE.terrain.brushSize,
    brushStrength: DEFAULT_WORLD_TEMPLATE.terrain.brushStrength,
    timeOfDay: DEFAULT_WORLD_TEMPLATE.environment.timeOfDay,
  };
}

/**
 * Capture current world state as a default template
 * This function can be called from the browser console during development
 * to capture a curated world as the new default
 */
export function captureCurrentWorldAsDefault(worldState: DefaultWorldState): SerializedWorld {
  const template: SerializedWorld = {
    version: "1.0.0",
    objects: worldState.objects.map(obj => ({
      ...obj,
      // Reset timestamps for tree lifecycle to be relative to when users load
      treeLifecycle: obj.treeLifecycle ? {
        ...obj.treeLifecycle,
        stageStartTime: Date.now() - Math.random() * 60000 // Random offset up to 1 minute ago
      } : undefined
    })),
    terrain: {
      vertices: worldState.terrainVertices,
      terraformMode: worldState.terraformMode,
      brushSize: worldState.brushSize,
      brushStrength: worldState.brushStrength
    },
    environment: {
      timeOfDay: worldState.timeOfDay
    },
    metadata: {
      created: Date.now(),
      objectCount: worldState.objects.length
    }
  };

  console.log("🎨 Captured world template:", JSON.stringify(template, null, 2));
  console.log("📋 Copy this template to update DEFAULT_WORLD_TEMPLATE in default-world.ts");
  
  return template;
}

/**
 * Check if we should load the default world (no saved data exists)
 */
export function shouldLoadDefaultWorld(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const saved = localStorage.getItem("tiny-world-autosave");
    return !saved;
  } catch {
    return true; // If localStorage fails, assume we should load default
  }
}

/**
 * Development helper: Make capture function available globally
 */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).captureWorldAsDefault = () => {
    const { useWorldStore } = require("../store");
    const state = useWorldStore.getState();
    return captureCurrentWorldAsDefault({
      objects: state.objects,
      terrainVertices: state.terrainVertices,
      terraformMode: state.terraformMode,
      brushSize: state.brushSize,
      brushStrength: state.brushStrength,
      timeOfDay: state.timeOfDay,
    });
  };
  
  console.log("🛠️ Development helper available: window.captureWorldAsDefault()");
}

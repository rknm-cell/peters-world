import type { PlacedObject, TerrainVertex, TimeOfDay, TerraformMode } from "../store";
import type { SerializedWorld } from "./world-serialization";
// Import the curated default world template
import defaultWorldTemplateJson from "../default/default-world-template.json";

// Load the default world template from JSON file
const DEFAULT_WORLD_TEMPLATE: SerializedWorld = defaultWorldTemplateJson as SerializedWorld;

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
 * Randomizes tree lifecycle timestamps to create variety
 */
export function getDefaultWorld(): DefaultWorldState {
  const currentTime = Date.now();
  
  // Process objects to randomize tree lifecycle timestamps
  const processedObjects = DEFAULT_WORLD_TEMPLATE.objects.map(obj => {
    if (obj.treeLifecycle) {
      return {
        ...obj,
        treeLifecycle: {
          ...obj.treeLifecycle,
          // Randomize stage start time to be within the last 2 minutes
          stageStartTime: currentTime - Math.random() * 120000, // 0-2 minutes ago
        }
      };
    }
    return obj;
  });

  return {
    objects: processedObjects,
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
  console.log("📋 Copy this template to update src/lib/default/default-world-template.json");
  
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
 * Development helper: Console logging for capture availability
 * The capture function is available through the UI button in development mode
 */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("🛠️ Development capture available via 'Capture Default' button in create page");
}

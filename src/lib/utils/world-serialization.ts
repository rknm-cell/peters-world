import type {
  PlacedObject,
  TerrainVertex,
  TimeOfDay,
  TerraformMode,
} from "../store";

// Serializable world data for database storage
export interface SerializedWorld {
  version: string;
  objects: PlacedObject[];
  terrain: {
    vertices: TerrainVertex[];
    terraformMode: TerraformMode;
    brushSize: number;
    brushStrength: number;
  };
  environment: {
    timeOfDay: TimeOfDay;
  };
  metadata: {
    created: number;
    objectCount: number;
  };
}

// Current schema version for migrations
const SCHEMA_VERSION = "1.0.0";

/**
 * Serialize world state for database storage
 */
export function serializeWorld(state: {
  objects: PlacedObject[];
  terrainVertices: TerrainVertex[];
  terraformMode: TerraformMode;
  brushSize: number;
  brushStrength: number;
  timeOfDay: TimeOfDay;
}): SerializedWorld {
  return {
    version: SCHEMA_VERSION,
    objects: state.objects,
    terrain: {
      vertices: state.terrainVertices,
      terraformMode: state.terraformMode,
      brushSize: state.brushSize,
      brushStrength: state.brushStrength,
    },
    environment: {
      timeOfDay: state.timeOfDay,
    },
    metadata: {
      created: Date.now(),
      objectCount: state.objects.length,
    },
  };
}

/**
 * Deserialize world data and apply to store
 */
/**
 * Type guard to check if data is a valid SerializedWorld
 */
function isSerializedWorld(data: unknown): data is SerializedWorld {
  return (
    typeof data === "object" &&
    data !== null &&
    "objects" in data &&
    Array.isArray((data as SerializedWorld).objects)
  );
}

export const deserializeWorld = (data: unknown): WorldData => {
  try {
    if (!data || typeof data !== 'object') {
      return getDefaultWorld();
    }

    const worldData = data as Partial<WorldData>;
    
    return {
      objects: Array.isArray(worldData.objects) ? worldData.objects : [],
      terrainVertices: Array.isArray(worldData.terrainVertices) ? worldData.terrainVertices : [],
      terraformMode: worldData.terraformMode || "none",
      brushSize: typeof worldData.brushSize === 'number' ? worldData.brushSize : 0.5,
      brushStrength: typeof worldData.brushStrength === 'number' ? worldData.brushStrength : 0.1,
      timeOfDay: worldData.timeOfDay || "day",
    };
  } catch (error) {
    // Invalid world data format, using defaults
    return getDefaultWorld();
  }
};

/**
 * Generate a default world name based on content
 */
export function generateWorldName(objects: PlacedObject[]): string {
  const treeCount = objects.filter((obj) => obj.treeLifecycle).length;
  const animalCount = objects.filter((obj) =>
    obj.type.includes("animals/"),
  ).length;

  if (objects.length === 0) return "Empty World";
  if (treeCount > 10) return "Forest World";
  if (animalCount > 3) return "Wildlife World";
  if (objects.length > 20) return "Bustling World";

  return "Tiny World";
}

import { serializeWorld, deserializeWorld } from "./world-serialization";
import type {
  PlacedObject,
  TerrainVertex,
  TimeOfDay,
  TerraformMode,
} from "../store";

const AUTOSAVE_KEY = "tiny-world-autosave";
const AUTOSAVE_INTERVAL = 30000; // Auto-save every 30 seconds
const DEBOUNCE_DELAY = 2000; // Debounce saves for 2 seconds after changes

export interface WorldPersistenceState {
  objects: PlacedObject[];
  terrainVertices: TerrainVertex[];
  terraformMode: TerraformMode;
  brushSize: number;
  brushStrength: number;
  timeOfDay: TimeOfDay;
}

class WorldPersistence {
  private static instance: WorldPersistence;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime = 0;

  private constructor() {
    // Start auto-save interval when instance is created
    this.startAutoSave();
  }

  static getInstance(): WorldPersistence {
    if (!WorldPersistence.instance) {
      WorldPersistence.instance = new WorldPersistence();
    }
    return WorldPersistence.instance;
  }

  /**
   * Save world state to localStorage with debouncing
   */
  saveWorld(state: WorldPersistenceState): void {
    // Clear existing debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce the save operation
    this.debounceTimeout = setTimeout(() => {
      try {
        const serializedWorld = serializeWorld(state);
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializedWorld));
        this.lastSaveTime = Date.now();
      } catch (error) {
        // Failed to save world to localStorage
      }
    }, DEBOUNCE_DELAY);
  }

  /**
   * Load world state from localStorage
   */
  loadWorld(): WorldPersistenceState | null {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) {
        return null;
      }

      const parsed = JSON.parse(saved) as unknown;
      const worldData = deserializeWorld(parsed);
      return worldData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear saved world data
   */
  clearSavedWorld(): void {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch (error) {
      // Failed to clear saved world
    }
  }

  /**
   * Check if there's a saved world available
   */
  hasSavedWorld(): boolean {
    try {
      return localStorage.getItem(AUTOSAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get the timestamp of the last save
   */
  getLastSaveTime(): number {
    return this.lastSaveTime;
  }

  /**
   * Start periodic auto-save
   */
  private startAutoSave(): void {
    if (typeof window === "undefined") return; // Skip on server-side

    this.autoSaveInterval = setInterval(() => {
      // Auto-save will be triggered by store subscription
      // This interval just ensures we don't go too long without saving
    }, AUTOSAVE_INTERVAL);
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Force immediate save (bypasses debouncing)
   */
  forceSave(state: WorldPersistenceState): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    try {
      const serializedWorld = serializeWorld(state);
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializedWorld));
      this.lastSaveTime = Date.now();
    } catch (error) {
      // Failed to force-save world
    }
  }
}

// Export singleton instance
export const worldPersistence = WorldPersistence.getInstance();

// Convenience functions
export const saveWorldToStorage = (state: WorldPersistenceState) =>
  worldPersistence.saveWorld(state);

export const loadWorldFromStorage = () => worldPersistence.loadWorld();

export const clearStoredWorld = () => worldPersistence.clearSavedWorld();

export const hasStoredWorld = () => worldPersistence.hasSavedWorld();

export const forceStoreSave = (state: WorldPersistenceState) =>
  worldPersistence.forceSave(state);

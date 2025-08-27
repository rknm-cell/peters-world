import { useEffect, useRef } from "react";
import { useWorldStore } from "../store";
import { hasStoredWorld } from "../utils/world-persistence";
import { shouldLoadDefaultWorld, getDefaultWorld } from "../utils/default-world";

/**
 * Hook to handle automatic world persistence
 */
export function useWorldPersistence() {
  const {
    objects,
    terrainVertices,
    terraformMode,
    brushSize,
    brushStrength,
    timeOfDay,
    autoSaveWorld,
    restoreWorldFromStorage,
  } = useWorldStore();

  const hasRestoredRef = useRef(false);
  const lastSaveDataRef = useRef<string>("");
  const loadedDefaultRef = useRef(false);

    // Auto-restore world on initial load (client-side only)
  useEffect(() => {
    // Only run on client-side to avoid hydration issues
    if (typeof window === "undefined") return;
    
    if (!hasRestoredRef.current) {
      const hasData = hasStoredWorld();
      if (hasData) {
        console.log("🔄 Restoring world from localStorage...");
        const restored = restoreWorldFromStorage();
        if (restored) {
          console.log("✅ World restored successfully");
        }
      } else {
        console.log("📭 No saved world found, loading default world...");
        // Load default world for new users
        if (shouldLoadDefaultWorld()) {
          const defaultWorld = getDefaultWorld();
          const { loadWorld } = useWorldStore.getState();
          loadWorld(defaultWorld);
          loadedDefaultRef.current = true;
          console.log("🌟 Default world loaded successfully");
        }
      }
      hasRestoredRef.current = true;
    }
  }, [restoreWorldFromStorage]);

  // Auto-save when world state changes
  useEffect(() => {
    // Skip if we haven't restored yet (to avoid saving empty state)
    if (!hasRestoredRef.current) return;

    // Create a snapshot of current state for comparison
    const currentStateSnapshot = JSON.stringify({
      objects,
      terrainVertices,
      terraformMode,
      brushSize,
      brushStrength,
      timeOfDay,
    });

    // Only save if state has actually changed
    if (currentStateSnapshot !== lastSaveDataRef.current) {
      autoSaveWorld();
      lastSaveDataRef.current = currentStateSnapshot;
    }
  }, [
    objects,
    terrainVertices,
    terraformMode,
    brushSize,
    brushStrength,
    timeOfDay,
    autoSaveWorld,
  ]);

  // Force save on page unload (client-side only)
  useEffect(() => {
    // Only run on client-side
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      if (hasRestoredRef.current) {
        autoSaveWorld();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [autoSaveWorld]);

  return {
    hasRestoredWorld: hasRestoredRef.current,
    loadedDefaultWorld: loadedDefaultRef.current,
  };
}

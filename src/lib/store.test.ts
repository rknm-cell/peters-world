import { describe, it, expect, beforeEach } from "bun:test";
import { useWorldStore } from "./store";

describe("World Store - Terrain Management", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useWorldStore.getState();
    store.resetTerrain();
    store.setTerraformMode("none");
    store.setIsTerraforming(false);
    store.setBrushSize(0.5);
    store.setBrushStrength(0.1);
  });

  describe("Terrain State Initialization", () => {
    it("should initialize with default terrain values", () => {
      const state = useWorldStore.getState();
      
      expect(state.terrainVertices).toEqual([]);
      expect(state.terraformMode).toBe("none");
      expect(state.brushSize).toBe(0.5);
      expect(state.brushStrength).toBe(0.1);
      expect(state.isTerraforming).toBe(false);
    });
  });

  describe("Terraform Mode Management", () => {
    it("should set terraform mode correctly", () => {
      const store = useWorldStore.getState();
      
      store.setTerraformMode("raise");
      expect(useWorldStore.getState().terraformMode).toBe("raise");
      
      store.setTerraformMode("water");
      expect(useWorldStore.getState().terraformMode).toBe("water");
      
      store.setTerraformMode("smooth");
      expect(useWorldStore.getState().terraformMode).toBe("smooth");
    });
  });

  describe("Brush Controls", () => {
    it("should set brush size within valid range", () => {
      const store = useWorldStore.getState();
      
      store.setBrushSize(1.0);
      expect(useWorldStore.getState().brushSize).toBe(1.0);
      
      store.setBrushSize(0.1);
      expect(useWorldStore.getState().brushSize).toBe(0.1);
      
      store.setBrushSize(2.0);
      expect(useWorldStore.getState().brushSize).toBe(2.0);
    });

    it("should set brush strength within valid range", () => {
      const store = useWorldStore.getState();
      
      store.setBrushStrength(0.25);
      expect(useWorldStore.getState().brushStrength).toBe(0.25);
      
      store.setBrushStrength(0.01);
      expect(useWorldStore.getState().brushStrength).toBe(0.01);
      
      store.setBrushStrength(0.5);
      expect(useWorldStore.getState().brushStrength).toBe(0.5);
    });
  });

  describe("Terraforming State", () => {
    it("should set terraforming state correctly", () => {
      const store = useWorldStore.getState();
      
      store.setIsTerraforming(true);
      expect(useWorldStore.getState().isTerraforming).toBe(true);
      
      store.setIsTerraforming(false);
      expect(useWorldStore.getState().isTerraforming).toBe(false);
    });
  });

  describe("Terrain Vertices Management", () => {
    it("should set terrain vertices correctly", () => {
      const store = useWorldStore.getState();
      const testVertices = [
        { x: 0, y: 0, z: 6, height: 0, waterLevel: 0 },
        { x: 1, y: 0, z: 6, height: 0.5, waterLevel: 0.2 },
      ];
      
      store.setTerrainVertices(testVertices);
      expect(useWorldStore.getState().terrainVertices).toEqual(testVertices);
    });

    it("should update individual terrain vertices correctly", () => {
      const store = useWorldStore.getState();
      const testVertices = [
        { x: 0, y: 0, z: 6, height: 0, waterLevel: 0 },
        { x: 1, y: 0, z: 6, height: 0, waterLevel: 0 },
      ];
      
      store.setTerrainVertices(testVertices);
      
      // Update first vertex
      store.updateTerrainVertex(0, { height: 1.0, waterLevel: 0.5 });
      
      const updatedState = useWorldStore.getState();
      expect(updatedState.terrainVertices[0].height).toBe(1.0);
      expect(updatedState.terrainVertices[0].waterLevel).toBe(0.5);
      expect(updatedState.terrainVertices[1]).toEqual(testVertices[1]); // Unchanged
    });
  });

  describe("Terrain Reset", () => {
    it("should reset terrain to initial state", () => {
      const store = useWorldStore.getState();
      
      // Set some terrain data
      store.setTerraformMode("raise");
      store.setIsTerraforming(true);
      store.setBrushSize(1.0);
      store.setBrushStrength(0.3);
      store.setTerrainVertices([
        { x: 0, y: 0, z: 6, height: 1.0, waterLevel: 0.5 },
      ]);
      
      // Reset terrain
      store.resetTerrain();
      
      const resetState = useWorldStore.getState();
      expect(resetState.terrainVertices).toEqual([]);
      // Note: resetTerrain only resets vertices, not other settings
    });
  });

  describe("Store Integration", () => {
    it("should maintain other state when updating terrain", () => {
      const store = useWorldStore.getState();
      
      // Set some objects
      store.addObject("tree", { x: 1, y: 1, z: 1 } as any);
      store.updateTimeOfDay("night");
      
      // Update terrain
      store.setTerraformMode("water");
      store.setIsTerraforming(true);
      
      const finalState = useWorldStore.getState();
      expect(finalState.objects).toHaveLength(1);
      expect(finalState.timeOfDay).toBe("night");
      expect(finalState.terraformMode).toBe("water");
      expect(finalState.isTerraforming).toBe(true);
    });
  });
});

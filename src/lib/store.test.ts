import { describe, it, expect, vi } from "bun:test";
import { updateTimeOfDay } from "./store";

describe("useWorldStore", () => {
  it("should initialize with default values", () => {
    const store = useWorldStore.getState();
    expect(store.timeOfDay).toEqual("day");
    expect(store.debugEnabled).toBe(false);
    expect(store.selectedObjectType).toBe(null);
    expect(store.isPlacing).toBe(false);
  });

  it("should update time of day", () => {
    const store = useWorldStore.getState();
    store.updateTimeOfDay("night");
    expect(store.timeOfDay).toEqual("night");
    expect(store.timeOfDay).toBe("night");
    expect(store.debugEnabled).toBe(false);
    expect(store.selectedObjectType).toBe(null);
    expect(store.isPlacing).toBe(false);
  });

  it("should toggle debug mode", () => {
    const store = useWorldStore.getState();
    store.toggleDebugMode();
    expect(store.debugEnabled).toBe(true);
    expect(store.timeOfDay).toBe("day");
    expect(store.selectedObjectType).toBe(null);
    expect(store.isPlacing).toBe(false);
  });

  it("should update selected object type", () => {
    const store = useWorldStore.getState();
    store.setSelectedObjectType("tree");
    expect(store.selectedObjectType).toEqual("tree");
  });

  it("should toggle placing mode", () => {
    const store = useWorldStore.getState();
    store.togglePlacing();
    expect(store.isPlacing).toBe(true);
  });

  it("should reset terrain", () => {
    const store = useWorldStore.getState();
    store.resetTerrain();
    expect(store.terrainVertices).toHaveLength(0);
  });

  it("should update terrain vertex", () => {
    const store = useWorldStore.getState();
    store.setTerrainVertices([{ x: 0, y: 0, z: 0, height: 0, waterLevel: 0 }]);
    store.updateTerrainVertex(0, { x: 0, y: 0, z: 0, height: 0.5, waterLevel: 0.2 });
    expect(store.terrainVertices[0].height).toBe(0.5);
    expect(store.terrainVertices[0].waterLevel).toBe(0.2);
  });

  it("should set terrain vertices", () => {
    const store = useWorldStore.getState();
    store.setTerrainVertices([{ x: 0, y: 0, z: 0, height: 0, waterLevel: 0 }]);
    expect(store.terrainVertices).toHaveLength(1);
    expect(store.terrainVertices[0].x).toBe(0);
    expect(store.terrainVertices[0].y).toBe(0);
    expect(store.terrainVertices[0].z).toBe(0);
    expect(store.terrainVertices[0].height).toBe(0);
    expect(store.terrainVertices[0].waterLevel).toBe(0);
  });
});

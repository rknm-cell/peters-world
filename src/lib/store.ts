import { create } from "zustand";
import type { Vector3 } from "three";
import * as THREE from "three";
import { TerrainOctree } from "./utils/spatial-partitioning";
import { TREE_LIFECYCLE, TREE_LIFECYCLE_CONFIG, FOREST_CONFIG } from "./constants";
import { calculatePlacement, getDetailedIntersection } from "./utils/placement";

export type TreeLifecycleStage = 
  | "youth-small" | "youth-medium" | "youth-medium-high" | "youth-big"
  | "adult" 
  | "dead-standing" | "broken" | "logs";

export interface TreeLifecycleData {
  stage: TreeLifecycleStage;
  stageStartTime: number; // timestamp when current stage started
  adultTreeType?: string; // which adult tree type this will become
  deathTreeType?: string; // which death model to use
  isPartOfForest: boolean; // true if this tree is part of a forest group
  forestId?: string; // unique identifier for the forest group
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
  showForestDebug: boolean;
  showLifecycleDebug: boolean;
  
  // Globe reference for spawning
  globeRef: THREE.Mesh | null;
  
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
  setShowForestDebug: (show: boolean) => void;
  setShowLifecycleDebug: (show: boolean) => void;
  exitPlacementMode: () => void;
  
  // Tree lifecycle actions
  advanceTreeLifecycle: (id: string) => void;
  updateTreeStage: (id: string, stage: TreeLifecycleStage) => void;
  tickTreeLifecycles: () => void;
  attemptTreeSpawning: () => void;
  setGlobeRef: (globe: THREE.Mesh | null) => void;
  
  // Forest detection actions
  detectForests: () => void;
  updateTreeForestStatus: (id: string, isPartOfForest: boolean, forestId?: string) => void;
  
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
  showForestDebug: false,
  showLifecycleDebug: false,
  
  // Globe reference
  globeRef: null,
  
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
      // Stagger initial start times - place trees at random points within their adult stage
      const baseTime = Date.now();
      const adultStageDurationMs = TREE_LIFECYCLE_CONFIG.stageDurations.adult * 1000;
      const randomOffset = Math.random() * adultStageDurationMs; // Random progress within adult stage
      
      newObject.treeLifecycle = {
        stage: "adult",
        stageStartTime: baseTime - randomOffset, // Subtract to place at different points in stage
        adultTreeType,
        isPartOfForest: false, // Initially not part of a forest
      };
      // Use the actual adult tree type for user-placed trees
      newObject.type = adultTreeType!;
    }

    set((state) => ({
      objects: [...state.objects, newObject],
      selectedObject: id,
      // Keep isPlacing as true so user can continue placing more objects
      isPlacing: state.isPlacing,
    }));

    // Run forest detection after adding a tree (with slight delay to avoid race conditions)
    if ((TREE_LIFECYCLE.adult as readonly string[]).includes(type) || type === "tree") {
      setTimeout(() => _get().detectForests(), 100);
    }
  },

  removeObject: (id: string) => {
    const objectBeingRemoved = _get().objects.find(obj => obj.id === id);
    
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedObject: state.selectedObject === id ? null : state.selectedObject,
    }));

    // Run forest detection after removing a tree (if it was a tree)
    if (objectBeingRemoved?.treeLifecycle) {
      setTimeout(() => _get().detectForests(), 100);
    }
  },

  selectObject: (id: string | null) => {
    set({ selectedObject: id });
  },

  updateTimeOfDay: (time: TimeOfDay) => {
    set({ timeOfDay: time });
  },

  setPlacing: (placing: boolean) => {
    console.log(`📍 isPlacing changed: ${placing}`);
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

  setShowForestDebug: (show: boolean) => {
    set({ showForestDebug: show });
  },
  
  setShowLifecycleDebug: (show: boolean) => {
    set({ showLifecycleDebug: show });
  },
  
  // Terrain actions
  setTerraformMode: (mode: TerraformMode) => {
    console.log(`🔧 terraformMode changed: ${mode}`);
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
                  stageStartTime: now, // No offset - stages advance consistently
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
      const treesToAdvance: string[] = [];
      
      // First pass: identify trees that need advancement
      state.objects.forEach(obj => {
        if (!obj.treeLifecycle) return;
        
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
          treesToAdvance.push(obj.id);
        }
      });
      
      // Second pass: advance all trees in a single state update
      if (treesToAdvance.length > 0) {
        console.log(`⏰ Advancing ${treesToAdvance.length} trees in batched update`);
        
        // Use the existing advanceTreeLifecycle logic but apply it synchronously
        const updatedObjects = state.objects.map(obj => {
          if (!treesToAdvance.includes(obj.id) || !obj.treeLifecycle) return obj;
          
          const { stage, adultTreeType } = obj.treeLifecycle;
          let newStage: TreeLifecycleStage = stage;
          let newType = obj.type;
          let deathTreeType = obj.treeLifecycle.deathTreeType;

          // Determine next stage based on current stage (same logic as advanceTreeLifecycle)
          switch (stage) {
            case "youth-small":
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
              // Final stage - logs stay forever
              return obj;
          }
          
          return {
            ...obj,
            type: newType,
            treeLifecycle: {
              ...obj.treeLifecycle,
              stage: newStage,
              stageStartTime: now, // No offset - stages advance consistently once started
              deathTreeType,
            }
          };
        });
        
        return { objects: updatedObjects };
      }
      
      return state; // No changes needed
    });
  },

  // Forest detection functions
  updateTreeForestStatus: (id: string, isPartOfForest: boolean, forestId?: string) => {
    set((state) => ({
      objects: state.objects.map(obj =>
        obj.id === id && obj.treeLifecycle
          ? {
              ...obj,
              treeLifecycle: {
                ...obj.treeLifecycle,
                isPartOfForest,
                forestId,
              }
            }
          : obj
      )
    }));
  },

  detectForests: () => {
    set((state) => {
      const trees = state.objects.filter(obj => 
        obj.treeLifecycle && 
        (FOREST_CONFIG.forestEligibleStages as readonly string[]).includes(obj.treeLifecycle.stage)
      );

      if (trees.length < FOREST_CONFIG.minTreesForForest) {
        // Not enough trees to form any forests - mark all as non-forest
        return {
          objects: state.objects.map(obj =>
            obj.treeLifecycle
              ? {
                  ...obj,
                  treeLifecycle: {
                    ...obj.treeLifecycle,
                    isPartOfForest: false,
                    forestId: undefined,
                  }
                }
              : obj
          )
        };
      }

      // Calculate distance between all tree pairs
      const calculateDistance = (tree1: PlacedObject, tree2: PlacedObject): number => {
        const dx = tree1.position[0] - tree2.position[0];
        const dy = tree1.position[1] - tree2.position[1];
        const dz = tree1.position[2] - tree2.position[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };

      // Build adjacency list of trees within proximity threshold
      const adjacencyList = new Map<string, string[]>();
      trees.forEach(tree => {
        adjacencyList.set(tree.id, []);
      });

      for (let i = 0; i < trees.length; i++) {
        for (let j = i + 1; j < trees.length; j++) {
          const distance = calculateDistance(trees[i]!, trees[j]!);
          if (distance <= FOREST_CONFIG.proximityThreshold) {
            adjacencyList.get(trees[i]!.id)?.push(trees[j]!.id);
            adjacencyList.get(trees[j]!.id)?.push(trees[i]!.id);
          }
        }
      }

      // Find connected components (forests) using DFS
      const visited = new Set<string>();
      const forests: string[][] = [];

      const dfs = (treeId: string, currentForest: string[]) => {
        if (visited.has(treeId)) return;
        visited.add(treeId);
        currentForest.push(treeId);
        
        const neighbors = adjacencyList.get(treeId) ?? [];
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            dfs(neighborId, currentForest);
          }
        });
      };

      trees.forEach(tree => {
        if (!visited.has(tree.id)) {
          const forest: string[] = [];
          dfs(tree.id, forest);
          if (forest.length >= FOREST_CONFIG.minTreesForForest) {
            forests.push(forest);
          }
        }
      });

      // Update tree forest status
      const updatedObjects = state.objects.map(obj => {
        if (!obj.treeLifecycle) return obj;

        // Find which forest this tree belongs to (if any)
        const forestIndex = forests.findIndex(forest => forest.includes(obj.id));
        
        if (forestIndex !== -1) {
          // Tree is part of a forest
          const forestId = `forest-${forestIndex}`;
          return {
            ...obj,
            treeLifecycle: {
              ...obj.treeLifecycle,
              isPartOfForest: true,
              forestId,
            }
          };
        } else {
          // Tree is not part of a forest
          return {
            ...obj,
            treeLifecycle: {
              ...obj.treeLifecycle,
              isPartOfForest: false,
              forestId: undefined,
            }
          };
        }
      });

      return { objects: updatedObjects };
    });
  },

  // Tree spawning function with proper surface placement
  attemptTreeSpawning: () => {
    set((state) => {
      console.log("🌱 Tree spawning attempt started...");
      console.log("🎮 Pre-spawn state:", { isPlacing: state.isPlacing, terraformMode: state.terraformMode });
      
      // Check if we have globe reference for surface placement
      if (!state.globeRef) {
        console.warn("❌ Tree spawning: No globe reference available");
        return state;
      }

      // Find all trees that can spawn (adult stage trees)
      const eligibleSpawners = state.objects.filter(obj => 
        obj.treeLifecycle && 
        (TREE_LIFECYCLE_CONFIG.spawning.eligibleSpawnerStages as readonly string[]).includes(obj.treeLifecycle.stage)
      );

      // Separate forest trees from isolated trees
      const forestTrees = eligibleSpawners.filter(tree => tree.treeLifecycle?.isPartOfForest);
      const isolatedTrees = eligibleSpawners.filter(tree => !tree.treeLifecycle?.isPartOfForest);

      console.log(`🌳 Found ${eligibleSpawners.length} eligible spawner trees (adult stage)`);
      console.log(`🌲 Forest trees: ${forestTrees.length}, Isolated trees: ${isolatedTrees.length}`);
      
      if (eligibleSpawners.length === 0) {
        console.log("❌ No eligible spawner trees found");
        return state; // No eligible spawner trees
      }

      console.log(`🎲 Spawn probabilities: Forest trees ${TREE_LIFECYCLE_CONFIG.spawning.forestTreeSpawnProbability * 100}%, Isolated trees ${TREE_LIFECYCLE_CONFIG.spawning.spawnProbability * 100}%`);

      const newTrees: PlacedObject[] = [];
      const raycaster = new THREE.Raycaster();

      // Process forest trees first (higher spawn chance and priority)
      const allSpawners = [...forestTrees, ...isolatedTrees];
      
      allSpawners.forEach((spawnerTree, index) => {
        const isForestTree = spawnerTree.treeLifecycle?.isPartOfForest ?? false;
        const spawnProbability = isForestTree 
          ? TREE_LIFECYCLE_CONFIG.spawning.forestTreeSpawnProbability 
          : TREE_LIFECYCLE_CONFIG.spawning.spawnProbability;
        
        const randomRoll = Math.random();
        const treeType = isForestTree ? "🌲 Forest" : "🌳 Isolated";
        console.log(`${treeType} tree ${index + 1}: Random roll = ${randomRoll.toFixed(3)}, needed < ${spawnProbability}`);
        
        // Use different probabilities for forest vs isolated trees
        if (randomRoll < spawnProbability) {
          console.log(`✅ ${treeType} tree ${index + 1} wins spawn roll! Attempting to spawn...`);
          
          // For forest trees, use tighter spawn radius to stay within forest proximity
          const spawnRadiusMax = isForestTree 
            ? Math.min(TREE_LIFECYCLE_CONFIG.spawning.spawnRadius.max, FOREST_CONFIG.proximityThreshold * 0.8) // 80% of proximity threshold
            : TREE_LIFECYCLE_CONFIG.spawning.spawnRadius.max;
          
          // Generate random position around the spawner tree
          const angle = Math.random() * 2 * Math.PI;
          const distance = TREE_LIFECYCLE_CONFIG.spawning.spawnRadius.min + 
            Math.random() * (spawnRadiusMax - TREE_LIFECYCLE_CONFIG.spawning.spawnRadius.min);
          
          console.log(`📏 Spawn distance: ${distance.toFixed(2)} (max: ${spawnRadiusMax.toFixed(2)} for ${isForestTree ? 'forest' : 'isolated'} tree)`);
          
          // Calculate horizontal position around parent
          const horizontalX = spawnerTree.position[0] + Math.cos(angle) * distance;
          const horizontalZ = spawnerTree.position[2] + Math.sin(angle) * distance;
          
          // Cast ray from above down to globe surface
          const rayOrigin = new THREE.Vector3(horizontalX, 20, horizontalZ); // Start high above
          const rayDirection = new THREE.Vector3(0, -1, 0); // Point straight down
          
          raycaster.set(rayOrigin, rayDirection);
          
          // Get intersection with globe surface
          const detailedIntersection = state.globeRef ? getDetailedIntersection(raycaster, state.globeRef) : null;
          
          console.log(`🎯 Raycast from [${horizontalX.toFixed(2)}, 20, ${horizontalZ.toFixed(2)}] result:`, detailedIntersection ? "HIT" : "MISS");
          
          if (detailedIntersection) {
            console.log(`📍 Surface hit at [${detailedIntersection.point.x.toFixed(2)}, ${detailedIntersection.point.y.toFixed(2)}, ${detailedIntersection.point.z.toFixed(2)}]`);
            // Use placement system to get proper position and rotation
            const parentAdultType = spawnerTree.treeLifecycle?.adultTreeType ?? "tree";
            const spawnTreeType = TREE_LIFECYCLE.youth.small;
            
            const placementInfo = calculatePlacement(
              spawnTreeType,
              detailedIntersection.point,
              detailedIntersection.normal,
              state.objects
            );
            
            console.log(`🏗️ Placement validation result: ${placementInfo.canPlace ? "CAN PLACE" : "CANNOT PLACE"}`);
            
            // For forest trees, validate that spawned tree would be close enough to other forest trees
            let forestValidation = true;
            if (isForestTree && placementInfo.canPlace) {
              const spawnPosition = placementInfo.position;
              const sameForestTrees = state.objects.filter(obj => 
                obj.treeLifecycle?.isPartOfForest && 
                obj.treeLifecycle?.forestId === spawnerTree.treeLifecycle?.forestId &&
                obj.id !== spawnerTree.id
              );
              
              // Check if spawned position is within proximity threshold of at least one other forest tree
              forestValidation = sameForestTrees.some(tree => {
                const dx = spawnPosition.x - tree.position[0];
                const dy = spawnPosition.y - tree.position[1];
                const dz = spawnPosition.z - tree.position[2];
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                return distance <= FOREST_CONFIG.proximityThreshold;
              });
              
              console.log(`🌲 Forest validation: ${forestValidation ? 'PASS' : 'FAIL'} (checked ${sameForestTrees.length} forest neighbors)`);
            }
            
            if (placementInfo.canPlace && forestValidation) {
              // Create new tree starting at youth-small stage
              const newTreeId = Math.random().toString(36).substring(7);
              
              const newTree: PlacedObject = {
                id: newTreeId,
                type: spawnTreeType, // Start as small bush
                position: [
                  placementInfo.position.x,
                  placementInfo.position.y,
                  placementInfo.position.z
                ],
                rotation: [
                  placementInfo.rotation.x,
                  placementInfo.rotation.y + Math.random() * Math.PI * 2, // Add random Y rotation
                  placementInfo.rotation.z
                ],
                scale: [1, 1, 1],
                treeLifecycle: {
                  stage: "youth-small",
                  stageStartTime: Date.now() - Math.random() * TREE_LIFECYCLE_CONFIG.stageDurations.youthSmall * 1000, // Random point within youth-small stage
                  adultTreeType: parentAdultType, // Will grow into same type as parent
                  isPartOfForest: false,
                }
              };

              newTrees.push(newTree);
              
              console.log(`🌿 NEW TREE SPAWNED! ID: ${newTreeId}, Type: ${spawnTreeType}`);
              console.log(`📊 Parent: [${spawnerTree.position.join(', ')}], Spawn: [${newTree.position.join(', ')}]`);
            } else if (!placementInfo.canPlace) {
              console.log(`❌ Cannot place tree - collision or boundary issue`);
            } else if (!forestValidation) {
              console.log(`❌ Cannot place forest tree - would be too far from other forest trees`);
            }
          } else {
            console.log(`❌ Raycast missed globe surface`);
          }
        } else {
          console.log(`❌ Tree ${index + 1} failed spawn roll`);
        }
      });

      console.log(`📈 Spawning result: ${newTrees.length} new trees created`);
      
      if (newTrees.length > 0) {
        // Add spawned trees directly without affecting placement state
        const updatedObjects = [...state.objects, ...newTrees];
        
        console.log(`🌲 Total trees now: ${updatedObjects.filter(obj => obj.treeLifecycle).length}`);
        console.log("🎮 Post-spawn state (returning):", { isPlacing: state.isPlacing, terraformMode: state.terraformMode });
        
        // Run forest detection after spawning (with delay to avoid race conditions)
        setTimeout(() => _get().detectForests(), 200);
        
        // Return ONLY the objects array, don't change any UI state - preserve existing state
        return { 
          objects: updatedObjects,
          isPlacing: state.isPlacing,
          terraformMode: state.terraformMode
        };
      }

      console.log("❌ No new trees spawned this cycle");
      console.log("🎮 Post-spawn state (no spawn, returning):", { isPlacing: state.isPlacing, terraformMode: state.terraformMode });
      return state; // No new trees spawned
    });
  },

  // Set globe reference for surface placement
  setGlobeRef: (globe: THREE.Mesh | null) => {
    set({ globeRef: globe });
  },
}));

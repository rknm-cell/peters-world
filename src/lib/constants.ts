// Color palettes for cell-shaded materials
export const COLOR_PALETTES = {
  globe: {
    primary: "#8FAE5A",
    shadow: "#5C7A3A",
    highlight: "#B8D178",
  },
  grass: {
    primary: "#7BA05A",
    shadow: "#4F6B38",
    highlight: "#A5C478",
  },
  tree: {
    trunk: "#8B4513",
    trunkShadow: "#654321",
    leaves: "#228B22",
    leavesShadow: "#006400",
  },
  rock: {
    primary: "#8A8A8A",
    shadow: "#5A5A5A",
    highlight: "#B0B0B0",
  },
  water: {
    primary: "#4A90E2",
    shadow: "#2E5A8A",
    highlight: "#7AB8F5",
  },
} as const;

// Lighting settings for different times of day
export const LIGHTING_PRESETS = {
  day: {
    ambientColor: "#ffffff",
    ambientIntensity: 1,
    directionalColor: "#ffffff",
    directionalIntensity: 5.0,
    directionalPosition: [10, 10, 5] as [number, number, number],
    fogColor: "#87CEEB",
    fogNear: 50, // Move fog further away so trees are visible
    fogFar: 150, // Extend fog range
  },
  sunset: {
    ambientColor: "#ff8c42",
    ambientIntensity: 0.7,
    directionalColor: "#ff6b35",
    directionalIntensity: 0.8,
    directionalPosition: [5, 3, 5] as [number, number, number],
    fogColor: "#ff8c42",
    fogNear: 40, // Move fog further away
    fogFar: 120, // Extend fog range
  },
  night: {
    ambientColor: "#1e3a8a",
    ambientIntensity: 0.6,
    directionalColor: "#60a5fa",
    directionalIntensity: 0.5,
    directionalPosition: [2, 8, 3] as [number, number, number],
    fogColor: "#1e293b",
    fogNear: 30, // Move fog further away
    fogFar: 100, // Extend fog range
  },
} as const;

// Placement limits and performance settings
export const WORLD_LIMITS = {
  maxObjects: 50,
  globeRadius: 6, // Base smooth globe radius
  maxPlacementRadius: 7.0, // Maximum distance from center for placement
  placementHeight: 0.5, // Legacy - now handled by surface attachment
} as const;

// Tree lifecycle stages and models
export const TREE_LIFECYCLE = {
  // Youth stages using bush models
  youth: {
    small: "bush/bush-small",
    medium: "bush/bush-medium", 
    mediumHigh: "bush/bush-medium-high",
    big: "bush/bush-big"
  },
  // Adult stages - existing tree models
  adult: [
    "tree", "tree-baobab", "tree-beech", "tree-birch", "tree-conifer",
    "tree-elipse", "tree-fir", "tree-forest", "tree-lime", "tree-maple", 
    "tree-oak", "tree-round", "tree-spruce", "tree-tall"
  ],
  // Death stages
  death: {
    standing: ["dead_tree/tree-dead-1", "dead_tree/tree-dead-2", "dead_tree/tree-dead-3", "dead_tree/tree-dead-4"],
    broken: "dead_tree/tree-dead-broken",
    logs: ["dead_tree/tree-dead-log-a", "dead_tree/tree-dead-log-b"],
    smallLogs: ["dead_tree/tree-dead-log-small-a", "dead_tree/tree-dead-log-small-b"]
  }
} as const;

// Tree lifecycle configuration
export const TREE_LIFECYCLE_CONFIG = {
  // Time in seconds for each stage
  stageDurations: {
    youthSmall: 30,      // 30 seconds
    youthMedium: 25,     // 25 seconds
    youthMediumHigh: 20, // 20 seconds
    youthBig: 15,        // 15 seconds
    adult: 60,           // 1 minute - check for death every minute
    deadStanding: 60,    // 1 minute
    broken: 60,          // 1 minute
    logs: Infinity,      // Logs stay forever (final stage)
  },
  // Probability of dying - 1% chance per minute for adult trees
  deathProbability: {
    youthSmall: 0.05,     // 5% chance of dying (youth stages keep original rates)
    youthMedium: 0.03,    // 3% chance
    youthMediumHigh: 0.02, // 2% chance
    youthBig: 0.01,       // 1% chance
    adult: 0.01,          // 1% chance per minute for adult trees
  },
  // Check interval in milliseconds (1 minute)
  checkInterval: 60000, // 60 seconds = 1 minute
  // Tree spawning configuration
  spawning: {
    spawnProbability: 0.04, // 4% chance per check cycle
    forestTreeSpawnProbability: 0.08, // 8% chance for trees in forests (doubled)
    spawnRadius: {
      min: 0.5, // Minimum distance from parent tree
      max: 1.5, // Maximum distance from parent tree (within forest proximity threshold)
    },
    maxTreesPerSpawnAttempt: 1, // Only spawn 1 tree per attempt
    eligibleSpawnerStages: ["adult"] as const, // Only adult trees can spawn new trees
  },
} as const;

// Forest detection configuration
export const FOREST_CONFIG = {
  // Minimum distance between trees to be considered part of same forest
  proximityThreshold: 2.5, // units distance
  // Minimum number of trees to form a forest
  minTreesForForest: 3,
  // Only adult and living trees can form forests (not dead/broken/logs)
  forestEligibleStages: ["adult"] as const,
} as const;

// Grass models for random spawning
export const GRASS_MODELS = [
  "grass/grass",
  "grass/grass-basic",
  "grass/grass-clumb", 
  "grass/grass-long",
  "grass/grass-tall"
] as const;

// Animal models for random spawning
export const ANIMAL_MODELS = [
  "animals/deer",
  "animals/wolf",
  "animals/seagull",
  "animals/crab",
  "animals/butterfly"
] as const;

// Deer spawning configuration
export const DEER_CONFIG = {
  spawnProbability: 0.25, // 25% chance per check cycle (increased from 8%)
  checkInterval: 60000, // 60 seconds between checks
  maxDeerPerSpawn: 2, // Maximum deer to spawn per cycle
  spawnRadius: {
    min: 1.0, // Minimum distance from spawn point
    max: 3.0, // Maximum distance from spawn point
  },
  // Terrain conditions for deer spawning - made more lenient
  heightRange: {
    min: -0.5, // Can spawn in slight depressions (same as grass)
    max: 1.2,  // Can spawn on moderate hills
  },
  waterLevelMax: 0.02, // Allow spawning in slightly damp areas (more lenient than before)
  // Deer behavior settings
  maxDeerInWorld: 12, // Maximum total deer in the world
  despawnProbability: 0.02, // 2% chance per check cycle for deer to despawn
  // Movement settings
  movement: {
    updateInterval: 100, // Update movement every 100ms for smooth movement
    moveSpeed: {
      min: 2.0, // Minimum movement speed (increased for testing)
      max: 5.0, // Maximum movement speed (increased for testing)
    },
    targetDistance: {
      min: 1.0, // Minimum distance to generate new target
      max: 3.0, // Maximum distance to generate new target (increased for more movement)
    },
    idleTime: {
      min: 2000, // Minimum time to stay idle (2 seconds, reduced for testing)
      max: 5000, // Maximum time to stay idle (5 seconds, reduced for testing)
    },
  },
} as const;

// Grass spawning configuration
export const GRASS_CONFIG = {
  spawnProbability: 0.15, // 15% chance per check cycle
  checkInterval: 45000, // 45 seconds between checks
  maxGrassPerSpawn: 8, // Maximum grass patches to spawn per cycle
  spawnRadius: {
    min: 0.3,
    max: 0.8,
  },
  // Terrain conditions for grass spawning
  heightRange: {
    min: -0.5, // Can spawn in slight depressions
    max: 1.0,  // But not on high mountains (brown/gray terrain)
  },
  waterLevelMax: 0.01, // Don't spawn in water
} as const;

// Decoration models - simplified names for UI
export const DECORATION_MODELS = [
  // Flowers
  "carnations",
  "flower-red", 
  "roses",
  // Mushrooms
  "mushroom-boletus",
  "mushroom-toadstool",
  "mushroom-toadstool-green",
  // Brown stones
  "stone-diamond-brown",
  "stone-flat-brown",
  "stone-oval-brown", 
  "stone-pointy-brown",
  "stone-round-brown",
  "stone-small-brown"
] as const;

// Map simplified names to actual file paths
export const DECORATION_MODEL_PATHS = {
  // Flowers
  "carnations": "decorations/carnations",
  "flower-red": "decorations/flower-red",
  "roses": "decorations/roses",
  // Mushrooms  
  "mushroom-boletus": "decorations/mushroom-boletus",
  "mushroom-toadstool": "decorations/mushroom-toadstool",
  "mushroom-toadstool-green": "decorations/mushroom-toadstool-green",
  // Brown stones
  "stone-diamond-brown": "brown_stone/stone-diamond_brown",
  "stone-flat-brown": "brown_stone/stone-flat_brown", 
  "stone-oval-brown": "brown_stone/stone-oval_brown",
  "stone-pointy-brown": "brown_stone/stone-pointy_brown",
  "stone-round-brown": "brown_stone/stone-round_brown",
  "stone-small-brown": "brown_stone/stone-small_brown"
} as const;

// Object types available for placement
export const OBJECT_TYPES = {
  trees: [
    "tree", // Generic tree
    "tree-baobab",
    "tree-beech", 
    "tree-birch",
    "tree-conifer",
    "tree-elipse",
    "tree-fir",
    "tree-forest",
    "tree-lime",
    "tree-maple",
    "tree-oak",
    "tree-round",
    "tree-spruce",
    "tree-tall"
  ],
  structures: ["house", "tower", "bridge"],
  decorations: DECORATION_MODELS,
  grass: GRASS_MODELS,
  animals: ANIMAL_MODELS,
} as const;

// Global model scaling configuration
export const MODEL_SCALING = {
  // Standard target heights for different object types (in world units)
  targetHeights: {
    // Trees
    trees: {
      adult: 1.2,
      "youth-small": 0.3,
      "youth-medium": 0.6, 
      "youth-medium-high": 0.9,
      "youth-big": 1.1,
      "dead-standing": 1.0,
      broken: 0.2,
      logs: 0.15,
    },
    // Animals  
    animals: {
      deer: 0.8,
      wolf: 0.7,
      seagull: 0.3,
      crab: 0.2,
      butterfly: 0.1,
    },
    // Grass
    grass: {
      default: 0.15,
      tall: 0.25,
      long: 0.2,
      clumb: 0.18,
      basic: 0.12,
    },
    // Decorations
    decorations: {
      // Flowers
      carnations: 0.3,
      "flower-red": 0.25,
      roses: 0.35,
      // Mushrooms
      "mushroom-boletus": 0.2,
      "mushroom-toadstool": 0.15,
      "mushroom-toadstool-green": 0.15,
      // Stones
      "stone-diamond-brown": 0.3,
      "stone-flat-brown": 0.15,
      "stone-oval-brown": 0.25,
      "stone-pointy-brown": 0.4,
      "stone-round-brown": 0.2,
      "stone-small-brown": 0.1,
      // Legacy
      rock: 0.3,
      flower: 0.25,
    },
    // Structures
    structures: {
      house: 1.5,
      tower: 2.0,
      bridge: 0.8,
    }
  },
  // Global scale factor applied to all models (for easy adjustment)
  globalScaleFactor: 1.0,
  // Safety bounds for scale factors
  minScaleFactor: 0.05,
  maxScaleFactor: 10.0,
} as const;

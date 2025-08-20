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
    directionalIntensity: 1.0,
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
  decorations: ["rock", "flower"],
} as const;

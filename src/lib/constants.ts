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
    ambientIntensity: 0.6,
    directionalColor: "#ffffff",
    directionalIntensity: 1.0,
    directionalPosition: [10, 10, 5] as [number, number, number],
    fogColor: "#87CEEB",
    fogNear: 20,
    fogFar: 100,
  },
  sunset: {
    ambientColor: "#ff8c42",
    ambientIntensity: 0.4,
    directionalColor: "#ff6b35",
    directionalIntensity: 0.8,
    directionalPosition: [5, 3, 5] as [number, number, number],
    fogColor: "#ff8c42",
    fogNear: 15,
    fogFar: 80,
  },
  night: {
    ambientColor: "#1e3a8a",
    ambientIntensity: 0.3,
    directionalColor: "#60a5fa",
    directionalIntensity: 0.5,
    directionalPosition: [2, 8, 3] as [number, number, number],
    fogColor: "#1e293b",
    fogNear: 10,
    fogFar: 60,
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
  trees: ["pine", "oak", "birch", "palm", "cherry"],
  structures: ["house", "tower", "bridge"],
  decorations: ["rock", "flower"],
} as const;

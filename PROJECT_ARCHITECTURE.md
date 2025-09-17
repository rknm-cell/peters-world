# Tiny World - Project Architecture Documentation

## Overview

Tiny World (also known as "Peter's World") is a sophisticated browser-based 3D diorama creator built with modern web technologies. The application enables users to create, customize, and share interactive 3D worlds with realistic physics, ecosystem simulation, and mobile-optimized controls.

## Technology Stack

### Core Technologies
- **Runtime**: Bun (JavaScript runtime and package manager)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.8 with strict type checking
- **3D Engine**: Three.js r179 with React Three Fiber ecosystem
- **Physics**: Rapier physics engine via @react-three/rapier
- **State Management**: Zustand v5 for client-side state
- **Styling**: Tailwind CSS v3 with custom design system
- **UI Components**: Radix UI primitives with custom styling

### Backend Technologies
- **Database**: PostgreSQL with Drizzle ORM
- **API**: tRPC v11 for type-safe API communication
- **Authentication**: Custom user management system (planned)
- **File Storage**: Cloud storage for screenshots and assets
- **Deployment**: Vercel with edge functions

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  React 19 + Next.js 15 + TypeScript                        │
│  Three.js + React Three Fiber + Rapier Physics            │
│  Zustand State Management + Tailwind CSS                   │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  3D Scene Management | Physics Engine | Lifecycle Systems  │
│  Object Placement | Terrain Deformation | Ecosystem AI     │
├─────────────────────────────────────────────────────────────┤
│                    Backend Layer                            │
├─────────────────────────────────────────────────────────────┤
│  tRPC API | PostgreSQL Database | Drizzle ORM              │
│  World Persistence | User Management | Sharing System      │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Vercel Deployment | Edge Functions | CDN Asset Delivery   │
└─────────────────────────────────────────────────────────────┘
```

## Core Systems

### 1. 3D Rendering System

#### Scene Architecture
The 3D scene is built using React Three Fiber and organized as follows:

```typescript
interface SceneHierarchy {
  root: THREE.Scene;
  lighting: {
    ambient: THREE.AmbientLight;
    directional: THREE.DirectionalLight;
    fog: THREE.Fog;
  };
  physics: RapierPhysicsWorld;
  terrain: TerrainSystem;
  objects: WorldObjectsManager;
  effects: PostProcessingPipeline;
}
```

#### Key Components:
- **Canvas.tsx**: React Three Fiber canvas wrapper with camera configuration
- **Scene.tsx**: Main 3D scene orchestration, lighting, and physics setup
- **GlobePhysics.tsx**: Physics-enabled globe with precise collision detection
- **WorldObjects.tsx**: Manages all placed objects with optimized rendering

#### Rendering Pipeline:
1. **Scene Setup**: Initialize Three.js scene, camera, and renderer
2. **Lighting System**: Dynamic lighting based on time-of-day presets
3. **Terrain Rendering**: Procedural terrain with vertex deformation
4. **Object Rendering**: Instanced rendering for performance optimization
5. **Physics Simulation**: Rapier physics integration at 60 FPS
6. **Post-Processing**: Effects pipeline for visual enhancement

### 2. State Management System

#### Zustand Store Architecture
The application uses a sophisticated Zustand store with multiple slices:

```typescript
interface WorldState {
  // Core Object Management
  objects: PlacedObject[];
  selectedObject: string | null;
  selectedObjectType: string | null;
  
  // Terrain System
  terrainVertices: TerrainVertex[];
  terrainOctree: TerrainOctree | null;
  terraformMode: TerraformMode;
  
  // Environment
  timeOfDay: TimeOfDay;
  isPlacing: boolean;
  isDeleting: boolean;
  
  // Performance
  isUserInteracting: boolean;
  renderQueue: RenderQueueManager;
}
```

#### Performance Optimizations:
- **Selective Subscriptions**: Components only subscribe to relevant state
- **Memoized Selectors**: Heavy calculations are memoized with useMemo
- **Stable References**: Callback stability with useCallback
- **Categorized Objects**: Objects are categorized to prevent unnecessary re-renders

### 3. Object Placement System

#### PlacementSystem.tsx
Handles all object placement interactions:

```typescript
interface PlacementSystemProps {
  globeRef: React.RefObject<THREE.Mesh | null>;
  rotationGroupRef?: React.RefObject<THREE.Group | null>;
}
```

#### Key Features:
- **Raycasting**: Precise surface detection using Three.js raycaster
- **Collision Detection**: Prevents overlapping object placement
- **Surface Alignment**: Objects are properly oriented to surface normals
- **Preview System**: Real-time placement preview with visual feedback
- **Mobile Support**: Touch-friendly controls with gesture handling

#### Placement Flow:
1. User selects object type from toolbar
2. Mouse/touch movement shows placement preview
3. Click/tap places object with collision validation
4. Object is added to world state and rendered

### 4. Physics System

#### Rapier Integration
The physics system uses Rapier for realistic object interactions:

```typescript
interface PhysicsConfiguration {
  gravity: [number, number, number];        // [0, 0, 0] - no global gravity
  timeStep: number;                         // 1/60 for 60 FPS
  updateLoop: "independent" | "fixed";      // Independent for better performance
  interpolate: boolean;                     // Smooth visual interpolation
  maxStabilizationIterations: number;      // 4 for stability
  maxVelocityIterations: number;           // 1 for performance
}
```

#### Physics Components:
- **GlobePhysics**: Terrain collision with precise mesh collision
- **DeerPhysics**: Character controller with surface adhesion
- **WolfPhysics**: AI-driven movement with physics constraints
- **GravityController**: Custom radial gravity system (disabled)

### 5. Ecosystem Simulation

#### Lifecycle Management
The application features a sophisticated ecosystem simulation:

```typescript
interface LifecycleSystem {
  treeLifecycle: TreeLifecycleManager;
  grassSpawning: GrassSpawningManager;
  deerSpawning: DeerSpawningManager;
  wolfSpawning: WolfSpawningManager;
  
  // Configuration
  checkInterval: number;                    // 60 seconds
  spawnRates: SpawnRateConfiguration;
  lifecycleStages: LifecycleStageConfig;
}
```

#### Tree Lifecycle Stages:
```typescript
type TreeLifecycleStage = 
  | "youth-small" | "youth-medium" | "youth-medium-high" | "youth-big"
  | "adult" 
  | "dead-standing" | "broken" | "logs";
```

#### Animal Behavior System:
- **Deer**: Pathfinding, grass consumption, herd behavior, reproduction
- **Wolves**: Hunting, pack behavior, territory management
- **Physics-based Movement**: Realistic movement with surface adhesion

### 6. Terrain System

#### Terrain Architecture
```typescript
interface TerrainSystem {
  baseGeometry: THREE.SphereGeometry;      // Globe base
  vertexData: TerrainVertex[];
  deformationEngine: TerrainDeformationEngine;
  waterSystem: WaterPhysicsSystem;
  materialSystem: TerrainMaterialSystem;
}
```

#### Terrain Features:
- **Procedural Generation**: Base globe with deformable vertices
- **Water System**: Realistic water simulation with ripples
- **Height Mapping**: Terrain height affects object spawning
- **Color Coding**: Terrain colors indicate suitability for different objects

## Data Models

### 1. Core Object Model
```typescript
interface PlacedObject {
  id: string;                              // CUID2 unique identifier
  type: ObjectType;                        // Object category
  position: [number, number, number];      // 3D position
  rotation: [number, number, number];      // Euler rotation
  scale: [number, number, number];         // Scale factors
  treeLifecycle?: TreeLifecycleData;       // Tree-specific data
  metadata?: ObjectMetadata;               // Additional properties
}
```

### 2. Terrain Data Model
```typescript
interface TerrainVertex {
  x: number;                               // X coordinate
  y: number;                               // Y coordinate  
  z: number;                               // Z coordinate
  height: number;                          // Deformation height
  waterLevel: number;                      // Water level at vertex
  normal: [number, number, number];        // Surface normal
  color: number;                           // Vertex color
}
```

### 3. Database Schema
```sql
-- Worlds table
CREATE TABLE tiny-world_world (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,                     -- Serialized world state
  screenshot TEXT,                         -- Screenshot URL
  user_id TEXT REFERENCES tiny-world_user(id),
  created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  views INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE
);

-- Shares table
CREATE TABLE tiny-world_share (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES tiny-world_world(id),
  short_code TEXT UNIQUE NOT NULL,         -- 6-character share code
  created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Architecture

### tRPC Router Structure
```typescript
export const worldRouter = createTRPCRouter({
  // Public queries
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.worlds.findFirst({
        where: eq(worlds.id, input.id)
      });
    }),

  getFeatured: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.worlds.findMany({
        where: eq(worlds.featured, true),
        limit: input.limit,
        orderBy: desc(worlds.created)
      });
    }),

  // Mutations
  create: publicProcedure
    .input(z.object({
      name: z.string(),
      data: z.any(),
      screenshot: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),
});
```

## Performance Optimizations

### 1. Rendering Optimizations
- **Instanced Rendering**: Trees, grass, and repeated objects use THREE.InstancedMesh
- **Frustum Culling**: Objects outside camera view are culled
- **Level of Detail**: Distant objects use simplified geometry
- **Material Sharing**: Common materials are shared across objects
- **Vertex Colors**: No texture loading, all colors via vertices

### 2. Physics Optimizations
- **Selective Physics**: Only moving objects use physics simulation
- **Collision Culling**: Spatial partitioning with octree for collision detection
- **Fixed Timestep**: Consistent 60 FPS physics updates
- **Interpolation**: Smooth visual interpolation between physics steps

### 3. State Management Optimizations
- **Selective Subscriptions**: Components only subscribe to relevant state
- **Render Queue**: Batching of multiple updates to prevent cascading re-renders
- **Memoization**: Heavy calculations are memoized with useMemo
- **Callback Stability**: Stable callback references with useCallback

### 4. Memory Management
- **Asset Pooling**: Reuse of 3D objects and materials
- **Disposal**: Proper cleanup of GPU resources
- **Lazy Loading**: Non-essential features loaded on demand
- **Garbage Collection**: Minimize object creation in render loops

## File Structure

```
src/
├── app/                    # Next.js app router
│   ├── page.tsx           # Main landing page with 3D world
│   ├── create/            # 3D world editor
│   └── world/[shareCode]  # Shared world viewer
├── components/
│   ├── editor/            # Core 3D editing components
│   │   ├── Canvas.tsx     # React Three Fiber canvas
│   │   ├── Scene.tsx      # Main 3D scene orchestration
│   │   ├── CameraController.tsx # Mobile-friendly camera controls
│   │   └── PlacementSystem.tsx # Object placement logic
│   ├── three/             # Three.js specific components
│   │   ├── objects/       # 3D objects (trees, animals, etc.)
│   │   ├── physics/       # Physics-based components
│   │   ├── systems/       # Lifecycle management systems
│   │   └── effects/       # Visual effects and materials
│   └── ui/                # User interface components
├── lib/                   # Utilities, hooks, and store
│   ├── store.ts           # Zustand state management
│   ├── constants.ts       # Configuration constants
│   └── utils/             # Utility functions
└── server/                # Backend API and database
    ├── api/               # tRPC routers
    └── db/                # Database schema and connection
```

## Key Features

### 1. Living Ecosystems
- **Trees**: Plant trees that grow over time and can reproduce
- **Animals**: Add deer, wolves, and other creatures that move realistically
- **Grass**: Watch as grass spreads naturally across your world
- **Physics**: Realistic movement and collision detection

### 2. World Building Tools
- **Terraforming**: Modify terrain height and add water features
- **Object Library**: Extensive collection of 3D models
- **Lighting System**: Dynamic day/night cycles and atmospheric effects
- **Water Physics**: Realistic water simulation with ripples and reflections

### 3. Performance & Optimization
- **Spatial Partitioning**: Efficient rendering for large worlds
- **Level of Detail**: Objects adapt detail based on camera distance
- **Render Queue**: Optimized rendering pipeline
- **Mobile Optimization**: Touch-friendly controls and performance tuning

## Development Workflow

### 1. Local Development
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run database migrations
bun run db:push

# Open database studio
bun run db:studio
```

### 2. Code Quality
```bash
# Run linting
bun run lint

# Run type checking
bun run typecheck

# Format code
bun run format:write

# Run full CI pipeline
bun run ci
```

### 3. Database Management
```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema changes
bun run db:push
```

## Security Considerations

### 1. Input Validation
- **Type Safety**: TypeScript strict mode for compile-time validation
- **Schema Validation**: Zod schemas for runtime validation
- **Sanitization**: HTML and script injection prevention
- **Rate Limiting**: API endpoint rate limiting (planned)

### 2. Data Security
- **SQL Injection**: Drizzle ORM prevents SQL injection
- **XSS Prevention**: React's built-in XSS protection
- **CSRF Protection**: tRPC built-in CSRF protection
- **Data Validation**: Server-side validation of all inputs

## Future Roadmap

### 1. Short-term (3-6 months)
- **Multiplayer Support**: Real-time collaborative editing
- **Advanced Physics**: Fluid simulation and weather effects
- **Mobile Optimization**: Touch gesture improvements
- **Performance Monitoring**: Real-time performance analytics

### 2. Medium-term (6-12 months)
- **AI Ecosystem**: Advanced animal behavior and ecosystem simulation
- **Procedural Generation**: Algorithmic world generation
- **Social Features**: User communities and sharing
- **Advanced Materials**: PBR materials and lighting

### 3. Long-term (12+ months)
- **VR/AR Support**: Virtual and augmented reality integration
- **Cross-platform**: Mobile app and desktop application
- **Advanced AI**: Machine learning for user behavior analysis
- **Enterprise Features**: Business and educational use cases

## Conclusion

Tiny World represents a sophisticated example of modern 3D web development, combining cutting-edge technologies to create an immersive, interactive experience. The modular architecture allows for future expansion while maintaining current performance targets and user experience goals.

The system demonstrates advanced patterns in:
- 3D graphics programming with Three.js
- Physics simulation with Rapier
- State management with Zustand
- Type-safe API development with tRPC
- Performance optimization for web applications
- Ecosystem simulation and AI behavior

This architecture serves as a foundation for continued development and feature expansion while maintaining code quality and performance standards.

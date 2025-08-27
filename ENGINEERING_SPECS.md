# Tiny World - Engineering Specifications

## Executive Summary

Tiny World is a sophisticated browser-based 3D diorama creator built with modern web technologies. The application enables users to create, customize, and share interactive 3D worlds with realistic physics, ecosystem simulation, and mobile-optimized controls. This document provides comprehensive technical specifications for developers, architects, and stakeholders.

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

### Technology Stack

#### Frontend Technologies
- **Runtime**: Bun (JavaScript runtime and package manager)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.8 with strict type checking
- **3D Engine**: Three.js r179 with React Three Fiber ecosystem
- **Physics**: Rapier physics engine via @react-three/rapier
- **State Management**: Zustand v5 for client-side state
- **Styling**: Tailwind CSS v3 with custom design system
- **UI Components**: Radix UI primitives with custom styling

#### Backend Technologies
- **Database**: PostgreSQL with Drizzle ORM
- **API**: tRPC v11 for type-safe API communication
- **Authentication**: Custom user management system
- **File Storage**: Cloud storage for screenshots and assets
- **Deployment**: Vercel with edge functions

#### Development Tools
- **Package Manager**: Bun for fast dependency management
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **Testing**: React Testing Library (planned)
- **Database Tools**: Drizzle Kit for migrations and studio

## Core Systems Specification

### 1. 3D Rendering System

#### Scene Architecture
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

#### Rendering Pipeline
1. **Scene Setup**: Initialize Three.js scene, camera, and renderer
2. **Lighting System**: Dynamic lighting based on time-of-day presets
3. **Terrain Rendering**: Procedural terrain with vertex deformation
4. **Object Rendering**: Instanced rendering for performance optimization
5. **Physics Simulation**: Rapier physics integration at 60 FPS
6. **Post-Processing**: Effects pipeline for visual enhancement

#### Performance Targets
- **Mobile**: 60 FPS sustained on iPhone 12 equivalent
- **Desktop**: 120+ FPS on modern hardware
- **Memory Usage**: <100MB mobile, <200MB desktop
- **Load Time**: <3s mobile, <1s desktop

### 2. Physics System

#### Rapier Integration
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

#### Physics Components
- **GlobePhysics**: Terrain collision with precise mesh collision
- **DeerPhysics**: Character controller with surface adhesion
- **WolfPhysics**: AI-driven movement with physics constraints
- **GravityController**: Custom radial gravity system (disabled)

#### Collision Detection
```typescript
interface CollisionSystem {
  terrainCollision: TerrainCollisionDetector;
  objectCollision: ObjectCollisionManager;
  spatialPartitioning: TerrainOctree;
  collisionResponse: CollisionResponseHandler;
}
```

### 3. State Management System

#### Zustand Store Architecture
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

#### State Update Patterns
1. **Immediate Updates**: UI interactions, object selection
2. **Batched Updates**: Terrain modifications, lifecycle changes
3. **Physics Bypass**: High-frequency physics updates skip store
4. **Optimized Subscriptions**: Selective state subscriptions to prevent re-renders

### 4. Ecosystem Simulation

#### Lifecycle Management
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

#### Tree Lifecycle Stages
```typescript
type TreeLifecycleStage = 
  | "youth-small" | "youth-medium" | "youth-medium-high" | "youth-big"
  | "adult" 
  | "dead-standing" | "broken" | "logs";

interface TreeLifecycleData {
  stage: TreeLifecycleStage;
  stageStartTime: number;
  adultTreeType?: string;
  deathTreeType?: string;
  isPartOfForest: boolean;
  forestId?: string;
}
```

#### Animal Behavior System
```typescript
interface AnimalBehavior {
  deer: {
    movement: PathfindingSystem;
    feeding: GrassConsumptionSystem;
    social: HerdBehaviorSystem;
    reproduction: SpawningSystem;
  };
  wolf: {
    hunting: PreyTrackingSystem;
    packBehavior: PackCoordinationSystem;
    territory: TerritoryManagementSystem;
  };
}
```

### 5. Terrain System

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

#### Terrain Deformation
```typescript
interface TerrainDeformation {
  modes: {
    raise: HeightModificationMode;
    lower: HeightModificationMode;
    water: WaterLevelModification;
    smooth: TerrainSmoothing;
  };
  brushSystem: {
    size: number;                          // 0.1 to 2.0
    strength: number;                      // 0.1 to 1.0
    falloff: "linear" | "exponential";
  };
}
```

#### Water System
```typescript
interface WaterSystem {
  waterLevel: number;
  waterVertices: WaterVertex[];
  physics: WaterPhysicsSimulation;
  materials: WaterMaterialSystem;
  effects: WaterSurfaceEffects;
}
```

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

type ObjectType = 
  | "tree" | "grass" | "deer" | "wolf" | "building" 
  | "decoration" | "rock" | "water";
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

-- Users table
CREATE TABLE tiny-world_user (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Specification

### 1. tRPC Router Structure
```typescript
// World management
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

  createShare: publicProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    })
});
```

### 2. World Serialization
```typescript
interface SerializedWorld {
  version: string;                         // Schema version
  objects: PlacedObject[];                 // All placed objects
  terrain: {
    vertices: TerrainVertex[];             // Deformed terrain
    waterLevel: number;                    // Global water level
  };
  environment: {
    timeOfDay: TimeOfDay;                  // Lighting preset
  };
  metadata: {
    created: number;                       // Timestamp
    lastModified: number;                  // Timestamp
    playTime: number;                      // Session time
  };
}
```

## Performance Optimization

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

### 3. User Privacy
- **Minimal Data Collection**: Only essential user data stored
- **Data Encryption**: Sensitive data encrypted at rest
- **Access Control**: User-specific data isolation
- **Audit Logging**: User action logging (planned)

## Testing Strategy

### 1. Unit Testing
- **Component Testing**: React Testing Library for component tests
- **Utility Testing**: Jest for utility function testing
- **Type Testing**: TypeScript strict mode for type safety
- **Mock Testing**: Mocked dependencies for isolated testing

### 2. Integration Testing
- **API Testing**: tRPC endpoint testing
- **Database Testing**: Drizzle ORM integration tests
- **Physics Testing**: Rapier physics system tests
- **State Management**: Zustand store integration tests

### 3. Performance Testing
- **FPS Monitoring**: Real-time frame rate monitoring
- **Memory Profiling**: Memory usage analysis
- **Load Testing**: Concurrent user simulation
- **Bundle Analysis**: Webpack bundle size analysis

## Deployment & Infrastructure

### 1. Build System
```bash
# Development
bun run dev              # Next.js development server
bun run build            # Production build
bun run start            # Production server

# Quality Assurance
bun run ci               # Full CI pipeline
bun run lint             # ESLint checking
bun run typecheck        # TypeScript validation
bun run format:check     # Code formatting
```

### 2. Deployment Pipeline
- **Platform**: Vercel with edge functions
- **Build Process**: Automated builds on Git push
- **Environment**: Production, staging, and development environments
- **CDN**: Global CDN for static assets
- **Database**: Managed PostgreSQL with connection pooling

### 3. Monitoring & Analytics
- **Performance Monitoring**: Vercel Analytics integration
- **Error Tracking**: Error boundary and logging system
- **User Analytics**: Anonymous usage analytics (planned)
- **Health Checks**: API endpoint health monitoring

## Development Guidelines

### 1. Code Quality Standards
- **TypeScript**: Strict mode with no implicit any
- **ESLint**: Comprehensive linting rules
- **Prettier**: Consistent code formatting
- **Pre-commit Hooks**: Automated quality checks

### 2. Performance Standards
- **Bundle Size**: <500KB for 3D assets
- **Render Performance**: 60 FPS minimum on target devices
- **Memory Usage**: <100MB mobile, <200MB desktop
- **Load Time**: <3s mobile, <1s desktop

### 3. Accessibility Standards
- **WCAG 2.1**: AA compliance target
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: Minimum 4.5:1 contrast ratio

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

This engineering specification provides a comprehensive technical foundation for the Tiny World project. The system architecture demonstrates sophisticated 3D web development practices with careful attention to performance, user experience, and maintainable code structure. The modular design allows for future expansion while maintaining current performance targets and user experience goals.

The specification serves as a living document that should be updated as the system evolves and new requirements emerge. Regular review and updates ensure alignment between technical implementation and project objectives.

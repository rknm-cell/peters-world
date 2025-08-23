# Tiny World - Architecture Documentation

A comprehensive guide to the codebase architecture, systems, and workflows of the browser-based 3D diorama creator.

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Systems](#core-systems)
5. [State Management](#state-management)
6. [3D Rendering Pipeline](#3d-rendering-pipeline)
7. [Physics System](#physics-system)
8. [Data Persistence](#data-persistence)
9. [User Workflows](#user-workflows)
10. [Performance Considerations](#performance-considerations)

---

## Overview

Tiny World is a browser-based 3D diorama creator that allows users to build and customize floating island worlds with low-poly, cell-shaded aesthetics. The project emphasizes mobile-first design with touch-friendly controls and real-time ecosystem simulation.

**Key Features:**
- Interactive 3D world building with terrain deformation
- Physics-based animal behavior and ecosystem simulation
- Mobile-optimized touch controls
- Real-time collaborative editing potential
- Screenshot capture and world sharing
- Automatic lifecycle management (trees, grass, animals)

---

## Technology Stack

### Core Technologies
- **Runtime**: Bun (package manager and runtime)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict type checking
- **3D Engine**: Three.js (r179) with React Three Fiber ecosystem
- **Physics**: Rapier physics engine for realistic movement
- **State Management**: Zustand for client-side state
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS v3
- **Deployment**: Vercel with edge functions

### 3D Ecosystem
```typescript
// React Three Fiber Ecosystem
@react-three/fiber      // React renderer for Three.js
@react-three/drei       // Useful helpers and abstractions
@react-three/rapier     // Physics integration
@react-three/postprocessing // Post-processing effects
```

### Development Tools
```bash
# Quality Assurance Commands
bun run ci              # Full CI pipeline
bun run lint           # ESLint checking
bun run typecheck      # TypeScript validation
bun run format:check   # Code formatting
```

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Main application entry
│   ├── layout.tsx              # Root layout
│   └── api/                    # API routes (tRPC)
│
├── components/
│   ├── editor/                 # Core 3D editing components
│   │   ├── Scene.tsx          # Main 3D scene orchestration
│   │   ├── Canvas.tsx         # R3F canvas wrapper
│   │   ├── CameraController.tsx # Mobile-friendly camera controls
│   │   ├── PlacementSystem.tsx # Object placement logic
│   │   ├── InputManager.tsx   # Unified input handling
│   │   └── WorldObjects.tsx   # All placed objects renderer
│   │
│   ├── three/                 # Three.js specific components
│   │   ├── objects/           # 3D object implementations
│   │   │   ├── Globe.tsx      # Base floating island
│   │   │   ├── Tree.tsx       # Tree objects with lifecycle
│   │   │   ├── Deer.tsx       # Animal objects
│   │   │   ├── Grass.tsx      # Grass objects
│   │   │   └── [others]       # Decorations, structures
│   │   │
│   │   ├── physics/           # Physics-based components  
│   │   │   ├── DeerPhysics.tsx      # Animal movement system
│   │   │   ├── GlobePhysics.tsx     # Terrain collision
│   │   │   ├── GravityController.tsx # Radial gravity (disabled)
│   │   │   └── PhysicsDebug.tsx     # Physics visualization
│   │   │
│   │   ├── systems/           # Lifecycle management
│   │   │   ├── TreeLifecycleManager.tsx  # Tree aging/reproduction
│   │   │   ├── GrassSpawningManager.tsx  # Automatic grass placement
│   │   │   └── DeerSpawningManager.tsx   # Animal spawning/AI
│   │   │
│   │   └── effects/           # Visual effects
│   │       ├── WaterPhysics.tsx     # Animated water surfaces
│   │       └── SurfaceNormalDebug.tsx # Debug visualizations
│   │
│   └── ui/                    # User interface components
│       ├── Toolbar.tsx        # Main editing toolbar
│       ├── DropdownMenu.tsx   # Object selection menus
│       └── [others]           # Various UI components
│
├── lib/                       # Utilities and configuration
│   ├── store.ts              # Zustand state management
│   ├── constants.ts          # Game configuration constants
│   ├── types.ts              # TypeScript type definitions
│   └── utils/                # Utility functions
│       ├── terrain-collision.ts    # Terrain collision detection
│       ├── model-scaling.ts        # Consistent object scaling
│       ├── deer-rotation.ts        # Animal orientation utilities
│       └── placement.ts            # Object placement logic
│
└── server/                    # Backend API and database
    ├── api/                   # tRPC API routes
    │   ├── routers/          # API route definitions
    │   └── trpc.ts           # tRPC configuration
    └── db/                    # Database configuration
        ├── schema.ts         # Drizzle database schema
        └── index.ts          # Database connection
```

---

## Core Systems

### Scene Hierarchy

```
Scene (Root Component)
├── Physics World (Rapier)
│   ├── GlobePhysics (Terrain collision)
│   ├── DeerPhysics (Animal movement)
│   └── GravityController (Disabled)
│
├── Lighting System
│   ├── AmbientLight (Time-of-day presets)
│   └── Sun (Directional lighting)
│
├── PlacementSystem (Object placement logic)
│   └── WorldObjects (All placed objects)
│
├── InputManager (Unified input handling)
│   ├── Touch/Mouse events
│   ├── Camera controls
│   └── Terraforming input
│
├── System Managers
│   ├── TreeLifecycleManager (60s intervals)
│   ├── GrassSpawningManager (Terrain-aware)
│   └── DeerSpawningManager (AI behavior)
│
└── Effects & Debug
    ├── WaterPhysics (Animated surfaces)
    └── SurfaceNormalDebug (Development tools)
```

### Component Relationships

**Data Flow Patterns:**
1. **UI → Store → 3D Scene**: User interactions update Zustand store, triggering React re-renders
2. **Physics → Direct Manipulation**: High-performance physics bypasses store for 60fps updates  
3. **Store → Persistence**: World state serialized to database via tRPC API
4. **Lifecycle Systems → Store**: Automatic systems (trees, grass, animals) update world state

**Key Interfaces:**
```typescript
// Core object interface
interface PlacedObject {
  id: string
  type: ObjectType
  position: [number, number, number]
  rotation?: [number, number, number] 
  scale?: [number, number, number]
  treeLifecycle?: TreeLifecycleData
  deerMovement?: DeerMovementData
}

// Terrain deformation
interface TerrainVertex {
  index: number
  position: [number, number, number]
  height: number
  isWater: boolean
}
```

---

## State Management

### Zustand Store Architecture

```typescript
interface WorldState {
  // === CORE OBJECT MANAGEMENT ===
  objects: PlacedObject[]              // All placed objects
  selectedObject: string | null        // Currently selected object
  selectedObjectType: string | null    // Type being placed
  
  // === ENVIRONMENTAL STATE ===
  timeOfDay: 'day' | 'sunset' | 'night'  // Lighting preset
  isPlacing: boolean                   // Placement mode active
  
  // === TERRAIN SYSTEM ===
  terrainVertices: TerrainVertex[]     // Deformed vertices
  terraformMode: TerraformMode         // Current terraform tool
  brushSize: number                    // Terraform brush size
  brushStrength: number                // Terraform intensity
  globeRef: React.RefObject<THREE.Mesh> // Globe mesh reference
  
  // === DEBUG & DEVELOPMENT ===
  showDebugNormals: boolean           // Surface normal visualization
  showWireframe: boolean              // Wireframe rendering
  meshDebugMode: string               // Debug visualization mode
  
  // === ACTIONS ===
  // Object management
  addObject: (object: PlacedObject) => void
  updateObject: (id: string, updates: Partial<PlacedObject>) => void
  removeObject: (id: string) => void
  
  // Placement system
  setPlacementMode: (type: string | null) => void
  setSelectedObject: (id: string | null) => void
  
  // Terrain manipulation
  updateTerrainVertex: (vertex: TerrainVertex) => void
  setTerraformMode: (mode: TerraformMode) => void
  
  // Lifecycle management
  attemptTreeSpawning: () => void
  attemptDeerSpawning: () => void
  updateDeerMovement: () => void
  
  // Environmental controls
  setTimeOfDay: (time: TimeOfDay) => void
}
```

### State Update Patterns

**1. Immediate UI Updates:**
```typescript
// Toolbar interactions
const handleObjectSelect = (type: string) => {
  setPlacementMode(type)        // Immediate UI feedback
  setSelectedObject(null)       // Clear selection
}
```

**2. Physics-Store Separation:**
```typescript
// Physics objects bypass store for performance
const DeerPhysics = () => {
  // Physics handles position/rotation at 60fps
  // Store only tracks existence and lifecycle state
  const updatePhysics = () => {
    rigidBody.setTranslation(newPosition, true) // Direct physics update
    // No store.updateObject() call for position
  }
}
```

**3. Batched System Updates:**
```typescript
// Lifecycle systems update multiple objects
const TreeLifecycleManager = () => {
  useInterval(() => {
    const updates = calculateTreeUpdates() // Batch calculations
    updates.forEach(update => store.updateObject(update.id, update.data))
  }, 60000) // Every 60 seconds
}
```

---

## 3D Rendering Pipeline

### Rendering Architecture

```
Camera (OrbitControls) → Scene Graph → WebGL Renderer
│
├── Lighting System
│   ├── AmbientLight (Time-based color/intensity)
│   └── Sun (Directional light with shadow mapping)
│
├── Terrain System
│   ├── Globe (Base sphere geometry)
│   ├── TerrainSystem (Vertex deformation)
│   ├── WaterPhysics (Animated water surfaces)
│   └── Terrain Materials (Height-based vertex colors)
│
├── Object Rendering
│   ├── Trees (Instanced for performance)
│   ├── Decorations (Static objects)
│   ├── Structures (Buildings, paths)
│   ├── Grass (Distributed placement)
│   └── Animals (Physics-controlled)
│
└── Effects & Debug
    ├── Selection Indicators (Ring geometries)
    ├── Wireframe Mode (Development)
    └── Normal Visualization (Debug)
```

### Material System

**Cell-Shaded Aesthetic:**
```typescript
// Core material approach
const createCellShadedMaterial = () => ({
  material: new THREE.MeshToonMaterial({
    color: baseColor,
    gradientMap: createToonGradient(), // 3-step gradient
    transparent: previewMode,
    opacity: previewMode ? 0.6 : 1.0
  })
})

// Gradient mapping for toon shading
const createToonGradient = () => {
  const colors = new Uint8Array([0, 128, 255]) // 3-step gradient
  const gradientTexture = new THREE.DataTexture(colors, colors.length, 1)
  gradientTexture.needsUpdate = true
  return gradientTexture
}
```

**Terrain Materials:**
```typescript
// Height-based vertex coloring
const updateTerrainColors = (vertices: TerrainVertex[]) => {
  vertices.forEach(vertex => {
    if (vertex.isWater) {
      vertex.color = WATER_COLOR      // Blue for water
    } else if (vertex.height > 0.5) {
      vertex.color = MOUNTAIN_COLOR   // Gray for peaks  
    } else {
      vertex.color = GRASS_COLOR      // Green for ground
    }
  })
}
```

### Performance Optimizations

**Target Performance:**
- **Mobile**: 60 FPS on iPhone 12 equivalent
- **Desktop**: 120+ FPS on modern hardware
- **Bundle Size**: <500KB for 3D assets

**Optimization Strategies:**
1. **Instancing**: Repeated objects (trees, rocks) use THREE.InstancedMesh
2. **Frustum Culling**: Objects outside camera view are culled
3. **Level of Detail**: Distant objects use simplified geometry
4. **Physics Optimization**: Only moving objects use physics simulation
5. **Vertex Colors**: No texture loading, all colors via vertices

---

## Physics System

### Rapier Integration

```typescript
// Physics world configuration
<Physics 
  gravity={[0, 0, 0]}          // No global gravity
  interpolate={true}           // Smooth visual interpolation
  updateLoop="independent"     // Better performance
  timeStep={1/60}              // 60 FPS physics updates
>
  <GravityController />        // Custom radial gravity (disabled)
  <GlobePhysics />            // Terrain collision
  <DeerPhysics />             // Character movement
</Physics>
```

### Physics Components

**1. Globe Collision System:**
```typescript
// GlobePhysics.tsx - Precise terrain collision
const GlobePhysics = ({ onTerrainMeshReady }) => {
  return (
    <RigidBody type="fixed" colliders="trimesh">
      <Globe ref={globeRef} onReady={onTerrainMeshReady} />
    </RigidBody>
  )
}
```

**2. Character Controller:**
```typescript
// DeerPhysics.tsx - Advanced character movement
const DeerPhysics = ({ objectId, position, type }) => {
  const characterController = useRef<CharacterController>()
  
  useEffect(() => {
    const controller = world.createCharacterController(0.01)
    controller.enableAutostep(0.5, 0.2, true)  // Climb small obstacles
    controller.enableSnapToGround(0.5)         // Stay on surface
    characterController.current = controller
  }, [])
  
  return (
    <RigidBody type="kinematicPosition" colliders={false}>
      <CapsuleCollider args={[0.2, 0.4]} />
      <Deer isPhysicsControlled={true} />
    </RigidBody>
  )
}
```

**3. Terrain Collision Detection:**
```typescript
// Custom collision system for movement validation
const checkMovement = (from: Vector3, to: Vector3) => {
  const terrainCollision = {
    canMove: true,
    isWater: false,
    slopeAngle: 0,
    groundHeight: calculateGroundHeight(to),
    adjustedPosition: null
  }
  
  // Check water collision
  if (isInWater(to)) {
    terrainCollision.canMove = false
    terrainCollision.isWater = true
  }
  
  // Check slope angle
  const slope = calculateSlopeAngle(from, to)
  if (slope > MAX_SLOPE_ANGLE) {
    terrainCollision.canMove = false
    terrainCollision.slopeAngle = slope
  }
  
  return terrainCollision
}
```

### Surface Adhesion System

**Problem Solved:** Objects and animals stay properly oriented on the curved globe surface.

```typescript
// Surface normal calculation
const getSurfaceNormal = (position: Vector3) => {
  return position.clone().normalize() // Radial normal from center
}

// Object orientation alignment  
const alignToSurface = (object: Object3D, position: Vector3) => {
  const surfaceNormal = getSurfaceNormal(position)
  const worldUp = new Vector3(0, 1, 0)
  
  // Calculate rotation to align object's up with surface normal
  const rotationMatrix = new Matrix4()
  rotationMatrix.lookAt(position, position.clone().add(surfaceNormal), worldUp)
  
  object.setRotationFromMatrix(rotationMatrix)
}
```

---

## Data Persistence

### Database Schema (Drizzle ORM)

```typescript
// schema.ts - PostgreSQL tables
export const worlds = pgTable('worlds', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  data: json('data').notNull(),           // Serialized world state
  screenshot: text('screenshot'),         // URL to screenshot image
  userId: text('user_id').references(() => users.id),
  views: integer('views').default(0),
  featured: boolean('featured').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const shares = pgTable('shares', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  worldId: text('world_id').references(() => worlds.id).notNull(),
  shortCode: text('short_code').unique().notNull(), // 6-char codes
  createdAt: timestamp('created_at').defaultNow()
})

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow()
})
```

### tRPC API Structure

```typescript
// server/api/routers/world.ts
export const worldRouter = createTRPCRouter({
  // Public queries
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.worlds.findFirst({
        where: eq(worlds.id, input.id)
      })
    }),

  getFeatured: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(({ ctx, input }) => {
      return ctx.db.query.worlds.findMany({
        where: eq(worlds.featured, true),
        limit: input.limit,
        orderBy: desc(worlds.createdAt)
      })
    }),

  // Mutations
  create: publicProcedure
    .input(z.object({
      name: z.string(),
      data: z.any(), // Serialized world state
      screenshot: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const world = await ctx.db.insert(worlds).values({
        name: input.name,
        data: input.data,
        screenshot: input.screenshot
      }).returning()
      
      return world[0]
    }),

  // Share system
  createShare: publicProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const shortCode = generateShortCode() // 6 random characters
      const share = await ctx.db.insert(shares).values({
        worldId: input.worldId,
        shortCode
      }).returning()
      
      return share[0]
    })
})
```

### World Serialization

```typescript
// World state serialization for database storage
interface SerializedWorld {
  version: string              // Schema version for migrations
  objects: PlacedObject[]      // All placed objects
  terrain: {
    vertices: TerrainVertex[]  // Deformed terrain data
    waterLevel: number         // Global water level
  }
  environment: {
    timeOfDay: TimeOfDay       // Lighting preset
    weather?: WeatherData      // Future weather system
  }
  metadata: {
    created: timestamp
    lastModified: timestamp
    playTime: number          // Time spent editing
  }
}

// Compression for efficient storage
const serializeWorld = (state: WorldState): SerializedWorld => {
  return {
    version: SCHEMA_VERSION,
    objects: state.objects.map(compressObject),
    terrain: compressTerrainData(state.terrainVertices),
    environment: {
      timeOfDay: state.timeOfDay
    },
    metadata: {
      created: Date.now(),
      lastModified: Date.now(),
      playTime: getSessionTime()
    }
  }
}
```

---

## User Workflows

### Primary User Interactions

**1. Object Placement Workflow:**
```
User Flow:
Toolbar Click → Object Category → Specific Object → 
Placement Mode → Surface Raycast → Collision Check → 
Normal Alignment → Object Creation → Store Update

Code Flow:
UI Event → setPlacementMode() → PlacementSystem.onPointerDown() →
raycaster.intersectObject(globe) → calculateSurfaceNormal() →
alignObjectToSurface() → store.addObject() → WorldObjects re-render
```

**2. Terrain Modification Workflow:**
```
User Flow:
Terraform Tool → Mode Selection → Brush Size → 
Surface Interaction → Height Modification → Visual Update

Code Flow:
setTerraformMode() → InputManager.handleTerrainInteraction() →
selectVerticesInBrush() → modifyVertexHeights() → 
updateTerrainGeometry() → recalculateNormals() → 
updateVertexColors() → store.updateTerrainVertices()
```

**3. Ecosystem Interaction:**
```
Automated Flow:
TreeLifecycleManager (60s) → Check Tree Ages → 
Apply Growth/Death → Attempt Reproduction → 
Forest Detection → Spawn Rate Modification →
GrassSpawningManager → Terrain Analysis → 
Grass Placement → DeerSpawningManager → 
Deer Creation → Physics Movement → Grass Consumption
```

### Touch/Mobile Controls

**Mobile-First Design:**
```typescript
// CameraController.tsx - Touch optimization
const CameraController = () => {
  const controlsRef = useRef<OrbitControls>()
  
  // Touch gesture mapping
  const touchConfig = {
    singleTouch: 'rotate',      // Orbit around island
    pinch: 'zoom',              // Zoom in/out  
    tap: 'place',               // Place object or select
    longPress: 'delete',        // Delete selected object
    twoFingerRotate: 'rotate'   // Rotate selected object
  }
  
  return (
    <OrbitControls 
      ref={controlsRef}
      enablePan={false}           // Disable panning for cleaner UX
      enableZoom={true}
      enableRotate={true}
      minDistance={8}             // Prevent too close zoom
      maxDistance={20}            // Prevent too far zoom
      maxPolarAngle={Math.PI * 0.8} // Prevent camera under island
    />
  )
}
```

### Advanced Interactions

**1. Object Selection & Manipulation:**
```typescript
// Multi-modal selection system
const handleObjectInteraction = (event: ThreeEvent) => {
  const intersection = event.intersections[0]
  const object = intersection.object
  
  if (object.userData.isPlacedObject) {
    // Single tap: Select object
    if (event.type === 'tap') {
      setSelectedObject(object.userData.objectId)
    }
    
    // Long press: Delete object
    if (event.type === 'longpress') {
      removeObject(object.userData.objectId)
    }
    
    // Two-finger rotate: Rotate object
    if (event.type === 'twofingerrotate') {
      rotateObject(object.userData.objectId, event.rotation)
    }
  }
}
```

**2. Dynamic Camera Behavior:**
```typescript
// Context-aware camera controls
const updateCameraControls = (state: WorldState) => {
  const controls = controlsRef.current
  
  if (state.isPlacing) {
    // Placement mode: Smoother rotation for precision
    controls.rotateSpeed = 0.3
    controls.zoomSpeed = 0.5
  } else if (state.terraformMode !== 'none') {
    // Terraform mode: Faster response for terrain work
    controls.rotateSpeed = 0.8
    controls.zoomSpeed = 1.0
  } else {
    // Default: Balanced controls
    controls.rotateSpeed = 0.5
    controls.zoomSpeed = 0.8
  }
}
```

---

## Performance Considerations

### Target Performance Metrics

**Mobile Performance (iPhone 12 equivalent):**
- **Target FPS**: 60 FPS sustained
- **Memory Usage**: <100MB total
- **Bundle Size**: <500KB for 3D assets
- **Load Time**: <3 seconds to interactive

**Desktop Performance (Modern hardware):**
- **Target FPS**: 120+ FPS
- **Memory Usage**: <200MB total  
- **Load Time**: <1 second to interactive

### Optimization Strategies

**1. Rendering Optimizations:**
```typescript
// Instanced rendering for repeated objects
const TreeInstances = ({ trees }) => {
  const instancedMesh = useRef<THREE.InstancedMesh>()
  
  useEffect(() => {
    trees.forEach((tree, index) => {
      const matrix = new THREE.Matrix4()
      matrix.setPosition(tree.position)
      matrix.scale(tree.scale)
      instancedMesh.current.setMatrixAt(index, matrix)
    })
    instancedMesh.current.instanceMatrix.needsUpdate = true
  }, [trees])
  
  return (
    <instancedMesh ref={instancedMesh} args={[geometry, material, trees.length]} />
  )
}

// Frustum culling for distant objects
const OptimizedObject = ({ position, children }) => {
  const camera = useThree(state => state.camera)
  const isVisible = useFrustumCulling(position, camera)
  
  return isVisible ? children : null
}
```

**2. Physics Optimizations:**
```typescript
// Selective physics simulation
const PhysicsWorld = ({ children }) => {
  return (
    <Physics 
      gravity={[0, 0, 0]}
      updateLoop="independent"     // Separate physics from render loop
      timeStep={1/60}              // Fixed timestep for consistency
    >
      {/* Only moving objects use physics */}
      <DeerPhysics />
      
      {/* Static objects use simple collision detection */}
      <StaticColliders />
      
      {children}
    </Physics>
  )
}

// Efficient collision detection
const useTerrainCollision = () => {
  const octree = useMemo(() => {
    return new TerrainOctree(terrainVertices) // Spatial partitioning
  }, [terrainVertices])
  
  return useCallback((position: Vector3) => {
    return octree.queryPoint(position) // O(log n) lookup
  }, [octree])
}
```

**3. Memory Management:**
```typescript
// Asset loading and cleanup
const useAssetManager = () => {
  const loadedAssets = useRef(new Map())
  
  const loadAsset = useCallback(async (url: string) => {
    if (loadedAssets.current.has(url)) {
      return loadedAssets.current.get(url)
    }
    
    const asset = await loadGLTF(url)
    loadedAssets.current.set(url, asset)
    return asset
  }, [])
  
  const cleanupAssets = useCallback(() => {
    loadedAssets.current.forEach(asset => {
      asset.dispose() // Clean up GPU resources
    })
    loadedAssets.current.clear()
  }, [])
  
  useEffect(() => cleanupAssets, []) // Cleanup on unmount
  
  return { loadAsset, cleanupAssets }
}

// State optimization
const WorldState = () => {
  // Separate frequently updated state from stable state
  const fastState = useStore(state => ({
    cameraPosition: state.cameraPosition,
    isPlacing: state.isPlacing
  }))
  
  const slowState = useStore(state => ({
    objects: state.objects,
    terrain: state.terrainVertices
  }), shallow) // Shallow comparison for arrays
}
```

**4. Bundle Optimization:**
```typescript
// Code splitting for 3D assets
const LazyDeer = lazy(() => import('./objects/Deer'))
const LazyTree = lazy(() => import('./objects/Tree'))

// Dynamic imports for non-essential features
const loadDebugTools = async () => {
  if (process.env.NODE_ENV === 'development') {
    const { PhysicsDebug } = await import('./debug/PhysicsDebug')
    return PhysicsDebug
  }
  return null
}
```

### Monitoring and Analytics

```typescript
// Performance monitoring
const usePerformanceMonitoring = () => {
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  
  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    
    if (now - lastTime.current > 1000) { // Every second
      const fps = (frameCount.current * 1000) / (now - lastTime.current)
      
      // Log performance metrics
      console.log(`FPS: ${fps.toFixed(1)}`)
      console.log(`Memory: ${(performance.memory?.usedJSHeapSize || 0) / 1024 / 1024}MB`)
      
      frameCount.current = 0
      lastTime.current = now
    }
  })
}
```

---

This architecture documentation provides a comprehensive overview of how Tiny World is built, from high-level system design down to specific implementation details. The codebase demonstrates sophisticated 3D web development practices with careful attention to performance, user experience, and maintainable code structure.
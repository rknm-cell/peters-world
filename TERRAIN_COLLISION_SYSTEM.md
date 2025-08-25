# Dynamic Terrain Collision System

## Overview

The terrain collision system has been upgraded to support dynamic collider updates when the terrain is deformed through terraforming tools. This ensures that deer and other physics-enabled entities properly collide with the modified terrain instead of walking through hills or floating above valleys.

## Phase 1 Implementation (Completed)

### Key Components

#### 1. **GlobePhysics Component** (`src/components/three/physics/GlobePhysics.tsx`)
- **Dynamic Collider Management**: Monitors terrain vertex changes and recreates the trimesh collider when deformation is detected
- **Change Detection**: Uses a hash-based system to efficiently detect when terrain has been modified
- **Debounced Updates**: Updates are debounced (250ms) to avoid performance issues during continuous terraforming
- **Trimesh Collider**: Creates a precise triangle mesh collider from the deformed terrain geometry

#### 2. **TerrainSystem Component** (`src/components/editor/TerrainSystem.tsx`)
- **Terrain Deformation**: Applies height and water level modifications to sphere vertices
- **Update Notifications**: Notifies the physics system when terrain geometry changes
- **Visual Updates**: Updates both visual representation and provides geometry for physics collider

#### 3. **TerrainCollisionDetector** (`src/lib/utils/terrain-collision.ts`)
- **Movement Validation**: Checks if animals can move to specific positions
- **Terrain Sampling**: Samples terrain height at world positions using octree optimization
- **Slope Detection**: Prevents movement on slopes steeper than MAX_SLOPE_ANGLE (45°)
- **Water Detection**: Prevents movement through water deeper than MIN_WATER_DEPTH

### How It Works

1. **Terraforming Action**:
   - User modifies terrain using raise/lower/water tools
   - TerrainSystem updates vertex positions and colors
   - Store updates `terrainVertices` array

2. **Change Detection**:
   - GlobePhysics monitors `terrainVertices` for changes
   - Creates a hash of sampled vertices to detect modifications
   - Triggers collider update when hash changes

3. **Collider Update**:
   - Removes existing trimesh collider from physics world
   - Extracts updated vertex positions from terrain geometry
   - Creates new trimesh collider with deformed geometry
   - Attaches new collider to rigid body

4. **Collision Detection**:
   - Deer use character controllers that interact with the updated collider
   - TerrainCollisionDetector provides additional movement validation
   - Animals stay on deformed terrain surface

### Performance Considerations

- **Debouncing**: Updates are debounced to prevent excessive collider recreation
- **Sampling**: Only samples subset of vertices for change detection
- **Octree Optimization**: Uses spatial partitioning for efficient terrain queries
- **Batch Updates**: Groups terrain modifications to minimize physics updates

## Next Steps

### Phase 2: Building Collision (Pending)
- Add physics colliders to structures (houses, towers, bridges)
- Implement obstacle detection in deer pathfinding
- Use collision groups for efficient detection

### Phase 3: Navigation Mesh (Future)
- Integrate navmesh library for proper pathfinding
- Generate walkable areas from terrain and buildings
- Implement A* pathfinding on navmesh

### Phase 4: Optimization (Future)
- Implement LOD system for physics calculations
- Use heightfield collider instead of trimesh for better performance
- Add spatial partitioning for collision queries

## Testing

To test the dynamic terrain collision:

1. Run the application: `bun dev`
2. Use terraforming tools to create hills and valleys
3. Spawn deer near modified terrain
4. Observe that deer properly walk on deformed surfaces
5. Check console for collision update logs

## Debug Output

The system provides detailed logging:
- 🔍 Terrain change detection
- 🔄 Collider update process
- ✅ Successful collider updates
- ❌ Error messages if updates fail
- 🦌 Deer collision events

## Known Limitations

1. **Performance**: Trimesh colliders are computationally expensive for high-resolution terrain
2. **Update Delay**: 250ms delay before collider updates (intentional for performance)
3. **Building Collision**: Not yet implemented (Phase 2)
4. **Pathfinding**: Basic wandering without proper obstacle avoidance (Phase 3)

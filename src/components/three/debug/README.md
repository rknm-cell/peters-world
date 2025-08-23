# Mesh Debug Visualizer

A visual debugging tool for analyzing the planet's mesh after terraforming operations.

## Features

### Debug Modes
- **Wireframe**: Shows the mesh wireframe structure in green
- **Normals**: Displays vertex normals as cyan lines
- **Height Map**: Color-codes vertices by height deformation (blue=low, green=normal, red=high)
- **Water Map**: Visualizes water levels (dark blue=low water, light blue=high water)
- **Vertices**: Shows vertex positions as red dots (sampled for performance)

### Statistics Panel
- Total vertex count
- Number of deformed vertices
- Number of vertices with water
- Height range (min/max)
- Maximum water level

### Usage

1. **Enable Debug Mode**:
   - Open the terraform toolbar (mountain icon)
   - Click "Show Debug" button at the bottom

2. **Select Debug Mode**:
   - Click "🔍 Debug Mesh" button in top-right corner
   - Choose from dropdown menu of visualization modes

3. **Analyze Terrain**:
   - Use different modes to understand mesh deformation
   - Check statistics to see impact of terraforming
   - Use wireframe to see mesh density and structure

### Performance Notes

- Vertex dots and normals are sampled (every 10th/20th vertex) for performance
- Debug visualizations use `renderOrder={100}` to render on top
- Statistics are recalculated when terrain changes

### Integration

The debug visualizer is integrated into `TerrainSystem.tsx` and controlled via the global store flag `showMeshDebug`.
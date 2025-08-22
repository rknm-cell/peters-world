"use client";

import { useState, useMemo } from 'react';
import { useWorldStore } from '~/lib/store';

type DebugMode = 'wireframe' | 'normals' | 'heightmap' | 'watermap' | 'vertex-dots' | 'off';

export function MeshDebugPanel() {
  const { 
    showMeshDebug, 
    meshDebugMode, 
    setMeshDebugMode,
    terrainVertices,
    globeRef 
  } = useWorldStore();
  const [showUI, setShowUI] = useState(false);

  // Debug modes configuration
  const debugModes: { mode: DebugMode; label: string; description: string }[] = [
    { mode: 'off', label: 'Off', description: 'Normal terrain view' },
    { mode: 'wireframe', label: 'Wireframe', description: 'Green wireframe mesh' },
    { mode: 'heightmap', label: 'Height Map', description: 'Blue→Green→Red elevation' },
    { mode: 'normals', label: 'Normals', description: 'RGB normal colors' },
    { mode: 'vertex-dots', label: 'Vertices', description: 'Red vertex dots' },
    { mode: 'watermap', label: 'Water Map', description: 'Water level overlay' },
  ];

  // Stats calculation
  const stats = useMemo(() => {
    if (!globeRef?.geometry || terrainVertices.length === 0) return null;
    
    const positions = globeRef.geometry.attributes.position;
    if (!positions) return null;
    
    const deformedVertices = terrainVertices.filter(v => Math.abs(v.height) > 0.01);
    const waterVertices = terrainVertices.filter(v => v.waterLevel > 0.001);
    const maxHeight = Math.max(...terrainVertices.map(v => v.height));
    const minHeight = Math.min(...terrainVertices.map(v => v.height));
    const maxWater = Math.max(...terrainVertices.map(v => v.waterLevel));
    
    return {
      totalVertices: positions.count,
      deformedVertices: deformedVertices.length,
      waterVertices: waterVertices.length,
      heightRange: { min: minHeight.toFixed(2), max: maxHeight.toFixed(2) },
      maxWaterLevel: maxWater.toFixed(3),
    };
  }, [globeRef?.geometry, terrainVertices]);

  if (!showMeshDebug) return null;

  const handleToggleDebug = () => {
    setShowUI(!showUI);
    // Auto-enable wireframe mode when first opening debug panel
    if (!showUI && meshDebugMode === 'off') {
      setMeshDebugMode('wireframe');
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={handleToggleDebug}
        className={`mb-2 rounded-lg p-2 text-white backdrop-blur-sm transition-all duration-200 ${
          meshDebugMode !== 'off'
            ? "bg-yellow-600/80 hover:bg-yellow-600/90" 
            : "bg-black/80 hover:bg-black/90"
        }`}
        title="Toggle Debug UI"
      >
        🔍 Debug Mesh {meshDebugMode !== 'off' && `(${debugModes.find(m => m.mode === meshDebugMode)?.label})`}
      </button>
        
      {showUI && (
        <div className="w-80 rounded-lg border border-white/20 bg-black/90 p-4 text-white backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold">Mesh Debug Visualizer</h3>
          
          {/* Current Mode Status */}
          <div className="mb-3 text-sm">
            <span className="text-blue-300">Active Mode: </span>
            <span className="font-mono text-yellow-300">
              {debugModes.find(m => m.mode === meshDebugMode)?.label ?? 'Off'}
            </span>
          </div>

          {/* Mesh Status */}
          <div className="mb-3 text-xs">
            <span className="text-gray-400">Mesh Status: </span>
            <span className={`font-mono ${globeRef ? 'text-green-400' : 'text-red-400'}`}>
              {globeRef ? '✓ Connected' : '✗ Not Found'}
            </span>
            {globeRef && (
              <span className="ml-2 text-gray-400">
                ({globeRef.geometry?.attributes.position?.count?.toLocaleString()} vertices)
              </span>
            )}
          </div>

          {/* Debug Mode Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">Debug Mode:</label>
            <select
              value={meshDebugMode}
              onChange={(e) => setMeshDebugMode(e.target.value as DebugMode)}
              className="w-full rounded bg-white/10 p-2 text-white"
            >
              {debugModes.map(({ mode, label, description }) => (
                <option key={mode} value={mode} className="bg-black text-white">
                  {label} - {description}
                </option>
              ))}
            </select>
          </div>
          
          {/* Stats */}
          {stats && (
            <div className="space-y-2 text-sm">
              <h4 className="font-medium text-blue-300">Mesh Statistics:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Vertices:</div>
                <div className="font-mono">{stats.totalVertices.toLocaleString()}</div>
                
                <div>Deformed:</div>
                <div className="font-mono">{stats.deformedVertices.toLocaleString()}</div>
                
                <div>With Water:</div>
                <div className="font-mono">{stats.waterVertices.toLocaleString()}</div>
                
                <div>Height Range:</div>
                <div className="font-mono">{stats.heightRange.min} to {stats.heightRange.max}</div>
                
                <div>Max Water:</div>
                <div className="font-mono">{stats.maxWaterLevel}</div>
              </div>
            </div>
          )}
          
          {/* Instructions and Legends */}
          {meshDebugMode === 'wireframe' && (
            <div className="mt-4 text-xs">
              <h4 className="font-medium text-green-300">Wireframe Mode:</h4>
              <p className="text-gray-300 mt-1">
                Shows the deformed mesh structure in bright green. 
                Try terraforming to see how the mesh changes!
              </p>
            </div>
          )}

          {meshDebugMode === 'heightmap' && (
            <div className="mt-4 text-xs">
              <h4 className="font-medium text-blue-300">Height Colors:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-blue-500"></div>
                  <span>Low (valleys)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-green-500"></div>
                  <span>Normal (sea level)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-red-500"></div>
                  <span>High (mountains)</span>
                </div>
              </div>
            </div>
          )}

          {meshDebugMode === 'normals' && (
            <div className="mt-4 text-xs">
              <h4 className="font-medium text-purple-300">Normal Colors:</h4>
              <p className="text-gray-300 mt-1">
                RGB colors represent surface normals. Watch how 
                terraforming changes the surface directions!
              </p>
            </div>
          )}
          
          {meshDebugMode === 'watermap' && (
            <div className="mt-4 text-xs">
              <h4 className="font-medium text-blue-300">Water Colors:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-blue-800"></div>
                  <span>Low water</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-blue-400"></div>
                  <span>High water</span>
                </div>
              </div>
              <p className="text-gray-300 mt-2">
                Paint water with the Water tool to see this mode!
              </p>
            </div>
          )}

          {meshDebugMode === 'vertex-dots' && (
            <div className="mt-4 text-xs">
              <h4 className="font-medium text-red-300">Vertex Dots:</h4>
              <p className="text-gray-300 mt-1">
                Red dots show vertex positions (sampled for performance). 
                {stats && ` Displaying ~${Math.floor(stats.totalVertices / 10).toLocaleString()} of ${stats.totalVertices.toLocaleString()} vertices.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
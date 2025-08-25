"use client";

import { useState } from 'react';
import { useWorldStore } from '~/lib/store';
import { usePlacementDebug } from '~/lib/hooks/usePlacementDebug';

export function PlacementDebugPanel() {
  const [showUI, setShowUI] = useState(false);
  const { 
    showPlacementOrientationDebug, 
    setShowPlacementOrientationDebug,
    placementDebugUseMeshNormals,
    setPlacementDebugUseMeshNormals,
    placementDebugShowComparison,
    setPlacementDebugShowComparison
  } = useWorldStore();
  const { debugState, toggleDebug, toggleProblematicOnly, setDensity } = usePlacementDebug();

  const handleToggleDebug = () => {
    setShowUI(!showUI);
  };

  return (
    <div className="fixed top-16 right-4 z-50">
      <button
        onClick={handleToggleDebug}
        className={`mb-2 rounded-lg p-2 text-white backdrop-blur-sm transition-all duration-200 ${
          showPlacementOrientationDebug || debugState.enabled
            ? "bg-yellow-600/80 hover:bg-yellow-600/90" 
            : "bg-black/80 hover:bg-black/90"
        }`}
        title="Toggle Placement Debug UI"
      >
        📍 Placement Debug {(showPlacementOrientationDebug || debugState.enabled) && '(Active)'}
      </button>
        
      {showUI && (
        <div className="w-80 rounded-lg border border-white/20 bg-black/90 p-4 text-white backdrop-blur-sm">
          <h3 className="mb-3 text-lg font-bold">📍 Placement Debug</h3>
          
          {/* Placement Orientation Debug */}
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showPlacementOrientationDebug}
                onChange={(e) => setShowPlacementOrientationDebug(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-semibold">Show Object Orientation</span>
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Uses IDENTICAL coordinate system as SurfaceNormalDebug for perfect alignment
            </p>
            
            {/* Comparison mode */}
            {showPlacementOrientationDebug && (
              <div className="ml-6 mt-2 space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={placementDebugShowComparison}
                    onChange={(e) => setPlacementDebugShowComparison(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs">Show debug normals overlay (red arrows)</span>
                </label>
                
                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-800 rounded">
                  <p>💡 Uses ArrowHelper.rotation for EXACT orientation matching</p>
                  <p>Placement system extracts rotation from temporary ArrowHelper</p>
                  <p>Parameters: radius=6, length=0.3, density=20</p>
                </div>
              </div>
            )}
          </div>

          {/* Legacy Placement Arrows Debug */}
          <div className="mb-4 border-t border-gray-600 pt-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={debugState.enabled}
                onChange={(e) => toggleDebug(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-semibold">Show Placement Arrows</span>
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Legacy placement validation arrows (if implemented)
            </p>
          </div>
          
          {debugState.enabled && (
            <>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={debugState.problematicOnly}
                  onChange={(e) => toggleProblematicOnly(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Only Problematic Areas</span>
              </label>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-300">
                  Density: {debugState.density}
                </label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={debugState.density}
                  onChange={(e) => setDensity(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                <p className="font-semibold mb-1">Arrow Colors:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <p>🔴 General</p>
                  <p>🟠 Vertical (2x longer)</p>
                  <p>🟢 North Pole</p>
                  <p>🔵 South Pole</p>
                  <p>🟡 Equator Front</p>
                  <p>🟣 Equator Back</p>
                  <p>🔵 Equator Right</p>
                  <p>🟠 Equator Left</p>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-800 rounded">
                <p>💡 Arrows show the "up" direction of placed objects. They should point away from the globe center for proper radial alignment.</p>
              </div>
            </>
          )}

          {/* Explanation */}
          <div className="mt-4 border-t border-gray-600 pt-3">
                          <div className="text-xs text-gray-400 space-y-2">
              <p><strong>Object Orientation:</strong></p>
              <p>• <span className="text-green-400">Green arrows</span> = Valid placement zones</p>
              <p>• <span className="text-red-400">Red arrows</span> = Invalid placement (collision/steep)</p>
              <p>• Arrows show the "up" direction objects will have when placed</p>
              {placementDebugShowComparison && (
                <p>• <span className="text-red-400">Shorter red arrows</span> = Debug normals (for comparison)</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

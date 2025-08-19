"use client";

import { useWorldStore } from "~/lib/store";
import type { TerraformMode } from "~/lib/store";

export function TerraformToolbar() {
  const {
    terraformMode,
    setTerraformMode,
    brushSize,
    setBrushSize,
    brushStrength,
    setBrushStrength,
    isTerraforming,
    setIsTerraforming,
    resetTerrain,
    setPlacing,
    setSelectedObjectType,
  } = useWorldStore();

  const handleToolSelect = (mode: TerraformMode) => {
    if (terraformMode === mode) {
      setTerraformMode("none");
      setIsTerraforming(false);
    } else {
      setTerraformMode(mode);
      setIsTerraforming(true);
      // Ensure placement mode is off to avoid input conflicts
      setPlacing(false);
      setSelectedObjectType(null);
    }
  };

  const handleResetTerrain = () => {
    if (confirm("Are you sure you want to reset all terrain changes? This cannot be undone.")) {
      resetTerrain();
    }
  };

  const isActive = (mode: TerraformMode) => terraformMode === mode;

  return (
    <div className="fixed left-4 top-32 z-40">
      <div className={`rounded-lg border p-3 backdrop-blur-sm transition-all duration-200 ${
        isTerraforming 
          ? "border-blue-400/50 bg-blue-900/70" 
          : "border-white/20 bg-black/70"
      }`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-white/80">Terraforming Tools</span>
          {isTerraforming && (
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-xs text-blue-300">Active</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {/* Raise Terrain Tool */}
          <button
            onClick={() => handleToolSelect("raise")}
            className={`flex w-full items-center space-x-2 rounded-lg p-2 transition-all duration-200 ${
              isActive("raise")
                ? "bg-green-500 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
            title="Raise Terrain (Create hills and mountains)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,14L12,9L17,14H7Z" />
            </svg>
            <span className="text-sm">Raise</span>
          </button>

          {/* Lower Terrain Tool */}
          <button
            onClick={() => handleToolSelect("lower")}
            className={`flex w-full items-center space-x-2 rounded-lg p-2 transition-all duration-200 ${
              isActive("lower")
                ? "bg-orange-500 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
            title="Lower Terrain (Create valleys and depressions)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,10L12,15L17,10H7Z" />
            </svg>
            <span className="text-sm">Lower</span>
          </button>

          {/* Water Tool */}
          <button
            onClick={() => handleToolSelect("water")}
            className={`flex w-full items-center space-x-2 rounded-lg p-2 transition-all duration-200 ${
              isActive("water")
                ? "bg-blue-500 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
            title="Paint Water (Create lakes, rivers, and oceans)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z" />
            </svg>
            <span className="text-sm">Water</span>
          </button>

          {/* Smooth Tool */}
          <button
            onClick={() => handleToolSelect("smooth")}
            className={`flex w-full items-center space-x-2 rounded-lg p-2 transition-all duration-200 ${
              isActive("smooth")
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
            title="Smooth Terrain (Blend height differences)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
            </svg>
            <span className="text-sm">Smooth</span>
          </button>
        </div>

        {/* Brush Controls */}
        {isTerraforming && (
          <div className="mt-4 space-y-3 border-t border-white/20 pt-3">
            <div>
              <label className="block text-xs text-white/60">Brush Size</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={brushSize}
                onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-white/40">{brushSize.toFixed(1)}</div>
            </div>

            <div>
              <label className="block text-xs text-white/60">Brush Strength</label>
              <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={brushStrength}
                onChange={(e) => setBrushStrength(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-white/40">{brushStrength.toFixed(2)}</div>
              <div className="text-xs text-white/30 mt-1">
                {brushStrength < 0.3 ? "Gentle slopes" : brushStrength < 0.7 ? "Moderate terrain" : "Dramatic peaks/valleys"}
              </div>
            </div>
          </div>
        )}

        {/* Reset Button */}
        <div className="mt-4 border-t border-white/20 pt-3">
          <button
            onClick={handleResetTerrain}
            className="w-full rounded-lg bg-red-500/20 p-2 text-sm text-red-400 transition-all duration-200 hover:bg-red-500/30 hover:text-red-300"
            title="Reset all terrain changes"
          >
            Reset Terrain
          </button>
        </div>

        {/* Instructions */}
        {isTerraforming && (
          <div className="mt-3 rounded-lg bg-blue-500/20 p-2 text-xs text-blue-300">
            <div className="font-medium">How to create terrain:</div>
            <div className="mt-1">
              <strong>Hills:</strong> Low strength + large brush
            </div>
            <div>
              <strong>Mountains:</strong> High strength + small brush
            </div>
            <div>
              <strong>Valleys:</strong> Lower tool with moderate settings
            </div>
            <div className="mt-1 text-blue-200">Globe rotation is disabled while terraforming</div>
          </div>
        )}
      </div>
    </div>
  );
}

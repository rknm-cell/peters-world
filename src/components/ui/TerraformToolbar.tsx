"use client";

import { useState } from "react";
import { useWorldStore } from "~/lib/store";
import type { TerraformMode } from "~/lib/store";

export function TerraformToolbar() {
  const [showMenu, setShowMenu] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
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
    setShowMenu(false); // Close dropdown after selection
  };

  const handleToggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const handleResetTerrain = () => {
    if (confirm("Are you sure you want to reset all terrain changes? This cannot be undone.")) {
      resetTerrain();
    }
  };

  const isActive = (mode: TerraformMode) => terraformMode === mode;

  // Tool definitions for easier management
  const tools = [
    {
      mode: "raise" as TerraformMode,
      name: "Raise",
      icon: "M7,14L12,9L17,14H7Z",
      color: "green",
      description: "Create hills and mountains"
    },
    {
      mode: "lower" as TerraformMode,
      name: "Lower", 
      icon: "M7,10L12,15L17,10H7Z",
      color: "orange",
      description: "Create valleys and depressions"
    },
    {
      mode: "water" as TerraformMode,
      name: "Water",
      icon: "M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",
      color: "blue", 
      description: "Paint lakes and rivers"
    },
    {
      mode: "smooth" as TerraformMode,
      name: "Smooth",
      icon: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z",
      color: "purple",
      description: "Blend height differences"
    }
  ];

  const getCurrentTool = () => {
    return tools.find(tool => tool.mode === terraformMode);
  };

  const currentTool = getCurrentTool();

  return (
    <div className="fixed left-4 top-32 z-40">
      {/* Dropdown Toggle Button */}
      <div className="relative">
        <button
          onClick={handleToggleMenu}
          className={`flex items-center space-x-2 rounded-lg border p-2 sm:p-3 backdrop-blur-sm transition-all duration-200 ${
            isTerraforming 
              ? "border-blue-400/50 bg-blue-900/70 text-white" 
              : "border-white/20 bg-black/70 text-white/80 hover:bg-white/10 hover:text-white"
          }`}
          title="Terraforming Tools"
        >
          {/* Current tool icon or default */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="sm:w-5 sm:h-5">
            <path d={currentTool?.icon ?? "M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"} />
          </svg>
          
          {/* Text */}
          <span className="text-sm font-medium hidden sm:inline">
            {currentTool ? currentTool.name : "Terraform"}
          </span>
          
          {/* Activity indicator */}
          {isTerraforming && (
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          )}
          
          {/* Dropdown arrow */}
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            className={`transition-transform duration-200 ${showMenu ? "rotate-180" : ""}`}
          >
            <path d="M7,10L12,15L17,10H7Z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu Content */}
            <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border border-white/20 bg-black/90 backdrop-blur-sm z-50 max-w-[calc(100vw-2rem)]">
              {/* Tool Selection */}
              <div className="p-3">
                <div className="text-sm font-medium text-white/80 mb-3">Select Tool:</div>
                <div className="space-y-2">
                  {tools.map((tool) => {
                    const getActiveColors = (color: string) => {
                      switch (color) {
                        case "green": return "bg-green-500 text-white";
                        case "orange": return "bg-orange-500 text-white";
                        case "blue": return "bg-blue-500 text-white";
                        case "purple": return "bg-purple-500 text-white";
                        default: return "bg-gray-500 text-white";
                      }
                    };

                    return (
                      <button
                        key={tool.mode}
                        onClick={() => handleToolSelect(tool.mode)}
                        className={`flex w-full items-center space-x-3 rounded-lg p-2 transition-all duration-200 ${
                          isActive(tool.mode)
                            ? getActiveColors(tool.color)
                            : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                        }`}
                        title={tool.description}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d={tool.icon} />
                        </svg>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{tool.name}</div>
                          <div className="text-xs opacity-70">{tool.description}</div>
                        </div>
                        {isActive(tool.mode) && (
                          <div className="h-2 w-2 rounded-full bg-current" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brush Controls */}
              {isTerraforming && (
                <div className="border-t border-white/20 p-3">
                  <div className="text-sm font-medium text-white/80 mb-3">Brush Settings:</div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span>Size</span>
                        <span>{brushSize.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span>Strength</span>
                        <span>{brushStrength.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        value={brushStrength}
                        onChange={(e) => setBrushStrength(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-white/20 p-3">
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      handleResetTerrain();
                      setShowMenu(false);
                    }}
                    className="flex-1 rounded-lg bg-red-500/20 p-2 text-xs text-red-400 transition-all duration-200 hover:bg-red-500/30 hover:text-red-300"
                    title="Reset all terrain changes"
                  >
                    Reset Terrain
                  </button>
                  
                  {isTerraforming && (
                    <button
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="flex-1 rounded-lg bg-blue-500/20 p-2 text-xs text-blue-400 transition-all duration-200 hover:bg-blue-500/30 hover:text-blue-300"
                      title="Toggle instructions"
                    >
                      {showInstructions ? "Hide Tips" : "Show Tips"}
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Tips */}
              {isTerraforming && showInstructions && (
                <div className="border-t border-white/20 p-3">
                  <div className="text-xs font-medium text-blue-300 mb-2">Quick Tips:</div>
                  <div className="text-xs text-blue-300 space-y-1">
                    <div><strong>Hills:</strong> Low strength + large brush</div>
                    <div><strong>Mountains:</strong> High strength + small brush</div>
                    <div><strong>Water:</strong> Paint lakes (Shift+drag to remove)</div>
                    <div><strong>Smooth:</strong> Blend terrain transitions</div>
                    <div className="text-blue-200 mt-2 pt-2 border-t border-blue-400/20">
                      Camera rotation is disabled while terraforming
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

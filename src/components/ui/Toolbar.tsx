"use client";

import { useState } from "react";
import { useWorldStore } from "~/lib/store";
import { GridPlacementMenu } from "./GridPlacementMenu";
import { useCollisionDebugStore } from "~/components/debug/CollisionMeshDebugStore";
import { usePathfindingDebugStore } from "~/components/debug/PathfindingDebugStore";


export function Toolbar() {
  const { 
    isPlacing, 
    objects, 
    selectedObjectType, 
    exitPlacementMode,
    showDebugNormals,
    setShowDebugNormals,
    showWireframe,
    setShowWireframe,
    showForestDebug,
    showLifecycleDebug,
    setShowLifecycleDebug
  } = useWorldStore();
  const { showCollisionMesh, toggleCollisionMesh } = useCollisionDebugStore();
  const { showPathfinding, togglePathfinding } = usePathfindingDebugStore();
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDebugTools, setShowDebugTools] = useState(false);


  const handleAddObject = (event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setShowDropdownMenu(true);
  };

  const handleSaveWorld = async () => {
    // TODO: Implement world saving with tRPC
    console.log("Saving world:", objects);
  };

  const handleScreenshot = () => {
    // TODO: Implement screenshot functionality
    console.log("Taking screenshot");
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log("Sharing world");
  };

  return (
    <>
      {/* Main toolbar */}
      <div className="fixed left-4 top-4 z-40 max-w-[calc(100vw-2rem)] sm:max-w-none">
        <div className="rounded-lg border border-white/20 bg-black/70 p-2 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 sm:space-x-2">
            {/* Add object button */}
            <button
              onClick={handleAddObject}
              className={`rounded-lg p-2 sm:p-3 transition-all duration-200 ${
                isPlacing
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title="Add Object"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="sm:w-5 sm:h-5"
              >
                <path d="M12 2C13.1 2 14 2.9 14 4V10H20C21.1 10 22 10.9 22 12C22 13.1 21.1 14 20 14H14V20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20V14H4C2.9 14 2 13.1 2 12C2 10.9 2.9 10 4 10H10V4C10 2.9 10.9 2 12 2Z" />
              </svg>
            </button>

            {/* Cancel placement */}
            {isPlacing && (
              <button
                onClick={exitPlacementMode}
                className="rounded-lg bg-red-500/20 p-2 sm:p-3 text-red-400 transition-all duration-200 hover:bg-red-500/30 hover:text-red-300"
                title="Cancel"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="sm:w-5 sm:h-5"
                >
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            )}

            {/* Currently selected object type indicator */}
            {isPlacing && selectedObjectType && (
              <div className="flex items-center rounded-lg bg-blue-500/20 px-2 py-1 text-xs sm:text-sm text-blue-300">
                <span className="mr-1 hidden sm:inline">Placing:</span>
                <span className="capitalize font-medium">{selectedObjectType}</span>
              </div>
            )}

            {/* Debug tools toggle - hidden on mobile by default */}
            <div className="hidden sm:block h-8 w-px bg-white/20" />
            
            <button
              onClick={() => setShowDebugTools(!showDebugTools)}
              className={`rounded-lg p-2 sm:p-3 transition-all duration-200 ${
                showDebugTools || showDebugNormals || showWireframe || showForestDebug || showLifecycleDebug || showCollisionMesh || showPathfinding
                  ? "bg-gray-500 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title="Debug Tools"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="sm:w-5 sm:h-5"
              >
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
              </svg>
            </button>

            {/* Separator */}
            <div className="hidden sm:block h-8 w-px bg-white/20" />

            {/* Save button */}
            <button
              onClick={handleSaveWorld}
              disabled={objects.length === 0}
              className="rounded-lg bg-green-500/20 p-2 sm:p-3 text-green-400 transition-all duration-200 hover:bg-green-500/30 hover:text-green-300 disabled:cursor-not-allowed disabled:opacity-50"
              title="Save World"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="sm:w-5 sm:h-5"
              >
                <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
              </svg>
            </button>

            {/* Screenshot button */}
            <button
              onClick={handleScreenshot}
              className="rounded-lg bg-purple-500/20 p-2 sm:p-3 text-purple-400 transition-all duration-200 hover:bg-purple-500/30 hover:text-purple-300"
              title="Screenshot"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="sm:w-5 sm:h-5"
              >
                <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
              </svg>
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={objects.length === 0}
              className="rounded-lg bg-blue-500/20 p-2 sm:p-3 text-blue-400 transition-all duration-200 hover:bg-blue-500/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              title="Share"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="sm:w-5 sm:h-5"
              >
                <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08M18,4A1,1 0 0,1 19,5A1,1 0 0,1 18,6A1,1 0 0,1 17,5A1,1 0 0,1 18,4M6,13A1,1 0 0,1 5,12A1,1 0 0,1 6,11A1,1 0 0,1 7,12A1,1 0 0,1 6,13M18,20C17.45,20 17,19.55 17,19C17,18.45 17.45,18 18,18C18.55,18 19,18.45 19,19C19,19.55 18.55,20 18,20Z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Collapsible Debug Tools Panel */}
        {showDebugTools && (
          <div className="mt-2 rounded-lg border border-white/20 bg-black/70 p-2 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:space-x-2">
              {/* Debug normals toggle */}
              <button
                onClick={() => setShowDebugNormals(!showDebugNormals)}
                className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
                  showDebugNormals
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
                title="Toggle Surface Normal Debug"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                </svg>
                <span className="ml-1 text-xs hidden sm:inline">Normals</span>
              </button>

              {/* Wireframe toggle */}
              <button
                onClick={() => setShowWireframe(!showWireframe)}
                className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
                  showWireframe
                    ? "bg-purple-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
                title="Toggle Wireframe View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z" />
                </svg>
                <span className="ml-1 text-xs hidden sm:inline">Wire</span>
              </button>

              {/* Forest debug toggle */}
              {/* <button
                onClick={() => setShowForestDebug(!showForestDebug)}
                className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
                  showForestDebug
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
                title="Toggle Forest Debug View"
                > 
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11,1L7,4V6L11,3L15,6V4L11,1M11,8L7,11V13L11,10L15,13V11L11,8M6,7V9L2,12V14L6,11V13L10,10V12L14,9V11L18,8V10L22,7V5L18,8L14,11V9L10,12V10L6,7M11,15L7,18V20L11,17L15,20V18L11,15M11,22L7,19V17L11,20L15,17V19L11,22Z" />
                  </svg>
                  <span className="ml-1 text-xs hidden sm:inline">Forest</span>
                </button>

              {/* Tree lifecycle debug toggle */}
              <button
                onClick={() => setShowLifecycleDebug(!showLifecycleDebug)}
                className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
                  showLifecycleDebug
                    ? "bg-yellow-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
                title="Toggle Tree Lifecycle Debug View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                </svg>
                <span className="ml-1 text-xs hidden sm:inline">Tree</span>
              </button>

              {/* Collision debug toggle */}
              <button
                onClick={toggleCollisionMesh}
                className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
                  showCollisionMesh
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
                title="Toggle Collision Mesh Debug (Ctrl+Shift+C)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M12,4C7.57,4 4,7.57 4,12C4,16.43 7.57,20 12,20C16.43,20 20,16.43 20,12C20,7.57 16.43,4 12,4M12,6C15.31,6 18,8.69 18,12C18,15.31 15.31,18 12,18C8.69,18 6,15.31 6,12C6,8.69 8.69,6 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10Z" />
                </svg>
                <span className="ml-1 text-xs hidden sm:inline">Collision</span>
              </button>

              {/* Pathfinding debug toggle */}
              <button
                onClick={togglePathfinding}
                className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
                  showPathfinding
                    ? "bg-yellow-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
                title="Toggle Pathfinding Debug (Ctrl+Shift+D)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M10,13L8,11V14H16V11L14,13L12,11L10,13Z" />
                </svg>
                <span className="ml-1 text-xs hidden sm:inline">Pathfind</span>
              </button>

              {/* Height map debug toggle */}
              <button
                onClick={() => {
                  // Toggle height map visibility
                  const event = new KeyboardEvent('keydown', {
                    key: 'H',
                    ctrlKey: true,
                    shiftKey: true
                  });
                  window.dispatchEvent(event);
                }}
                className="flex items-center justify-center rounded-lg p-2 transition-all duration-200 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                title="Toggle Height Map (Ctrl+Shift+H)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2M6.5,12.5L7.5,16.5L9.5,15.5L8.5,11.5L6.5,12.5M17.5,12.5L15.5,11.5L14.5,15.5L16.5,16.5L17.5,12.5Z" />
                </svg>
                <span className="ml-1 text-xs hidden sm:inline">Height</span>
              </button>

              {/* Normal map debug toggle */}
              <button
                onClick={() => {
                  // Toggle normal map visibility
                  const event = new KeyboardEvent('keydown', {
                    key: 'N',
                    ctrlKey: true,
                    shiftKey: true
                  });
                  window.dispatchEvent(event);
                }}
                className="flex items-center justify-center rounded-lg p-2 transition-all duration-200 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                title="Toggle Normal Map (Ctrl+Shift+N)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6L15.5,10.5L12,11L8.5,10.5L12,6M6.5,12L10.5,15.5L11,12L10.5,8.5L6.5,12M17.5,12L13.5,8.5L13,12L13.5,15.5L17.5,12M12,18L8.5,13.5L12,13L15.5,13.5L12,18Z" />
                </svg>
                <span className="ml-1 text-xs hidden sm:inline">Normal</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Time of day picker - smaller on mobile */}
      {/* <div className="fixed right-4 top-4 z-40 scale-90 sm:scale-100">
        <TimeOfDayPicker />
      </div> */}

      {/* Object count - smaller on mobile */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="rounded-lg border border-white/20 bg-black/70 px-2 py-1 sm:px-3 sm:py-2 backdrop-blur-sm">
          <span className="text-xs sm:text-sm text-white/80">
            Objects: {objects.length}/{50}
          </span>
        </div>
      </div>

      {/* Grid placement menu */}
      <GridPlacementMenu
        isOpen={showDropdownMenu}
        onClose={() => setShowDropdownMenu(false)}
        position={menuPosition}
      />
    </>
  );
}

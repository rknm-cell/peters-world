"use client";

import { useState } from "react";
import { useWorldStore } from "~/lib/store";
import { DropdownMenu } from "./DropdownMenu";
import { TimeOfDayPicker } from "./TimeOfDayPicker";

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
    setShowForestDebug,
    showLifecycleDebug,
    setShowLifecycleDebug
  } = useWorldStore();
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });


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
      <div className="fixed left-4 top-4 z-40">
        <div className="rounded-lg border border-white/20 bg-black/70 p-2 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            {/* Add object button */}
            <button
              onClick={handleAddObject}
              className={`rounded-lg p-3 transition-all duration-200 ${
                isPlacing
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title="Add Object"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C13.1 2 14 2.9 14 4V10H20C21.1 10 22 10.9 22 12C22 13.1 21.1 14 20 14H14V20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20V14H4C2.9 14 2 13.1 2 12C2 10.9 2.9 10 4 10H10V4C10 2.9 10.9 2 12 2Z" />
              </svg>
            </button>

            {/* Cancel placement */}
            {isPlacing && (
              <button
                onClick={exitPlacementMode}
                className="rounded-lg bg-red-500/20 p-3 text-red-400 transition-all duration-200 hover:bg-red-500/30 hover:text-red-300"
                title="Cancel"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            )}

            {/* Currently selected object type indicator */}
            {isPlacing && selectedObjectType && (
              <div className="flex items-center rounded-lg bg-blue-500/20 px-3 py-2 text-sm text-blue-300">
                <span className="mr-2">Placing:</span>
                <span className="capitalize font-medium">{selectedObjectType}</span>
              </div>
            )}

            {/* Separator */}
            <div className="h-8 w-px bg-white/20" />

            {/* Debug normals toggle */}
            <button
              onClick={() => setShowDebugNormals(!showDebugNormals)}
              className={`rounded-lg p-3 transition-all duration-200 ${
                showDebugNormals
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title="Toggle Surface Normal Debug"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
              </svg>
            </button>

            {/* Wireframe toggle */}
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`rounded-lg p-3 transition-all duration-200 ${
                showWireframe
                  ? "bg-purple-500 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title="Toggle Wireframe View"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z" />
              </svg>
            </button>

            {/* Forest debug toggle */}
            <button
              onClick={() => setShowForestDebug(!showForestDebug)}
              className={`rounded-lg p-3 transition-all duration-200 ${
                showForestDebug
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title="Toggle Forest Debug View"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11,1L7,4V6L11,3L15,6V4L11,1M11,8L7,11V13L11,10L15,13V11L11,8M6,7V9L2,12V14L6,11V13L10,10V12L14,9V11L18,8V10L22,7V5L18,8L14,11V9L10,12V10L6,7M11,15L7,18V20L11,17L15,20V18L11,15M11,22L7,19V17L11,20L15,17V19L11,22Z" />
              </svg>
            </button>

            {/* Tree lifecycle debug toggle */}
            <button
              onClick={() => setShowLifecycleDebug(!showLifecycleDebug)}
              className={`rounded-lg p-3 transition-all duration-200 ${
                showLifecycleDebug
                  ? "bg-yellow-500 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
              title="Toggle Tree Lifecycle Debug View"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
              </svg>
            </button>

            {/* Separator */}
            <div className="h-8 w-px bg-white/20" />

            {/* Save button */}
            <button
              onClick={handleSaveWorld}
              disabled={objects.length === 0}
              className="rounded-lg bg-green-500/20 p-3 text-green-400 transition-all duration-200 hover:bg-green-500/30 hover:text-green-300 disabled:cursor-not-allowed disabled:opacity-50"
              title="Save World"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
              </svg>
            </button>

            {/* Screenshot button */}
            <button
              onClick={handleScreenshot}
              className="rounded-lg bg-purple-500/20 p-3 text-purple-400 transition-all duration-200 hover:bg-purple-500/30 hover:text-purple-300"
              title="Screenshot"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
              </svg>
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={objects.length === 0}
              className="rounded-lg bg-blue-500/20 p-3 text-blue-400 transition-all duration-200 hover:bg-blue-500/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              title="Share"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08M18,4A1,1 0 0,1 19,5A1,1 0 0,1 18,6A1,1 0 0,1 17,5A1,1 0 0,1 18,4M6,13A1,1 0 0,1 5,12A1,1 0 0,1 6,11A1,1 0 0,1 7,12A1,1 0 0,1 6,13M18,20C17.45,20 17,19.55 17,19C17,18.45 17.45,18 18,18C18.55,18 19,18.45 19,19C19,19.55 18.55,20 18,20Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Time of day picker */}
      <div className="fixed right-4 top-4 z-40">
        <TimeOfDayPicker />
      </div>

      {/* Object count */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="rounded-lg border border-white/20 bg-black/70 px-3 py-2 backdrop-blur-sm">
          <span className="text-sm text-white/80">
            Objects: {objects.length}/{50}
          </span>
        </div>
      </div>

      {/* Dropdown menu */}
      <DropdownMenu
        isOpen={showDropdownMenu}
        onClose={() => setShowDropdownMenu(false)}
        position={menuPosition}
      />
    </>
  );
}

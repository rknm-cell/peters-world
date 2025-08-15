'use client';

import { useState } from 'react';
import { useWorldStore } from '~/lib/store';
import { RadialMenu } from './RadialMenu';
import { TimeOfDayPicker } from './TimeOfDayPicker';

export function Toolbar() {
  const { isPlacing, setPlacing, objects } = useWorldStore();
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleAddObject = (event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setShowRadialMenu(true);
  };

  const handleSaveWorld = async () => {
    // TODO: Implement world saving with tRPC
    console.log('Saving world:', objects);
  };

  const handleScreenshot = () => {
    // TODO: Implement screenshot functionality
    console.log('Taking screenshot');
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log('Sharing world');
  };

  return (
    <>
      {/* Main toolbar */}
      <div className="fixed top-4 left-4 z-40">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2">
          <div className="flex items-center space-x-2">
            {/* Add object button */}
            <button
              onClick={handleAddObject}
              className={`p-3 rounded-lg transition-all duration-200 ${
                isPlacing
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
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
                onClick={() => setPlacing(false)}
                className="p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200"
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

            {/* Separator */}
            <div className="w-px h-8 bg-white/20" />

            {/* Save button */}
            <button
              onClick={handleSaveWorld}
              disabled={objects.length === 0}
              className="p-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
              className="p-3 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300 transition-all duration-200"
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
              className="p-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
      <div className="fixed top-4 right-4 z-40">
        <TimeOfDayPicker />
      </div>

      {/* Object count */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 px-3 py-2">
          <span className="text-white/80 text-sm">
            Objects: {objects.length}/{50}
          </span>
        </div>
      </div>

      {/* Radial menu */}
      <RadialMenu
        isOpen={showRadialMenu}
        onClose={() => setShowRadialMenu(false)}
        position={menuPosition}
      />
    </>
  );
}
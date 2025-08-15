'use client';

import { useState } from 'react';
import { useWorldStore } from '~/lib/store';

export function Instructions() {
  const [isVisible, setIsVisible] = useState(true);
  const isPlacing = useWorldStore((state) => state.isPlacing);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-40 p-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white transition-colors"
        title="Show instructions"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm">Controls</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2 text-white/80 text-xs">
          {!isPlacing ? (
            <>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
                <span>Drag to rotate globe</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></span>
                <span>Scroll to zoom in/out</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></span>
                <span>Click + to add objects</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></span>
                <span>Click on globe to place object</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
                <span>Globe rotation disabled while placing</span>
              </div>
            </>
          )}
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></span>
            <span>Double-click objects to delete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
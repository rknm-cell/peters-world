"use client";

import { useState } from "react";
import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { Instructions } from "~/components/ui/Instructions";
import { WorldTitleCanvas } from "~/components/three/WorldTitleCanvas";
import { useWorldPersistence } from "~/lib/hooks/useWorldPersistence";

export default function Home() {
  // Enable auto-save and auto-restore
  const { hasRestoredWorld } = useWorldPersistence();
  
  // State to control overlay visibility
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="relative h-screen w-screen bg-gray-900">
      <Canvas />
      <Toolbar />
      <Instructions />
      
      {/* Landing page text overlay */}
      {showOverlay && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer"
          onClick={() => setShowOverlay(false)}
        >
                  <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 text-center text-white">
          {/* 3D Title */}
          <div className="w-full h-32 sm:h-48 mb-4">
            <WorldTitleCanvas />
          </div>
          
          <p className="max-w-2xl text-center text-xl">
            Welcome to my world <br /> Make it your own
          </p>
          
          <div className="text-lg opacity-80">
            Click anywhere to start building
          </div>
        </div>
        </div>
      )}
      
      {/* Show restoration indicator - only on client to avoid hydration issues */}
      {typeof window !== "undefined" && hasRestoredWorld && (
        <div className="fixed bottom-4 left-20 z-40 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 backdrop-blur-sm">
          <p className="text-sm text-green-400">
            ✅ World restored from auto-save
          </p>
        </div>
      )}
    </div>
  );
}

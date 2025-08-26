"use client";

import { useState } from "react";
import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { Instructions } from "~/components/ui/Instructions";
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
          <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center text-white">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              Peter&apos;s <span className="text-[hsl(280,100%,70%)]">World</span>
            </h1>
            <p className="max-w-2xl text-center text-xl">
              Create beautiful 3D dioramas with our intuitive world builder.
              Design floating islands, place objects, and share your creations
              with the community.
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

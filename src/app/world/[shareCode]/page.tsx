"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Canvas } from "~/components/editor/Canvas";
import { BackgroundMusic } from "~/components/three/BackgroundMusic";
import { api } from "~/trpc/react";
import { useWorldStore } from "~/lib/store";
import { deserializeWorld } from "~/lib/utils/world-serialization";

export default function WorldViewPage() {
  const params = useParams();
  const shareCode = params.shareCode as string;
  
  const { loadWorld } = useWorldStore();
  
  // Fetch world data by share code
  const { data: world, isLoading, error } = api.world.getByShareCode.useQuery(
    { shortCode: shareCode },
    { enabled: !!shareCode }
  );

  // Load world data when available
  useEffect(() => {
    if (world?.data) {
      try {
        const worldData = deserializeWorld(world.data);
        loadWorld(worldData);
      } catch (error) {
        console.error("Failed to load world:", error);
      }
    }
  }, [world, loadWorld]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-white">Loading world...</p>
        </div>
      </div>
    );
  }

  if (error || !world) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="mb-4 text-red-400">World not found</p>
          <a 
            href="/create" 
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Create Your Own World
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-gray-900">
      <Canvas />
      
      {/* Background Music */}
      <BackgroundMusic volume={0.3} autoPlay={true} />
      
      {/* World info overlay */}
      <div className="fixed left-4 top-4 z-40 rounded-lg border border-white/20 bg-black/70 p-3 backdrop-blur-sm">
        <h1 className="text-lg font-semibold text-white">{world.name}</h1>
        <p className="text-sm text-white/60">
          Created {new Date(world.created).toLocaleDateString()}
        </p>
        <p className="text-xs text-white/40">
          Share code: {shareCode}
        </p>
      </div>

      {/* Actions */}
      <div className="fixed right-4 top-4 z-40 flex gap-2">
        <a
          href="/create"
          className="rounded-lg bg-blue-500/20 p-2 text-blue-400 transition-all duration-200 hover:bg-blue-500/30 hover:text-blue-300"
          title="Create Your Own"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4V10H20C21.1 10 22 10.9 22 12C22 13.1 21.1 14 20 14H14V20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20V14H4C2.9 14 2 13.1 2 12C2 10.9 2.9 10 4 10H10V4C10 2.9 10.9 2 12 2Z" />
          </svg>
        </a>
      </div>
    </div>
  );
}

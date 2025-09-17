"use client";

import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { Instructions } from "~/components/ui/Instructions";
// import { PerformanceDebug } from "~/components/ui/PerformanceDebug";
// import { MeshDebugPanel } from "~/components/ui/MeshDebugPanel";
// import { PlacementDebugPanel } from "~/components/ui/PlacementDebugPanel";
// import { CollisionDebugPanel } from "~/components/debug/CollisionMeshDebug";
// import { PathfindingDebugPanel } from "~/components/debug/DeerPathfindingDebug";
// import { CollisionValidationTest } from "~/components/debug/CollisionValidationTest";
// import { TerrainHeightMapDebug } from "~/components/debug/TerrainHeightMap";
// import { TerrainNormalMapDebug } from "~/components/debug/TerrainNormalMap";
import { useWorldPersistence } from "~/lib/hooks/useWorldPersistence";
import { DefaultWorldCapture } from "~/components/ui/DefaultWorldCapture";

export default function CreatePage() {
  // Enable auto-save and auto-restore
  const { hasRestoredWorld, loadedDefaultWorld } = useWorldPersistence();

  return (
    <div className="relative h-screen w-screen bg-gray-900">
      <Canvas />
      <Toolbar />
      <Instructions />
      {/* <PerformanceDebug /> */}
      {/* <MeshDebugPanel /> */}
      {/* <PlacementDebugPanel /> */}
      {/* <CollisionDebugPanel /> */}
      {/* <PathfindingDebugPanel /> */}
            {/* <CollisionValidationTest /> */}
      {/* <TerrainHeightMapDebug /> */}
      {/* <TerrainNormalMapDebug /> */}
      
      {/* Development utility to capture current world as default */}
      {/* <DefaultWorldCapture /> */}
      
     
      
      {/* Show default world indicator - only on client to avoid hydration issues */}
      {typeof window !== "undefined" && loadedDefaultWorld && (
        <div className="fixed bottom-4 left-20 z-40 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 backdrop-blur-sm">
          <p className="text-sm text-blue-400">
            🌟 Welcome! Default world loaded
          </p>
        </div>
      )}
    </div>
  );
}

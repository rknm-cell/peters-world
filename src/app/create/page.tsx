"use client";

import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { TerraformToolbar } from "~/components/ui/TerraformToolbar";
import { Instructions } from "~/components/ui/Instructions";
import { PerformanceDebug } from "~/components/ui/PerformanceDebug";
import { MeshDebugPanel } from "~/components/ui/MeshDebugPanel";
import { PlacementDebugPanel } from "~/components/ui/PlacementDebugPanel";
import { CollisionDebugPanel } from "~/components/debug/CollisionMeshDebug";
import { PathfindingDebugPanel } from "~/components/debug/DeerPathfindingDebug";
import { CollisionValidationTest } from "~/components/debug/CollisionValidationTest";
import { TerrainHeightMapDebug } from "~/components/debug/TerrainHeightMap";
import { TerrainNormalMapDebug } from "~/components/debug/TerrainNormalMap";
import { useWorldPersistence } from "~/lib/hooks/useWorldPersistence";

export default function CreatePage() {
  // Enable auto-save and auto-restore
  const { hasRestoredWorld } = useWorldPersistence();

  return (
    <div className="relative h-screen w-screen bg-gray-900">
      <Canvas />
      <Toolbar />
      <TerraformToolbar />
      <Instructions />
      <PerformanceDebug />
      <MeshDebugPanel />
      <PlacementDebugPanel />
      <CollisionDebugPanel />
      <PathfindingDebugPanel />
      <CollisionValidationTest />
      <TerrainHeightMapDebug />
      <TerrainNormalMapDebug />
      
      {/* Show restoration indicator - only on client to avoid hydration issues */}
      {typeof window !== "undefined" && hasRestoredWorld && (
        <div className="fixed bottom-4 left-4 z-40 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 backdrop-blur-sm">
          <p className="text-sm text-green-400">
            ✅ World restored from auto-save
          </p>
        </div>
      )}
    </div>
  );
}

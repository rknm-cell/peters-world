"use client";

import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { TerraformToolbar } from "~/components/ui/TerraformToolbar";
import { Instructions } from "~/components/ui/Instructions";
import { PerformanceDebug } from "~/components/ui/PerformanceDebug";
import { MeshDebugPanel } from "~/components/ui/MeshDebugPanel";
import { CollisionDebugPanel } from "~/components/debug/CollisionMeshDebug";
import { PathfindingDebugPanel } from "~/components/debug/DeerPathfindingDebug";
import { CollisionValidationTest } from "~/components/debug/CollisionValidationTest";
import { TerrainHeightMapDebug } from "~/components/debug/TerrainHeightMap";
import { TerrainNormalMapDebug } from "~/components/debug/TerrainNormalMap";

export default function CreatePage() {
  return (
    <div className="relative h-screen w-screen bg-gray-900">
      <Canvas />
      <Toolbar />
      <TerraformToolbar />
      <Instructions />
      <PerformanceDebug />
      <MeshDebugPanel />
      <CollisionDebugPanel />
      <PathfindingDebugPanel />
      <CollisionValidationTest />
      <TerrainHeightMapDebug />
      <TerrainNormalMapDebug />
    </div>
  );
}

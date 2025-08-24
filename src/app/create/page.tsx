"use client";

import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { TerraformToolbar } from "~/components/ui/TerraformToolbar";
import { Instructions } from "~/components/ui/Instructions";
import { PerformanceDebug } from "~/components/ui/PerformanceDebug";
import { MeshDebugPanel } from "~/components/ui/MeshDebugPanel";
import { CollisionDebugPanel } from "~/components/debug/CollisionMeshDebug";

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
    </div>
  );
}

"use client";

import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { Instructions } from "~/components/ui/Instructions";

export default function CreatePage() {
  return (
    <div className="relative h-screen w-screen bg-gray-900">
      <Canvas />
      <Toolbar />
      <Instructions />
    </div>
  );
}

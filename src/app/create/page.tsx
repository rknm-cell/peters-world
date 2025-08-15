'use client';

import { Canvas } from '~/components/editor/Canvas';
import { Toolbar } from '~/components/ui/Toolbar';

export default function CreatePage() {
  return (
    <div className="w-screen h-screen bg-gray-900 relative">
      <Canvas />
      <Toolbar />
    </div>
  );
}
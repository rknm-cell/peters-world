'use client';

import { Canvas } from '~/components/editor/Canvas';
import { Toolbar } from '~/components/ui/Toolbar';
import { Instructions } from '~/components/ui/Instructions';

export default function CreatePage() {
  return (
    <div className="w-screen h-screen bg-gray-900 relative">
      <Canvas />
      <Toolbar />
      <Instructions />
    </div>
  );
}
'use client';

import { Canvas } from '~/components/editor/Canvas';

export default function CreatePage() {
  return (
    <div className="w-screen h-screen bg-gray-900">
      <Canvas />
    </div>
  );
}
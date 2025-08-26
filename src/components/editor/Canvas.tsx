"use client";

import { Canvas as R3FCanvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Scene } from "./Scene";

interface CanvasProps {
  className?: string;
}

export function Canvas({ className = "" }: CanvasProps) {
  return (
    <div className={`relative h-full w-full ${className}`}>
      <R3FCanvas
        // Using default frameloop for animations, focus on preventing re-renders instead
        camera={{
          position: [0, 0, 20], // Position camera directly in front of globe
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        shadows
        gl={{
          antialias: true,
          alpha: false,
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </R3FCanvas>
    </div>
  );
}

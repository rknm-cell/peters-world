"use client";

import { Canvas } from "@react-three/fiber";
import { WorldTitle3D } from "./objects/WorldTitle3D";
import * as THREE from "three";

interface WorldTitleCanvasProps {
  className?: string;
}

export function WorldTitleCanvas({ className = "" }: WorldTitleCanvasProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ 
          position: [0, 0, 2.5], 
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance",
          shadowMap: true,
          shadowMapType: THREE.PCFSoftShadowMap
        }}
        style={{ background: 'transparent' }}
        shadows
      >
        {/* 3D Title */}
        <WorldTitle3D 
          position={[0, 0, 0]} 
          scale={1.0}
        />
        
        {/* Subtle background elements for depth */}
        <mesh position={[0, 0, -1.5]} receiveShadow>
          <planeGeometry args={[8, 8]} />
          <meshBasicMaterial 
            color="#000000" 
            transparent 
            opacity={0.05}
          />
        </mesh>
        
        {/* Environment for better reflections */}
        <mesh position={[0, 0, -2]} receiveShadow>
          <sphereGeometry args={[10, 32, 32]} />
          <meshBasicMaterial 
            color="#1e1b4b" 
            transparent 
            opacity={0.02}
            side={THREE.BackSide}
          />
        </mesh>
      </Canvas>
    </div>
  );
}

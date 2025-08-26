"use client";

import { useRef } from "react";
import { Text3D, Center } from "@react-three/drei";
import * as THREE from "three";

interface WorldTitle3DProps {
  position?: [number, number, number];
  scale?: number;
}

export function WorldTitle3D({ 
  position = [0, 0, 0], 
  scale = 1 
}: WorldTitle3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Simple white text */}
      <Center>
        <Text3D
          font="/fonts/modak.typeface.json"
          size={0.5}
          height={0.05}
          curveSegments={16}
          bevelEnabled={false}
        >
          Peter&apos;s World
          <meshBasicMaterial color="#ffffff" />
        </Text3D>
      </Center>

      {/* Simple lighting */}
      <ambientLight intensity={0.8} />
    </group>
  );
}

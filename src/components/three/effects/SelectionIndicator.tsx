"use client";

import React from "react";
import { useSelectedObject, useObjects } from "~/lib/store";
import * as THREE from "three";

/**
 * SelectionIndicator - Shows selection feedback for physics objects without causing re-renders
 * Renders selection rings above physics-controlled animals independently
 */
export function SelectionIndicator() {
  // Use selective subscriptions to avoid re-renders when unrelated state changes
  const selectedObject = useSelectedObject();
  const objects = useObjects();

  // Find the selected object data
  const selectedObjectData = objects.find((obj) => obj.id === selectedObject);

  // Only show selection indicator for physics-controlled animals
  const shouldShowIndicator = selectedObjectData?.type.startsWith("animals/");

  if (!shouldShowIndicator || !selectedObjectData) {
    return null;
  }

  return (
    <group position={selectedObjectData.position}>
      {/* Selection ring */}
      <mesh position={[0, 0.8, 0]}>
        <ringGeometry args={[0.4, 0.6, 16]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Animated glow effect */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.05]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

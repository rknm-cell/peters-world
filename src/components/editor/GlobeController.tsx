"use client";

import React, { useRef, useCallback, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface GlobeControllerProps {
  globeRef: React.RefObject<THREE.Mesh | null>;
  children: React.ReactNode;
  enabled?: boolean;
  onGroupRefReady?: (groupRef: React.RefObject<THREE.Group | null>) => void;
}

export function GlobeController({
  globeRef: _globeRef,
  children,
  enabled = true,
  onGroupRefReady,
}: GlobeControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();

  // Notify parent component of the group ref
  React.useEffect(() => {
    if (onGroupRefReady) {
      onGroupRefReady(groupRef);
    }
  }, [onGroupRefReady]);
  const mouse = useRef(new THREE.Vector2());
  const previousMouse = useRef(new THREE.Vector2());
  const [isDragging, setIsDragging] = useState(false);
  const rotationSpeed = useRef(0.005);

  // Handle mouse/touch start
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;

      setIsDragging(true);
      const rect = gl.domElement.getBoundingClientRect();

      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      previousMouse.current.copy(mouse.current);

      gl.domElement.style.cursor = "grabbing";
    },
    [enabled, gl.domElement],
  );

  // Handle mouse/touch move
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!enabled || !isDragging || !groupRef.current) return;

      const rect = gl.domElement.getBoundingClientRect();

      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Calculate rotation deltas
      const deltaX = mouse.current.x - previousMouse.current.x;
      const deltaY = mouse.current.y - previousMouse.current.y;

      // Apply rotation to the entire group (globe + objects)
      // Rotate around Y-axis for horizontal movement (longitude)
      groupRef.current.rotation.y += deltaX * rotationSpeed.current * 50;

      // Rotate around X-axis for vertical movement (latitude)
      groupRef.current.rotation.x += deltaY * rotationSpeed.current * 50;

      // Clamp X rotation to prevent flipping
      groupRef.current.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, groupRef.current.rotation.x),
      );

      previousMouse.current.copy(mouse.current);
    },
    [enabled, isDragging, gl.domElement],
  );

  // Handle mouse/touch end
  const handlePointerUp = useCallback(() => {
    if (!enabled) return;

    setIsDragging(false);
    gl.domElement.style.cursor = "grab";
  }, [enabled, gl.domElement]);

  // Set up event listeners
  React.useEffect(() => {
    const canvas = gl.domElement;

    if (enabled) {
      canvas.style.cursor = "grab";

      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerup", handlePointerUp);
      canvas.addEventListener("pointerleave", handlePointerUp);
    }

    return () => {
      canvas.style.cursor = "default";
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [
    enabled,
    gl.domElement,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  ]);

  // Auto-rotation when not being dragged (optional)
  useFrame(() => {
    if (!enabled || isDragging || !groupRef.current) return;

    // Gentle auto-rotation
    groupRef.current.rotation.y += 0.001;
  });

  return <group ref={groupRef}>{children}</group>;
}

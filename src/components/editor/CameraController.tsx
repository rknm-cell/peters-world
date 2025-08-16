"use client";

import { OrbitControls } from "@react-three/drei";

export function CameraController() {
  // Configure controls for globe viewing
  const controlsProps = {
    // Target the center of the globe
    target: [0, 0, 0] as [number, number, number],

    // Enable smooth damping
    enableDamping: true,
    dampingFactor: 0.05,

    // Zoom limits for globe
    minDistance: 10, // Closer for detail
    maxDistance: 50, // Further out for overview

    // Allow full rotation around globe
    minPolarAngle: 0, // Allow viewing from any angle
    maxPolarAngle: Math.PI, // Full rotation

    // Disable panning to keep globe centered
    enablePan: false,
    enableZoom: true,
    enableRotate: true,

    // Smooth zoom and rotation
    zoomSpeed: 0.8,
    rotateSpeed: 0.5, // Slower rotation for precision
  };

  return <OrbitControls {...controlsProps} />;
}

"use client";

import { OrbitControls } from "@react-three/drei";
import { useWorldStore } from "~/lib/store";

export function CameraController() {
  const { isPlacing, terraformMode, isTerraforming } = useWorldStore();
  
  // Only disable camera rotation when placing objects or terraforming
  // This allows users to freely rotate the camera to view the globe from different angles
  const shouldDisableRotation = isPlacing || terraformMode !== "none";
  
  // Debug logging for control state - more prominent logging
  console.warn("🎮 CAMERA CONTROLLER STATE:", { 
    isPlacing, 
    terraformMode, 
    isTerraforming,
    shouldDisableRotation,
    controlsEnabled: !shouldDisableRotation,
    enableRotate: !shouldDisableRotation
  });

  // Add global function to force reset camera controls (for debugging)
  if (typeof window !== 'undefined') {
    window.resetCameraControls = () => {
      console.log("🔧 Force resetting camera controls...");
      useWorldStore.getState().exitPlacementMode();
      useWorldStore.getState().setTerraformMode("none");
    };
  }
  
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
    enableRotate: !shouldDisableRotation, // Disable rotation only when placing/terraforming

    // Smooth zoom and rotation
    zoomSpeed: 0.8,
    rotateSpeed: 0.5, // Slower rotation for precision
  };

  return <OrbitControls {...controlsProps} />;
}

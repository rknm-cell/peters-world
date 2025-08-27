"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface SurfaceAxesDebugProps {
  globeRadius?: number;
  axesSize?: number;
  density?: number;
}

export function SurfaceAxesDebug({
  globeRadius = 6,
  axesSize = 0.3,
  density = 20,
}: SurfaceAxesDebugProps) {
  // Generate a grid of coordinate axes on the sphere surface
  const axesHelpers = useMemo(() => {
    const helpers: THREE.AxesHelper[] = [];

    // Create a grid of points on the sphere
    for (let phi = 0; phi <= Math.PI; phi += Math.PI / density) {
      for (
        let theta = 0;
        theta <= 2 * Math.PI;
        theta += (2 * Math.PI) / density
      ) {
        // Convert spherical coordinates to Cartesian
        const x = globeRadius * Math.sin(phi) * Math.cos(theta);
        const y = globeRadius * Math.cos(phi);
        const z = globeRadius * Math.sin(phi) * Math.sin(theta);

        // Calculate surface normal (points outward from sphere center)
        const normal = new THREE.Vector3(x, y, z).normalize();

        // Create axes helper
        const axes = new THREE.AxesHelper(axesSize);

        // Position the axes at the surface point
        axes.position.set(x, y, z);

        // Orient the axes to align with the surface normal
        // Use the same approach as the placement system for consistency
        const quaternion = new THREE.Quaternion();

        // Align the axes Y-axis (up) with the surface normal
        const objectUp = new THREE.Vector3(0, 1, 0);
        quaternion.setFromUnitVectors(objectUp, normal);

        // Apply the quaternion rotation
        axes.quaternion.copy(quaternion);

        // Add 90-degree rotation around Y axis to match placement system
        axes.rotateY(Math.PI / 2);

        helpers.push(axes);
      }
    }

    return helpers;
  }, [globeRadius, axesSize, density]);

  return (
    <group>
      {axesHelpers.map((axes, index) => (
        <primitive key={index} object={axes} />
      ))}
    </group>
  );
}

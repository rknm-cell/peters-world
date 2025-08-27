"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface SurfaceNormalDebugProps {
  globeRadius?: number;
  normalLength?: number;
  density?: number;
  color?: string;
}

export function SurfaceNormalDebug({
  globeRadius = 6,
  normalLength = 0.3,
  density = 20,
  color = "#ff0000",
}: SurfaceNormalDebugProps) {
  // Generate a grid of points on the sphere surface
  const normalArrows = useMemo(() => {
    const arrows: THREE.ArrowHelper[] = [];

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

        // Create arrow helper
        const arrow = new THREE.ArrowHelper(
          normal,
          new THREE.Vector3(x, y, z),
          normalLength,
          color,
          normalLength * 0.3, // Head length
          normalLength * 0.2, // Head width
        );

        arrows.push(arrow);
      }
    }

    return arrows;
  }, [globeRadius, normalLength, density, color]);

  return (
    <group>
      {normalArrows.map((arrow, index) => (
        <primitive key={index} object={arrow} />
      ))}
    </group>
  );
}

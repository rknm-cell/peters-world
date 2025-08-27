"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { calculatePlacement } from "~/lib/utils/placement";

interface PlacementOrientationDebugProps {
  globeRadius?: number;
  normalLength?: number;
  density?: number;
  color?: string;
  useMeshNormals?: boolean;
  showMathNormalComparison?: boolean;
}

export function PlacementOrientationDebug({
  globeRadius = 6,
  normalLength = 0.3,
  density = 20,
  color = "#00ff00",
  useMeshNormals: _useMeshNormals = false,
  showMathNormalComparison = false,
}: PlacementOrientationDebugProps) {
  const { selectedObjectType, objects } = useWorldStore();

  // Generate placement orientation arrows - EXACT COPY of SurfaceNormalDebug structure
  const placementArrows = useMemo(() => {
    const arrows: THREE.ArrowHelper[] = [];
    const mathArrows: THREE.ArrowHelper[] = [];

    const objectType = selectedObjectType ?? "tree";

    // Create a grid of points on the sphere - IDENTICAL to SurfaceNormalDebug
    for (let phi = 0; phi <= Math.PI; phi += Math.PI / density) {
      for (
        let theta = 0;
        theta <= 2 * Math.PI;
        theta += (2 * Math.PI) / density
      ) {
        // Convert spherical coordinates to Cartesian - IDENTICAL to SurfaceNormalDebug
        const x = globeRadius * Math.sin(phi) * Math.cos(theta);
        const y = globeRadius * Math.cos(phi);
        const z = globeRadius * Math.sin(phi) * Math.sin(theta);

        // Calculate surface normal (points outward from sphere center) - IDENTICAL to SurfaceNormalDebug
        const normal = new THREE.Vector3(x, y, z).normalize();
        const surfacePoint = new THREE.Vector3(x, y, z);

        // Calculate placement rotation using the mathematical normal
        const placementInfo = calculatePlacement(
          objectType,
          surfacePoint,
          normal,
          objects,
        );

        // Create placement orientation vector from Euler rotation
        const placementUp = new THREE.Vector3(0, 1, 0);
        placementUp.applyEuler(placementInfo.rotation);

        // Create arrow helper - IDENTICAL structure to SurfaceNormalDebug
        const arrow = new THREE.ArrowHelper(
          placementUp,
          surfacePoint,
          normalLength,
          placementInfo.canPlace ? color : "#ff0000",
          normalLength * 0.3, // Head length - IDENTICAL to SurfaceNormalDebug
          normalLength * 0.2, // Head width - IDENTICAL to SurfaceNormalDebug
        );

        arrows.push(arrow);

        // Add comparison arrow if requested - IDENTICAL to SurfaceNormalDebug
        if (showMathNormalComparison) {
          const mathArrow = new THREE.ArrowHelper(
            normal,
            surfacePoint,
            normalLength,
            "#ff0000",
            normalLength * 0.3,
            normalLength * 0.2,
          );
          mathArrows.push(mathArrow);
        }
      }
    }

    return { arrows, mathArrows };
  }, [
    globeRadius,
    normalLength,
    density,
    color,
    selectedObjectType,
    objects,
    showMathNormalComparison,
  ]);

  return (
    <group>
      {/* Placement arrows - IDENTICAL rendering to SurfaceNormalDebug */}
      {placementArrows.arrows.map((arrow, index) => (
        <primitive key={`placement-${index}`} object={arrow} />
      ))}

      {/* Math normal comparison - IDENTICAL rendering to SurfaceNormalDebug */}
      {placementArrows.mathArrows.map((arrow, index) => (
        <primitive key={`math-${index}`} object={arrow} />
      ))}
    </group>
  );
}

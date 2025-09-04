"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface MeshDebugVisualizerProps {
  mesh: THREE.Mesh | null;
  terrainVertices: Array<{
    x: number;
    y: number;
    z: number;
    height: number;
    waterLevel: number;
  }>;
  debugMode:
    | "wireframe"
    | "normals"
    | "heightmap"
    | "watermap"
    | "vertex-dots"
    | "off";
}

/**
 * Visual debug tool for planet mesh after terraforming
 * Shows wireframe, normals, height visualization, and water levels
 */
export function MeshDebugVisualizer({
  mesh,
  terrainVertices,
  debugMode,
}: MeshDebugVisualizerProps) {
  // Only keep materials and geometries that are actually used

  // Vertex dots geometry
  const vertexDotsGeometry = useMemo(() => {
    if (!mesh?.geometry) return null;

    const positions = mesh.geometry.attributes.position;
    if (!positions) return null;

    const geometry = new THREE.BufferGeometry();
    const points = [];

    // Sample every 10th vertex for performance
    for (let i = 0; i < positions.count; i += 10) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      points.push(x, y, z);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    return geometry;
  }, [mesh?.geometry]);

  // Normal visualization geometry
  const normalGeometry = useMemo(() => {
    if (!mesh?.geometry) return null;

    const positions = mesh.geometry.attributes.position;
    const normals = mesh.geometry.attributes.normal;
    if (!positions || !normals) return null;

    const geometry = new THREE.BufferGeometry();
    const points = [];

    // Sample every 20th vertex for performance
    for (let i = 0; i < positions.count; i += 20) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);

      // Line from vertex to vertex + normal
      points.push(x, y, z);
      points.push(x + nx * 0.2, y + ny * 0.2, z + nz * 0.2);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    return geometry;
  }, [mesh?.geometry]);

  // Add water level attribute to geometry when needed
  useMemo(() => {
    if (!mesh?.geometry || debugMode !== "watermap") return;

    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    if (!positions) return;

    const waterLevels = new Float32Array(positions.count);

    // Map terrain vertices to geometry vertices
    for (
      let i = 0;
      i < Math.min(positions.count, terrainVertices.length);
      i++
    ) {
      const vertex = terrainVertices[i];
      waterLevels[i] = vertex?.waterLevel ?? 0;
    }

    geometry.setAttribute(
      "waterLevel",
      new THREE.BufferAttribute(waterLevels, 1),
    );
  }, [mesh?.geometry, terrainVertices, debugMode]);

  // Debug logging
  useMemo(() => {
    if (mesh) {
      // Mesh debug visualization updated
    }
  }, [mesh]);

  if (!mesh || debugMode === "off") return null;

  return (
    <>
      {/* Only render overlays for modes that need separate geometry */}

      {debugMode === "vertex-dots" && vertexDotsGeometry && (
        <points
          geometry={vertexDotsGeometry}
          position={mesh.position}
          rotation={mesh.rotation}
          scale={mesh.scale}
        >
          <pointsMaterial color={0xff0000} size={0.02} />
        </points>
      )}

      {debugMode === "normals" && normalGeometry && (
        <lineSegments
          geometry={normalGeometry}
          position={mesh.position}
          rotation={mesh.rotation}
          scale={mesh.scale}
        >
          <lineBasicMaterial color={0x00ffff} />
        </lineSegments>
      )}
    </>
  );
}

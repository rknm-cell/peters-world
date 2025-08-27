"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { globalTerrainCollider } from "~/components/three/physics/GlobePhysics";

interface NormalMapData {
  canvas: HTMLCanvasElement;
  texture: THREE.DataTexture;
  normals: Float32Array; // RGB = XYZ normal vectors
  resolution: number;
}

/**
 * TerrainNormalMapGenerator - Creates a normal map from collision mesh
 * for surface analysis and slope detection
 */
export class TerrainNormalMapGenerator {
  private static instance: TerrainNormalMapGenerator | null = null;
  private normalMapData: NormalMapData | null = null;
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 1000;

  static getInstance(): TerrainNormalMapGenerator {
    TerrainNormalMapGenerator.instance ??= new TerrainNormalMapGenerator();
    return TerrainNormalMapGenerator.instance;
  }

  /**
   * Generate normal map from collision mesh
   */
  generateNormalMap(resolution = 256): NormalMapData | null {
    const now = Date.now();

    if (this.normalMapData && now - this.lastUpdate < this.UPDATE_INTERVAL) {
      return this.normalMapData;
    }

    if (!globalTerrainCollider?.vertices || !globalTerrainCollider?.indices) {
      console.warn(
        "No terrain collider data available for normal map generation",
      );
      return null;
    }

    console.log("🧭 Generating terrain normal map...", { resolution });

    const vertices = globalTerrainCollider.vertices;
    const indices = globalTerrainCollider.indices;

    const canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    // Create normal data array (3 components per pixel)
    const normalData = new Float32Array(resolution * resolution * 3);

    // Calculate normals for each pixel
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const u = x / (resolution - 1);
        const v = y / (resolution - 1);

        // Convert UV to spherical coordinates
        const phi = u * Math.PI * 2;
        const theta = v * Math.PI;

        const spherePoint = new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi),
          Math.cos(theta),
          Math.sin(theta) * Math.sin(phi),
        );

        // Calculate surface normal at this point
        const normal = this.calculateSurfaceNormal(
          spherePoint,
          vertices,
          indices,
        );

        const pixelIndex = (y * resolution + x) * 3;
        normalData[pixelIndex] = normal.x;
        normalData[pixelIndex + 1] = normal.y;
        normalData[pixelIndex + 2] = normal.z;
      }
    }

    // Create visual representation
    const imageData = ctx.createImageData(resolution, resolution);

    for (let i = 0; i < normalData.length / 3; i++) {
      const normalIndex = i * 3;
      const pixelIndex = i * 4;

      // Convert normal from [-1,1] to [0,255]
      const r = Math.floor((normalData[normalIndex]! + 1) * 127.5);
      const g = Math.floor((normalData[normalIndex + 1]! + 1) * 127.5);
      const b = Math.floor((normalData[normalIndex + 2]! + 1) * 127.5);

      imageData.data[pixelIndex] = r;
      imageData.data[pixelIndex + 1] = g;
      imageData.data[pixelIndex + 2] = b;
      imageData.data[pixelIndex + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    // Create Three.js texture
    const texture = new THREE.DataTexture(
      normalData,
      resolution,
      resolution,
      THREE.RGBFormat,
      THREE.FloatType,
    );
    texture.needsUpdate = true;

    this.normalMapData = {
      canvas,
      texture,
      normals: normalData,
      resolution,
    };

    this.lastUpdate = now;
    console.log("✅ Normal map generated");

    return this.normalMapData;
  }

  /**
   * Calculate surface normal at a point using nearby triangles
   */
  private calculateSurfaceNormal(
    spherePoint: THREE.Vector3,
    vertices: Float32Array,
    indices: Uint32Array,
  ): THREE.Vector3 {
    const nearbyNormals: THREE.Vector3[] = [];
    const searchRadius = 0.3; // Adjust based on mesh density

    // Find triangles near this point
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i]! * 3;
      const i1 = indices[i + 1]! * 3;
      const i2 = indices[i + 2]! * 3;

      const v0 = new THREE.Vector3(
        vertices[i0],
        vertices[i0 + 1],
        vertices[i0 + 2],
      );
      const v1 = new THREE.Vector3(
        vertices[i1],
        vertices[i1 + 1],
        vertices[i1 + 2],
      );
      const v2 = new THREE.Vector3(
        vertices[i2],
        vertices[i2 + 1],
        vertices[i2 + 2],
      );

      // Check if triangle is near our sphere point
      const center = v0.clone().add(v1).add(v2).divideScalar(3).normalize();
      const distance = spherePoint.distanceTo(center);

      if (distance < searchRadius) {
        // Calculate triangle normal
        const edge1 = v1.clone().sub(v0);
        const edge2 = v2.clone().sub(v0);
        const normal = edge1.cross(edge2).normalize();

        // Weight by inverse distance
        const weight = 1 / (distance + 0.001);
        normal.multiplyScalar(weight);
        nearbyNormals.push(normal);
      }
    }

    if (nearbyNormals.length === 0) {
      // Fallback to sphere normal
      return spherePoint.clone().normalize();
    }

    // Average the normals
    const avgNormal = new THREE.Vector3();
    for (const normal of nearbyNormals) {
      avgNormal.add(normal);
    }

    return avgNormal.normalize();
  }

  /**
   * Sample surface normal at world position
   */
  sampleNormal(worldPosition: THREE.Vector3): THREE.Vector3 | null {
    if (!this.normalMapData) return null;

    const spherePos = worldPosition.clone().normalize();

    const phi = Math.atan2(spherePos.z, spherePos.x);
    const theta = Math.acos(spherePos.y);

    const u = (phi + Math.PI) / (2 * Math.PI);
    const v = theta / Math.PI;

    const x = Math.floor(u * (this.normalMapData.resolution - 1));
    const y = Math.floor(v * (this.normalMapData.resolution - 1));
    const index = (y * this.normalMapData.resolution + x) * 3;

    return new THREE.Vector3(
      this.normalMapData.normals[index],
      this.normalMapData.normals[index + 1],
      this.normalMapData.normals[index + 2],
    );
  }

  /**
   * Calculate slope angle at a position
   */
  getSlopeAngle(worldPosition: THREE.Vector3): number | null {
    const normal = this.sampleNormal(worldPosition);
    if (!normal) return null;

    const up = worldPosition.clone().normalize(); // Radial up direction
    const angle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up))));
    return Math.PI / 2 - angle; // Convert to slope angle from vertical
  }

  /**
   * Check if a position is traversable based on slope
   */
  isTraversable(
    worldPosition: THREE.Vector3,
    maxSlopeAngle: number = Math.PI / 4,
  ): boolean {
    const slopeAngle = this.getSlopeAngle(worldPosition);
    return slopeAngle !== null && Math.abs(slopeAngle) <= maxSlopeAngle;
  }

  getNormalMapData(): NormalMapData | null {
    return this.normalMapData;
  }
}

/**
 * React component for normal map visualization
 */
export function TerrainNormalMapDebug() {
  const [normalMapGenerator] = useState(() =>
    TerrainNormalMapGenerator.getInstance(),
  );
  const [showNormalMap, setShowNormalMap] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate normal map periodically using useEffect and setInterval
  useEffect(() => {
    if (!showNormalMap) return;

    const updateNormalMap = () => {
      const normalMapData = normalMapGenerator.generateNormalMap(256);

      if (normalMapData && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 256, 256);
          ctx.drawImage(normalMapData.canvas, 0, 0);
        }
      }
    };

    // Update immediately
    updateNormalMap();

    // Then update every 2 seconds
    const interval = setInterval(updateNormalMap, 2000);

    return () => clearInterval(interval);
  }, [showNormalMap, normalMapGenerator]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setShowNormalMap(!showNormalMap);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNormalMap]);

  if (!showNormalMap) return null;

  return (
    <div className="fixed right-72 top-4 z-50 rounded-lg bg-black/80 p-4 text-white backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Terrain Normal Map</h3>
        <button
          onClick={() => setShowNormalMap(false)}
          className="text-sm text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={256}
        height={256}
        className="rounded border border-gray-600"
        style={{ width: "200px", height: "200px" }}
      />

      <div className="mt-2 text-xs text-gray-400">
        <p>🔴 Red: X-axis normal</p>
        <p>🟢 Green: Y-axis normal</p>
        <p>🔵 Blue: Z-axis normal</p>
        <p>⌨️ Toggle: Ctrl+Shift+N</p>
      </div>
    </div>
  );
}

export const terrainNormalMapGenerator =
  TerrainNormalMapGenerator.getInstance();

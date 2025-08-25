"use client";

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { globalTerrainCollider } from '~/components/three/physics/GlobePhysics';

interface HeightMapData {
  canvas: HTMLCanvasElement;
  texture: THREE.DataTexture;
  data: Float32Array;
  resolution: number;
}

/**
 * TerrainHeightMapGenerator - Creates a height map from the collision mesh
 * for pathfinding validation and terrain analysis
 */
export class TerrainHeightMapGenerator {
  private static instance: TerrainHeightMapGenerator | null = null;
  private heightMapData: HeightMapData | null = null;
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 1000; // Update every second

  static getInstance(): TerrainHeightMapGenerator {
    TerrainHeightMapGenerator.instance ??= new TerrainHeightMapGenerator();
    return TerrainHeightMapGenerator.instance;
  }

  /**
   * Generate height map from collision mesh vertices
   */
  generateHeightMap(resolution = 256): HeightMapData | null {
    const now = Date.now();
    
    // Throttle updates
    if (this.heightMapData && (now - this.lastUpdate) < this.UPDATE_INTERVAL) {
      return this.heightMapData;
    }

    if (!globalTerrainCollider?.vertices || !globalTerrainCollider?.indices) {
      console.warn('No terrain collider data available for height map generation');
      return null;
    }

    console.log('🗺️ Generating terrain height map...', { resolution });

    const vertices = globalTerrainCollider.vertices;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    // Create height data array
    const heightData = new Float32Array(resolution * resolution);
    const minHeight = { value: Infinity };
    const maxHeight = { value: -Infinity };

    // Sample height at each pixel of the height map
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const u = x / (resolution - 1); // 0 to 1
        const v = y / (resolution - 1); // 0 to 1
        
        // Convert UV to spherical coordinates
        const phi = u * Math.PI * 2; // 0 to 2π
        const theta = v * Math.PI;     // 0 to π
        
        // Convert spherical to cartesian (on unit sphere)
        const spherePoint = new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi),
          Math.cos(theta),
          Math.sin(theta) * Math.sin(phi)
        );
        
        // Sample height at this point
        const height = this.sampleHeightAtPoint(spherePoint, vertices);
        heightData[y * resolution + x] = height;
        
        minHeight.value = Math.min(minHeight.value, height);
        maxHeight.value = Math.max(maxHeight.value, height);
      }
    }

    // Normalize height data and create visual representation
    const imageData = ctx.createImageData(resolution, resolution);
    const heightRange = maxHeight.value - minHeight.value;
    
    for (let i = 0; i < heightData.length; i++) {
      const normalizedHeight = heightRange > 0 
        ? (heightData[i]! - minHeight.value) / heightRange 
        : 0;
      
      const pixelIndex = i * 4;
      const intensity = Math.floor(normalizedHeight * 255);
      
      // Grayscale height map
      imageData.data[pixelIndex] = intensity;     // R
      imageData.data[pixelIndex + 1] = intensity; // G
      imageData.data[pixelIndex + 2] = intensity; // B
      imageData.data[pixelIndex + 3] = 255;       // A
    }
    
    ctx.putImageData(imageData, 0, 0);

    // Create Three.js texture
    const texture = new THREE.DataTexture(
      new Uint8Array(imageData.data),
      resolution,
      resolution,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;

    this.heightMapData = {
      canvas,
      texture,
      data: heightData,
      resolution
    };

    this.lastUpdate = now;
    
    console.log('✅ Height map generated', { 
      resolution, 
      minHeight: minHeight.value.toFixed(3), 
      maxHeight: maxHeight.value.toFixed(3) 
    });

    return this.heightMapData;
  }

  /**
   * Sample height at a specific point on the sphere
   */
  private sampleHeightAtPoint(spherePoint: THREE.Vector3, vertices: Float32Array): number {
    let closestDistance = Infinity;
    let closestHeight = 6.0; // Default globe radius

    // Find closest vertex to this sphere point
    for (let i = 0; i < vertices.length; i += 3) {
      const vertex = new THREE.Vector3(
        vertices[i],
        vertices[i + 1],
        vertices[i + 2]
      );
      
      const vertexOnSphere = vertex.clone().normalize();
      const distance = spherePoint.distanceTo(vertexOnSphere);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestHeight = vertex.length(); // Distance from origin = height
      }
    }

    return closestHeight;
  }

  /**
   * Sample height at world position using the height map
   */
  sampleHeight(worldPosition: THREE.Vector3): number | null {
    if (!this.heightMapData) return null;

    const spherePos = worldPosition.clone().normalize();
    
    // Convert to spherical coordinates
    const phi = Math.atan2(spherePos.z, spherePos.x); // -π to π
    const theta = Math.acos(spherePos.y); // 0 to π
    
    // Convert to UV coordinates
    const u = (phi + Math.PI) / (2 * Math.PI); // 0 to 1
    const v = theta / Math.PI; // 0 to 1
    
    // Sample from height map
    const x = Math.floor(u * (this.heightMapData.resolution - 1));
    const y = Math.floor(v * (this.heightMapData.resolution - 1));
    const index = y * this.heightMapData.resolution + x;
    
    return this.heightMapData.data[index] ?? null;
  }

  /**
   * Validate if a path between two points is traversable
   */
  validatePath(
    startPos: THREE.Vector3, 
    endPos: THREE.Vector3, 
    maxSlopeAngle: number = Math.PI / 4,
    samples = 10
  ): { valid: boolean; blockedAt?: THREE.Vector3; reason?: string } {
    if (!this.heightMapData) {
      return { valid: false, reason: 'No height map available' };
    }

    // Sample points along the path
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const currentPos = startPos.clone().lerp(endPos, t);
      const height = this.sampleHeight(currentPos);
      
      if (height === null) {
        return { valid: false, blockedAt: currentPos, reason: 'Height sampling failed' };
      }
      
      // Check if point is underwater (below base radius)
      if (height < 5.8) { // Below water level
        return { valid: false, blockedAt: currentPos, reason: 'Path goes underwater' };
      }
      
      // Check slope if not first point
      if (i > 0) {
        const prevT = (i - 1) / samples;
        const prevPos = startPos.clone().lerp(endPos, prevT);
        const prevHeight = this.sampleHeight(prevPos);
        
        if (prevHeight !== null) {
          const heightDiff = Math.abs(height - prevHeight);
          const distance = currentPos.distanceTo(prevPos);
          const slope = Math.atan2(heightDiff, distance);
          
          if (slope > maxSlopeAngle) {
            return { 
              valid: false, 
              blockedAt: currentPos, 
              reason: `Slope too steep: ${(slope * 180 / Math.PI).toFixed(1)}°` 
            };
          }
        }
      }
    }
    
    return { valid: true };
  }

  getHeightMapData(): HeightMapData | null {
    return this.heightMapData;
  }
}

/**
 * React component for height map visualization and debugging
 */
export function TerrainHeightMapDebug() {
  const [heightMapGenerator] = useState(() => TerrainHeightMapGenerator.getInstance());
  const [showHeightMap, setShowHeightMap] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate height map periodically using useEffect and setInterval
  useEffect(() => {
    if (!showHeightMap) return;

    const updateHeightMap = () => {
      const heightMapData = heightMapGenerator.generateHeightMap(256);
      
      // Update debug canvas
      if (heightMapData && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 256, 256);
          ctx.drawImage(heightMapData.canvas, 0, 0);
        }
      }
    };

    // Update immediately
    updateHeightMap();

    // Then update every 2 seconds
    const interval = setInterval(updateHeightMap, 2000);

    return () => clearInterval(interval);
  }, [showHeightMap, heightMapGenerator]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowHeightMap(!showHeightMap);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHeightMap]);

  if (!showHeightMap) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Terrain Height Map</h3>
        <button
          onClick={() => setShowHeightMap(false)}
          className="text-gray-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={256}
        height={256}
        className="border border-gray-600 rounded"
        style={{ width: '200px', height: '200px' }}
      />
      
      <div className="mt-2 text-xs text-gray-400">
        <p>🏔️ White: High terrain</p>
        <p>🌊 Black: Low/water areas</p>
        <p>⌨️ Toggle: Ctrl+Shift+H</p>
      </div>
    </div>
  );
}

// Export singleton instance
export const terrainHeightMapGenerator = TerrainHeightMapGenerator.getInstance();

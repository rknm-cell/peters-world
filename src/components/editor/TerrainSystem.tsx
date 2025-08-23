"use client";

import { useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { WaterSurface } from '../three/effects/WaterSurface';

import { MeshDebugVisualizer } from '../three/debug/MeshDebugVisualizer';

import { WaterPhysics } from '../three/effects/WaterPhysics';
import { usePerformanceDetector } from '~/lib/utils/performance-detector';


interface TerrainSystemProps {
  onTerrainUpdate?: (geometry: THREE.BufferGeometry) => void;
  onTerrainMeshReady?: (mesh: THREE.Mesh) => void;
}

export function TerrainSystem({ onTerrainUpdate, onTerrainMeshReady }: TerrainSystemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const {
    terrainVertices,
    setTerrainVertices,
    updateTerrainOctree,
    meshDebugMode,
  } = useWorldStore();
  
  // Performance detection for adaptive water quality
  const { profile, shouldReduceQuality } = usePerformanceDetector();

  // Create high-resolution sphere geometry for terrain deformation
  const baseGeometry = useMemo(() => {
    // Much higher resolution for smooth terrain deformation
    return new THREE.SphereGeometry(6, 128, 128);
  }, []);

  // Initialize terrain vertices from geometry
  useEffect(() => {
    if (baseGeometry && Array.isArray(terrainVertices) && terrainVertices.length === 0) {
      const positions = baseGeometry.attributes.position;
      if (!positions) return;
      
      // Initialize vertex colors for natural green terrain
      const colorArray = new Float32Array(positions.count * 3);
      const naturalGreen = new THREE.Color(0x4a7c59); // Base green
      for (let i = 0; i < positions.count; i++) {
        colorArray[i * 3] = naturalGreen.r;
        colorArray[i * 3 + 1] = naturalGreen.g;
        colorArray[i * 3 + 2] = naturalGreen.b;
      }
      baseGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
      
      const newVertices: Array<{
        x: number;
        y: number;
        z: number;
        height: number;
        waterLevel: number;
      }> = [];

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        newVertices.push({
          x,
          y,
          z,
          height: 0, // No initial deformation
          waterLevel: 0, // No initial water
        });
      }

      setTerrainVertices(newVertices);
      // Update the octree after setting vertices
      setTimeout(() => updateTerrainOctree(), 0);
    }
  }, [baseGeometry, setTerrainVertices, terrainVertices, updateTerrainOctree]);

  // Apply terrain deformation to geometry
  const applyTerrainDeformation = useCallback(() => {
    if (!meshRef.current || !Array.isArray(terrainVertices) || terrainVertices.length === 0) return;

    const geometry = meshRef.current.geometry;
    const positions = geometry.attributes.position;
    if (!positions) return;

    // Initialize or get vertex colors attribute
    let colors = geometry.attributes.color;
    if (!colors) {
      // Create color attribute if it doesn't exist
      const colorArray = new Float32Array(positions.count * 3);
      colors = new THREE.BufferAttribute(colorArray, 3);
      geometry.setAttribute('color', colors);
    }

    // Apply height and water modifications to each vertex
    for (let i = 0; i < positions.count; i++) {
      const vertex = terrainVertices[i];
      if (!vertex) continue;

      // Calculate the original direction from center
      const originalX = positions.getX(i);
      const originalY = positions.getY(i);
      const originalZ = positions.getZ(i);

      // Normalize to get direction
      const length = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
      const dirX = originalX / length;
      const dirY = originalY / length;
      const dirZ = originalZ / length;

      // Apply height deformation along the normal direction
      // For proper sphere deformation, we apply height along the surface normal
      const heightOffset = vertex.height;

      // Water no longer affects terrain deformation - it's painted on top
      // const waterOffset = -vertex.waterLevel * 0.4; // Removed water depressions

      // Calculate new position with improved scaling
      // Use a more dramatic scaling for better mountain/valley visibility
      const newLength = 6 + heightOffset * 0.8; // Scale factor for dramatic terrain
      const newX = dirX * newLength;
      const newY = dirY * newLength;
      const newZ = dirZ * newLength;

      positions.setXYZ(i, newX, newY, newZ);

      // Color the terrain based on height deformation
      // Green for natural terrain, brown for raised/disturbed earth
      const naturalGreen = new THREE.Color(0x4a7c59); // Base green
      const disturbedBrown = new THREE.Color(0x654321); // Darker, richer brown earth
      const rockyGray = new THREE.Color(0x8A8A8A); // Gray for high elevations
      
      // Calculate color blend - much more dramatic changes
      let finalColor = naturalGreen.clone();
      
      if (heightOffset > 0) {
        // Raised terrain becomes brown (disturbed earth) much more quickly
        const blendFactor = Math.min(heightOffset / 1.0, 1.0); // Full brown at just 1 unit of height
        
        if (heightOffset > 2.0) {
          // Very high terrain becomes rocky gray
          const rockBlendFactor = Math.min((heightOffset - 2.0) / 2.0, 1.0);
          const brownToGray = disturbedBrown.clone().lerp(rockyGray, rockBlendFactor);
          finalColor = naturalGreen.clone().lerp(brownToGray, 1.0);
        } else {
          finalColor = naturalGreen.clone().lerp(disturbedBrown, blendFactor);
        }
      } else if (heightOffset < 0) {
        // Lowered terrain becomes much darker green/muddy
        const darkenFactor = Math.min(Math.abs(heightOffset) / 2.0, 0.7); // Up to 70% darker
        const muddyGreen = new THREE.Color(0x2d4a1a); // Much darker muddy green
        finalColor = naturalGreen.clone().lerp(muddyGreen, darkenFactor);
      }
      
      colors.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.computeVertexNormals();

    // Notify parent component of terrain update
    onTerrainUpdate?.(geometry);
  }, [onTerrainUpdate, terrainVertices]);

  // Apply terrain deformation whenever vertices change
  useEffect(() => {
    applyTerrainDeformation();
  }, [applyTerrainDeformation]);

  // Notify parent when terrain mesh is ready for terraforming
  useEffect(() => {
    if (meshRef.current && onTerrainMeshReady) {
      onTerrainMeshReady(meshRef.current);
    }
    
    // Debug: Log mesh state for debug visualizer
    console.log('TerrainSystem mesh state:', {
      meshExists: !!meshRef.current,
      geometryExists: !!meshRef.current?.geometry,
      hasUserData: !!meshRef.current?.userData?.isTerrainMesh
    });
  }, [onTerrainMeshReady]);

  // Create material with vertex color support and debug modes
  const material = useMemo(() => {
    switch (meshDebugMode) {
      case 'wireframe':
        return new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: true,
          transparent: false,
          opacity: 1.0,
        });
      
      case 'heightmap':
        return new THREE.ShaderMaterial({
          uniforms: {
            uMinHeight: { value: -4.0 },
            uMaxHeight: { value: 6.0 },
          },
          vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
              vPosition = position;
              vNormal = normal;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float uMinHeight;
            uniform float uMaxHeight;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
              // Calculate distance from center (height deformation)
              float distanceFromCenter = length(vPosition);
              float baseRadius = 6.0;
              float heightOffset = distanceFromCenter - baseRadius;
              
              // Normalize height to 0-1 range
              float normalizedHeight = (heightOffset - uMinHeight) / (uMaxHeight - uMinHeight);
              normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);
              
              // Color gradient: Blue (low) -> Green (middle) -> Red (high)
              vec3 color;
              if (normalizedHeight < 0.5) {
                color = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), normalizedHeight * 2.0);
              } else {
                color = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (normalizedHeight - 0.5) * 2.0);
              }
              
              gl_FragColor = vec4(color, 1.0);
            }
          `,
          side: THREE.DoubleSide,
        });
      
      case 'normals':
        return new THREE.MeshNormalMaterial({
          flatShading: false,
        });
      
      default:
        // Standard terrain material
        return new THREE.MeshStandardMaterial({
          vertexColors: true, // Enable vertex colors
          roughness: 0.8,
          metalness: 0.1,
          flatShading: false,
          depthWrite: true,  // Ensure terrain writes to depth buffer
          depthTest: true,   // Ensure terrain tests depth
        });
    }
  }, [meshDebugMode]);

  // Water creates depressions in the terrain - no separate water mesh needed
  // The water effect is achieved by the waterOffset in applyTerrainDeformation

  // Debug: Check if we have water
  const hasWater = terrainVertices.some(v => v.waterLevel > 0.001); // Match WaterSurface threshold
  const waterCount = terrainVertices.filter(v => v.waterLevel > 0.001).length;
  
  if (hasWater) {
    console.log(`TerrainSystem: Found ${waterCount} vertices with water, max water level: ${Math.max(...terrainVertices.map(v => v.waterLevel))}`);
    console.log(`TerrainSystem: Water levels:`, terrainVertices.filter(v => v.waterLevel > 0.01).map(v => v.waterLevel).slice(0, 10));
  }

  return (
    <>
      {/* Main terrain mesh */}
      <mesh
        ref={meshRef}
        geometry={baseGeometry}
        material={material}
        receiveShadow
        castShadow
        renderOrder={0} // Ensure terrain renders first
        userData={{ isTerrainMesh: true }}
      />

      {/* Animated water surface using shaders */}
      {hasWater && (
        <>
          <WaterSurface terrainVertices={terrainVertices} radius={6} />
          <WaterPhysics 
            terrainVertices={terrainVertices} 
            radius={6} 
            resolution={profile.suggestedWaterResolution}
            lowPerformanceMode={profile.useLowPerformanceMode || shouldReduceQuality}
            updateFrequency={profile.suggestedUpdateFrequency}
          />
        </>
      )}

      {/* Debug visualizer for mesh analysis */}
      <MeshDebugVisualizer
        mesh={meshRef.current}
        terrainVertices={terrainVertices}
        debugMode={meshDebugMode}
      />
    </>
  );
}

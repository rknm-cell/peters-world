"use client";

import { useRef, useMemo, forwardRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { TerrainSystem } from "./TerrainSystem";
import { TerraformController } from "./TerraformController";

interface GlobeProps {
  onRotationChange?: (rotation: [number, number, number]) => void;
}

export const Globe = forwardRef<THREE.Mesh, GlobeProps>(
  ({ onRotationChange: _onRotationChange }, ref) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const { showWireframe } = useWorldStore();
    const [terrainMesh, setTerrainMesh] = useState<THREE.Mesh | null>(null);

    // Create a simple sphere for reference (this will be replaced by TerrainSystem)
    const geometry = useMemo(() => {
      // Create a perfect smooth sphere for reference
      const geo = new THREE.SphereGeometry(6, 64, 64);
      return geo;
    }, []);

    // Create material that receives shadows from directional light
    const material = useMemo(() => {
      return new THREE.MeshStandardMaterial({
        color: 0x4a7c59, // Earthy green
        roughness: 0.8, // Slightly rough surface for realistic shadow reception
        metalness: 0.1, // Low metalness for natural appearance
        flatShading: false, // Smooth shading for the sphere
        wireframe: showWireframe,
        transparent: true,
        opacity: 0.3, // Make it semi-transparent so TerrainSystem shows through
      });
    }, [showWireframe]);

    // Capture mesh instance once mounted so we can safely pass it down
    useEffect(() => {
      if (meshRef.current) {
        setTerrainMesh(meshRef.current);
      }
    }, []);

    return (
      <group ref={groupRef}>
        {/* Reference sphere (semi-transparent) */}
        <mesh
          ref={ref ?? meshRef}
          geometry={geometry}
          material={material}
          receiveShadow
          castShadow
          position={[0, 0, 0]} // Center the globe
        />
        
        {/* Terrain System - this will handle the actual terrain */}
        <TerrainSystem 
          onTerrainUpdate={(geometry) => {
            // Update the reference mesh if needed
            if (meshRef.current) {
              meshRef.current.geometry = geometry;
            }
          }}
        />
        
        {/* Terraform Controller - handles mouse interactions */}
        {terrainMesh && (
          <TerraformController 
            terrainMesh={terrainMesh}
          />
        )}
      </group>
    );
  },
);

Globe.displayName = "Globe";

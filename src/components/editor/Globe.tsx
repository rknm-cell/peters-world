"use client";

import { useRef, useMemo, forwardRef, useCallback } from "react";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { TerrainSystem } from "./TerrainSystem";

interface GlobeProps {
  onRotationChange?: (rotation: [number, number, number]) => void;
  onTerrainMeshReady?: (mesh: THREE.Mesh) => void;
}

export const Globe = forwardRef<THREE.Mesh, GlobeProps>(
  ({ onRotationChange: _onRotationChange, onTerrainMeshReady }, ref) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const terrainMeshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const { showWireframe, setGlobeRef } = useWorldStore();

    // Callback ref to set globe reference when mesh is mounted
    const handleMeshRef = useCallback(
      (mesh: THREE.Mesh | null) => {
        // Set both the forwarded ref and internal ref
        if (typeof ref === "function") {
          ref(mesh);
        } else if (ref) {
          ref.current = mesh;
        }
        meshRef.current = mesh;

        // Set globe reference for tree spawning
        if (mesh) {
          console.log(
            "🌍 Globe mesh mounted - setting reference for tree spawning",
          );
          setGlobeRef(mesh);
        } else {
          console.log("🌍 Globe mesh unmounted - clearing reference");
          setGlobeRef(null);
        }
      },
      [ref, setGlobeRef],
    );

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
        roughness: 1, // Slightly rough surface for realistic shadow reception
        // Low metalness for natural appearance
        flatShading: false, // Smooth shading for the sphere
        transparent: true,
        opacity: 0.3, // Make it semi-transparent so TerrainSystem shows through
      });
    }, []);

    return (
      <group ref={groupRef}>
        {/* Reference sphere (semi-transparent) */}
        <mesh
          ref={handleMeshRef}
          geometry={geometry}
          material={material}
          receiveShadow
          castShadow
          position={[0, 0, 0]} // Center the globe
        />

        {/* Terrain System - this will handle the actual terrain */}
        <TerrainSystem
          onTerrainMeshReady={(terrainMesh) => {
            console.log("🏔️ TerrainSystem mesh ready in Globe");
            terrainMeshRef.current = terrainMesh;
            // Pass the actual terrain mesh to physics, not the reference sphere
            if (onTerrainMeshReady) {
              onTerrainMeshReady(terrainMesh);
            }
          }}
          onTerrainUpdate={(geometry) => {
            // Update the reference mesh if needed
            if (meshRef.current) {
              meshRef.current.geometry = geometry;
            }
          }}
        />

        {/* Separate wireframe overlay that doesn't interfere with water */}
        {showWireframe && (
          <mesh
            geometry={geometry}
            material={
              new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: 0.3,
                depthTest: false, // Don't interfere with depth testing
              })
            }
            position={[0, 0, 0]}
          />
        )}
      </group>
    );
  },
);

Globe.displayName = "Globe";

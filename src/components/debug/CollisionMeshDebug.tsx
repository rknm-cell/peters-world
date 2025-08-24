"use client";

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { useCollisionDebugStore } from './CollisionMeshDebugStore';
import { globalTerrainCollider } from '~/components/three/physics/GlobePhysics';

interface CollisionMeshDebugProps {
  visible?: boolean;
  color?: string;
  opacity?: number;
  wireframe?: boolean;
}

/**
 * CollisionMeshDebug - Visualizes the physics collision mesh of the globe
 * Shows the actual trimesh collider being used by Rapier for collision detection
 */
export function CollisionMeshDebug({ 
  visible = true, 
  color = '#00ff00',
  opacity = 0.3,
  wireframe = true 
}: CollisionMeshDebugProps) {
  const { world } = useRapier();
  const meshRef = useRef<THREE.Mesh>(null);
  const [colliderGeometry, setColliderGeometry] = useState<THREE.BufferGeometry | null>(null);
  const { terrainVertices } = useWorldStore();
  const lastUpdateTime = useRef(0);

  // Update collision mesh visualization when terrain changes
  useEffect(() => {
    if (!world || !visible) return;

    const updateVisualization = () => {
      const now = Date.now();
      // Throttle updates to every 250ms for performance
      if (now - lastUpdateTime.current < 250) return;
      lastUpdateTime.current = now;

      try {
        // Find the globe collider (it should be the largest trimesh collider)
        let globeCollider: any = null;
        let maxVertices = 0;
        let colliderCount = 0;

        // Debug: Log world state
        console.log('🔍 Searching for colliders in world:', world);
        
        // Try different methods to access colliders based on Rapier version
        if (world.forEachCollider) {
          // Method 1: Use forEachCollider if available
          world.forEachCollider((collider: any) => {
            colliderCount++;
            console.log(`📦 Collider ${colliderCount}:`, {
              type: collider.shapeType?.(),
              shape: collider.shape,
              hasVertices: !!collider.vertices,
            });
            
            // Check for trimesh type (9 is the enum value for TriMesh)
            const shapeType = collider.shapeType?.();
            if (shapeType === 9 || shapeType === 'TriMesh') {
              // Try to get vertices
              const vertices = collider.vertices?.() || collider.shape?.vertices;
              if (vertices && vertices.length > maxVertices) {
                maxVertices = vertices.length;
                globeCollider = collider;
                console.log('🎯 Found potential globe collider with vertices:', vertices.length / 3);
              }
            }
          });
        } else if (world.colliders) {
          // Method 2: Direct access to colliders map
          world.colliders.forEach((collider: any) => {
            colliderCount++;
            const shapeType = collider.shapeType?.() || collider.shape?.type;
            console.log(`📦 Collider ${colliderCount} type:`, shapeType);
            
            if (shapeType === 9 || shapeType === 'TriMesh') {
              const vertices = collider.vertices?.() || collider.shape?.vertices;
              if (vertices && vertices.length > maxVertices) {
                maxVertices = vertices.length;
                globeCollider = collider;
              }
            }
          });
        }

        console.log(`📊 Total colliders found: ${colliderCount}`);

        if (globeCollider) {
          console.log('🔍 Found globe collider, extracting geometry...');
          
          // Try different methods to extract vertices and indices
          const vertices = globeCollider.vertices?.() || 
                          globeCollider.shape?.vertices || 
                          globeCollider.trimeshVertices?.();
          
          const indices = globeCollider.indices?.() || 
                         globeCollider.shape?.indices || 
                         globeCollider.trimeshIndices?.();

          console.log('📐 Extracted data:', {
            hasVertices: !!vertices,
            verticesLength: vertices?.length,
            hasIndices: !!indices,
            indicesLength: indices?.length
          });

          if (vertices && indices) {
            // Create a new geometry from the collider data
            const geometry = new THREE.BufferGeometry();
            
            // Set vertices
            const vertexArray = new Float32Array(vertices);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
            
            // Set indices
            const indexArray = new Uint32Array(indices);
            geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
            
            // Compute normals for proper shading
            geometry.computeVertexNormals();
            
            setColliderGeometry(geometry);
            
            console.log('✅ Collision mesh visualization updated:', {
              vertices: vertices.length / 3,
              triangles: indices.length / 3,
              timestamp: new Date().toLocaleTimeString()
            });
          } else {
            console.log('⚠️ Could not extract vertices/indices from collider');
          }
        } else {
          // Fallback: Try to use global terrain collider reference
          console.log('⚠️ No collider found via world iteration, trying global reference...');
          
          if (globalTerrainCollider && globalTerrainCollider.vertices && globalTerrainCollider.indices) {
            console.log('✨ Using global terrain collider reference');
            
            const geometry = new THREE.BufferGeometry();
            
            // Set vertices
            const vertexArray = new Float32Array(globalTerrainCollider.vertices);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
            
            // Set indices
            const indexArray = new Uint32Array(globalTerrainCollider.indices);
            geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
            
            // Compute normals for proper shading
            geometry.computeVertexNormals();
            
            setColliderGeometry(geometry);
            
            console.log('✅ Collision mesh visualization created from global reference:', {
              vertices: globalTerrainCollider.vertexCount,
              triangles: globalTerrainCollider.triangleCount,
              timestamp: new Date().toLocaleTimeString()
            });
          } else {
            console.log('⚠️ No trimesh collider found in physics world or global reference');
            console.log('💡 Make sure terrain has been initialized and collider has been created');
          }
        }
      } catch (error) {
        console.error('❌ Error updating collision mesh visualization:', error);
      }
    };

    // Initial update
    const timeoutId = setTimeout(updateVisualization, 100);

    return () => clearTimeout(timeoutId);
  }, [world, visible, terrainVertices]); // Re-run when terrain changes

  // No animation - keep static brightness as requested

  if (!visible || !colliderGeometry) return null;

  return (
    <mesh ref={meshRef} geometry={colliderGeometry}>
      <meshBasicMaterial
        color={color}
        wireframe={wireframe}
        transparent={true}
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * CollisionDebugVisualization - The 3D visualization component (for use inside Canvas)
 */
export function CollisionDebugVisualization() {
  const { showCollisionMesh, wireframe, opacity, color } = useCollisionDebugStore();
  
  return (
    <CollisionMeshDebug 
      visible={showCollisionMesh}
      wireframe={wireframe}
      opacity={opacity}
      color={color}
    />
  );
}

/**
 * CollisionDebugPanel - UI panel for controlling collision debug visualization (for use outside Canvas)
 */
export function CollisionDebugPanel() {
  const {
    showCollisionMesh,
    wireframe,
    opacity,
    color,
    toggleCollisionMesh,
    setWireframe,
    setOpacity,
    setColor
  } = useCollisionDebugStore();

  // Add keyboard shortcut to toggle collision mesh (Ctrl/Cmd + Shift + C)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        toggleCollisionMesh();
        console.log('🎮 Toggled collision mesh visualization');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleCollisionMesh]);

  return (
    <>
      {/* Control panel */}
      {showCollisionMesh && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg space-y-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">Collision Debug</h3>
            <button
              onClick={toggleCollisionMesh}
              className="text-xs text-gray-400 hover:text-white"
              title="Close (Ctrl+Shift+C)"
            >
              ✕
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="wireframe"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="wireframe" className="text-xs">
              Wireframe
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="opacity" className="text-xs">Opacity:</label>
            <input
              type="range"
              id="opacity"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-xs">{opacity.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="color" className="text-xs">Color:</label>
            <input
              type="color"
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-6"
            />
          </div>

          <div className="text-xs text-gray-400 mt-2 border-t border-gray-700 pt-2">
            <p>📍 Visualizing physics collider</p>
            <p>🔄 Updates when terrain changes</p>
            <p className="mt-1">⌨️ Toggle: Ctrl+Shift+C</p>
          </div>
        </div>
      )}

      {/* Floating indicator when hidden */}
      {!showCollisionMesh && (
        <div 
          className="fixed bottom-4 left-4 bg-black/60 text-white px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-black/80 transition-colors z-50"
          onClick={toggleCollisionMesh}
          title="Show collision debug (Ctrl+Shift+C)"
        >
          🔍 Collision Debug
        </div>
      )}
    </>
  );
}

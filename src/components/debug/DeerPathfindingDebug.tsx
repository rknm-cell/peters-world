"use client";

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { usePathfindingDebugStore } from './PathfindingDebugStore';
import { Text } from '@react-three/drei';

interface DeerDebugData {
  id: string;
  position: THREE.Vector3;
  target: THREE.Vector3 | null;
  state: 'idle' | 'moving' | 'eating' | 'blocked';
  lastDecision: string;
  pathHistory: THREE.Vector3[];
  collisionPoints: THREE.Vector3[];
}

/**
 * DeerPathfindingDebug - Visualizes deer movement, targets, and decision-making
 */
export function DeerPathfindingDebug() {
  const { 
    showPathfinding, 
    showTargets, 
    showPaths, 
    showDecisions,
    showCollisionChecks,
    pathColor, 
    targetColor 
  } = usePathfindingDebugStore();
  
  const { objects } = useWorldStore();
  const [deerDebugData, setDeerDebugData] = useState<Map<string, DeerDebugData>>(new Map());
  const debugDataRef = useRef<Map<string, DeerDebugData>>(new Map());

  // Track deer positions and states
  useFrame(() => {
    if (!showPathfinding) return;

    const newDebugData = new Map<string, DeerDebugData>();
    
    // Find all deer objects
    const deerObjects = objects.filter(obj => obj.type === 'animals/deer');
    
    deerObjects.forEach(deer => {
      const existingData = debugDataRef.current.get(deer.id);
      const currentPosition = new THREE.Vector3(...deer.position);
      
      // Initialize or update deer debug data
      const debugData: DeerDebugData = existingData || {
        id: deer.id,
        position: currentPosition,
        target: null,
        state: 'idle',
        lastDecision: 'Spawned',
        pathHistory: [],
        collisionPoints: []
      };
      
      // Update position
      debugData.position = currentPosition;
      
      // Track path history (limit to last 20 points)
      if (!existingData || 
          currentPosition.distanceTo(existingData.position) > 0.1) {
        debugData.pathHistory = [...debugData.pathHistory, currentPosition].slice(-20);
      }
      
      newDebugData.set(deer.id, debugData);
    });
    
    debugDataRef.current = newDebugData;
    setDeerDebugData(newDebugData);
  });

  // Listen for deer state updates (we'll need to expose these from DeerPhysics)
  useEffect(() => {
    if (!showPathfinding) return;

    // Global function for deer to report their state
    const updateDeerDebug = (
      deerId: string, 
      data: Partial<DeerDebugData>
    ) => {
      const existing = debugDataRef.current.get(deerId);
      if (existing) {
        Object.assign(existing, data);
      }
    };

    // Expose globally for DeerPhysics to use
    (window as any).updateDeerDebug = updateDeerDebug;

    return () => {
      delete (window as any).updateDeerDebug;
    };
  }, [showPathfinding]);

  if (!showPathfinding) return null;

  return (
    <group name="deer-pathfinding-debug">
      {Array.from(deerDebugData.values()).map(deer => (
        <group key={deer.id}>
          {/* Target visualization */}
          {showTargets && deer.target && (
            <>
              {/* Target sphere */}
              <mesh position={deer.target}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial 
                  color={targetColor} 
                  transparent 
                  opacity={0.8} 
                />
              </mesh>
              
              {/* Line from deer to target */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([
                      deer.position.x, deer.position.y, deer.position.z,
                      deer.target.x, deer.target.y, deer.target.z
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial 
                  color={targetColor} 
                  transparent 
                  opacity={0.5}
                  linewidth={1}
                />
              </line>
            </>
          )}
          
          {/* Path history visualization */}
          {showPaths && deer.pathHistory.length > 1 && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={deer.pathHistory.length}
                  array={new Float32Array(
                    deer.pathHistory.flatMap(p => [p.x, p.y, p.z])
                  )}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial 
                color={pathColor} 
                transparent 
                opacity={0.6}
                linewidth={2}
              />
            </line>
          )}
          
          {/* Collision check points */}
          {showCollisionChecks && deer.collisionPoints.map((point, idx) => (
            <mesh key={idx} position={point}>
              <boxGeometry args={[0.05, 0.05, 0.05]} />
              <meshBasicMaterial 
                color="#ff00ff" 
                transparent 
                opacity={0.5} 
              />
            </mesh>
          ))}
          
          {/* Decision text */}
          {showDecisions && (
            <Text
              position={[
                deer.position.x,
                deer.position.y + 0.5,
                deer.position.z
              ]}
              fontSize={0.1}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="black"
            >
              {`${deer.state}: ${deer.lastDecision}`}
            </Text>
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * PathfindingDebugPanel - UI controls for pathfinding visualization
 */
export function PathfindingDebugPanel() {
  const {
    showPathfinding,
    showTargets,
    showPaths,
    showDecisions,
    showCollisionChecks,
    pathColor,
    targetColor,
    togglePathfinding,
    setShowTargets,
    setShowPaths,
    setShowDecisions,
    setShowCollisionChecks,
    setPathColor,
    setTargetColor
  } = usePathfindingDebugStore();

  // Add keyboard shortcut (Ctrl/Cmd + Shift + P)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        togglePathfinding();
        console.log('🦌 Toggled deer pathfinding debug');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePathfinding]);

  return (
    <>
      {/* Control panel */}
      {showPathfinding && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg space-y-3 z-50 w-64">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">🦌 Pathfinding Debug</h3>
            <button
              onClick={togglePathfinding}
              className="text-xs text-gray-400 hover:text-white"
              title="Close (Ctrl+Shift+D)"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showTargets}
                onChange={(e) => setShowTargets(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs">Show Targets</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPaths}
                onChange={(e) => setShowPaths(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs">Show Path History</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDecisions}
                onChange={(e) => setShowDecisions(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs">Show Decisions</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCollisionChecks}
                onChange={(e) => setShowCollisionChecks(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs">Show Collision Checks</span>
            </label>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-xs">Target Color:</label>
              <input
                type="color"
                value={targetColor}
                onChange={(e) => setTargetColor(e.target.value)}
                className="w-8 h-6"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs">Path Color:</label>
              <input
                type="color"
                value={pathColor}
                onChange={(e) => setPathColor(e.target.value)}
                className="w-8 h-6"
              />
            </div>
          </div>

          <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
            <p>🎯 Red spheres: Movement targets</p>
            <p>📍 Yellow lines: Path history</p>
            <p>💭 Text: Current state & decision</p>
            <p className="mt-1">⌨️ Toggle: Ctrl+Shift+D</p>
          </div>
        </div>
      )}

      {/* Floating indicator when hidden */}
      {!showPathfinding && (
        <div 
          className="fixed bottom-4 right-4 bg-black/60 text-white px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-black/80 transition-colors z-50"
          onClick={togglePathfinding}
          title="Show pathfinding debug (Ctrl+Shift+D)"
        >
          🦌 Pathfinding Debug
        </div>
      )}
    </>
  );
}

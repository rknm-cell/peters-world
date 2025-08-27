"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";
import { usePathfindingDebugStore } from "./PathfindingDebugStore";
import { Text } from "@react-three/drei";
import type { TerrainVertex } from "~/lib/store";

/**
 * Sample terrain height at a given position using weighted interpolation
 */
function sampleTerrainHeight(
  position: THREE.Vector3,
  terrainVertices: TerrainVertex[],
): number {
  if (!terrainVertices || terrainVertices.length === 0) {
    return 6.0; // Default globe radius
  }

  // Normalize position to get direction
  const direction = position.clone().normalize();

  // Find 3 closest terrain vertices for interpolation
  const closestVertices: {
    vertex: TerrainVertex;
    angle: number;
    weight: number;
  }[] = [];

  for (const vertex of terrainVertices) {
    if (!vertex) continue;

    // Calculate angle between this vertex and our position
    const vertexDir = new THREE.Vector3(
      vertex.x,
      vertex.y,
      vertex.z,
    ).normalize();
    const angle = direction.angleTo(vertexDir);

    // Keep track of 3 closest vertices
    if (closestVertices.length < 3) {
      closestVertices.push({ vertex, angle, weight: 0 });
    } else {
      const maxAngleIndex = closestVertices.reduce(
        (maxIdx, curr, idx) =>
          curr.angle > closestVertices[maxIdx]!.angle ? idx : maxIdx,
        0,
      );

      if (angle < closestVertices[maxAngleIndex]!.angle) {
        closestVertices[maxAngleIndex] = { vertex, angle, weight: 0 };
      }
    }
  }

  if (closestVertices.length === 0) {
    return 6.05; // Default with small offset
  }

  // Calculate weights based on inverse distance
  const totalWeight = closestVertices.reduce((sum, v) => {
    v.weight = v.angle > 0 ? 1 / (v.angle * v.angle) : 1000;
    return sum + v.weight;
  }, 0);

  // Normalize weights
  closestVertices.forEach((v) => (v.weight /= totalWeight));

  // Interpolate height based on weighted average
  const baseRadius = 6.0;
  let interpolatedHeight = 0;

  for (const { vertex, weight } of closestVertices) {
    interpolatedHeight += (vertex.height || 0) * weight;
  }

  const terrainHeight = baseRadius + interpolatedHeight * 0.8;
  return terrainHeight + 0.05; // Small offset above surface
}

/**
 * Calculate the projected path along the deformed terrain surface
 */
function calculateProjectedPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  terrainVertices: TerrainVertex[] = [],
  segments = 20,
): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];

  // Calculate the arc path on the sphere surface first
  const startNorm = start.clone().normalize();
  const endNorm = end.clone().normalize();

  // Get the angle between the two points
  const angle = startNorm.angleTo(endNorm);

  // If points are too close, just return direct line
  if (angle < 0.01) {
    return [start, end];
  }

  // Calculate the rotation axis (perpendicular to both vectors)
  const axis = new THREE.Vector3().crossVectors(startNorm, endNorm).normalize();

  // If vectors are parallel (axis is zero), use an arbitrary perpendicular axis
  if (axis.length() < 0.001) {
    const arbitrary =
      Math.abs(startNorm.x) < 0.9
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);
    axis.crossVectors(startNorm, arbitrary).normalize();
  }

  // Create quaternion for rotation
  const quaternion = new THREE.Quaternion();

  // Generate points along the arc, adjusting for terrain
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const currentAngle = angle * t;

    // Rotate start vector by current angle around axis
    quaternion.setFromAxisAngle(axis, currentAngle);
    const point = startNorm.clone().applyQuaternion(quaternion);

    // Sample terrain height at this position
    const terrainHeight = sampleTerrainHeight(
      point.clone().multiplyScalar(6.0),
      terrainVertices,
    );

    // Apply terrain height to the point
    path.push(point.multiplyScalar(terrainHeight));
  }

  return path;
}

interface DeerDebugData {
  id: string;
  position: THREE.Vector3;
  target: THREE.Vector3 | null;
  state: "idle" | "moving" | "eating" | "blocked";
  lastDecision: string;
  pathHistory: THREE.Vector3[];
  projectedPath: THREE.Vector3[];
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
    showProjectedPath,
    showDecisions,
    showCollisionChecks,
    pathColor,
    targetColor,
  } = usePathfindingDebugStore();

  const { objects, terrainVertices } = useWorldStore();
  const [deerDebugData, setDeerDebugData] = useState<
    Map<string, DeerDebugData>
  >(new Map());
  const debugDataRef = useRef<Map<string, DeerDebugData>>(new Map());

  // Track deer positions and states
  useFrame(() => {
    if (!showPathfinding) return;

    const newDebugData = new Map<string, DeerDebugData>();

    // Find all deer objects
    const deerObjects = objects.filter((obj) => obj.type === "animals/deer");

    deerObjects.forEach((deer) => {
      const existingData = debugDataRef.current.get(deer.id);
      const currentPosition = new THREE.Vector3(...deer.position);

      // Initialize or update deer debug data
      const debugData: DeerDebugData = existingData
        ? {
            ...existingData,
            position: currentPosition, // Always update position from actual deer object
          }
        : {
            id: deer.id,
            position: currentPosition,
            target: null,
            state: "idle",
            lastDecision: "Spawned",
            pathHistory: [],
            projectedPath: [],
            collisionPoints: [],
          };

      // Track path history (limit to last 30 points)
      if (
        !existingData ||
        currentPosition.distanceTo(existingData.position) > 0.1
      ) {
        debugData.pathHistory = [
          ...debugData.pathHistory,
          currentPosition,
        ].slice(-30);
      }

      // Calculate projected path from current position if there's a target
      if (debugData.target) {
        debugData.projectedPath = calculateProjectedPath(
          currentPosition, // Always use current position from deer object
          debugData.target,
          terrainVertices,
        );
      } else {
        debugData.projectedPath = [];
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
    const updateDeerDebug = (deerId: string, data: Partial<DeerDebugData>) => {
      const existing = debugDataRef.current.get(deerId);
      if (existing) {
        // Update the data
        Object.assign(existing, data);

        // If position or target changed, recalculate projected path
        if (data.position ?? data.target !== undefined) {
          const currentPos = data.position ?? existing.position;

          if (existing.target) {
            existing.projectedPath = calculateProjectedPath(
              currentPos,
              existing.target,
              terrainVertices,
            );
          } else {
            existing.projectedPath = [];
          }
        }

        // Trigger state update to re-render
        setDeerDebugData(new Map(debugDataRef.current));
      }
    };

    // Expose globally for DeerPhysics to use
    (
      window as Window & { updateDeerDebug?: typeof updateDeerDebug }
    ).updateDeerDebug = updateDeerDebug;

    return () => {
      delete (window as Window & { updateDeerDebug?: typeof updateDeerDebug })
        .updateDeerDebug;
    };
  }, [showPathfinding, terrainVertices]);

  if (!showPathfinding) return null;

  return (
    <group name="deer-pathfinding-debug">
      {Array.from(deerDebugData.values()).map((deer) => (
        <group key={deer.id}>
          {/* Target visualization */}
          {showTargets && deer.target && (
            <>
              {/* Target sphere */}
              <mesh position={deer.target}>
                <sphereGeometry args={[0.15, 12, 12]} />
                <meshBasicMaterial
                  color={targetColor}
                  transparent
                  opacity={0.8}
                />
              </mesh>

              {/* Projected path curve */}
              {showProjectedPath && deer.projectedPath.length > 1 && (
                <line>
                  <bufferGeometry>
                    <bufferAttribute
                      attach="attributes-position"
                      args={[
                        new Float32Array(
                          deer.projectedPath.flatMap((p) => [p.x, p.y, p.z]),
                        ),
                        3,
                      ]}
                    />
                  </bufferGeometry>
                  <lineBasicMaterial
                    color={targetColor}
                    transparent
                    opacity={0.8}
                    linewidth={2}
                  />
                </line>
              )}

              {/* Path dots for better visibility with elevation coloring */}
              {deer.projectedPath.slice(1, -1).map((point, idx) => {
                // Color based on elevation change
                const elevation = point.length() - 6.0;
                const elevationColor =
                  elevation > 0.1
                    ? "#ff6666" // Red for uphill
                    : elevation < -0.1
                      ? "#6666ff" // Blue for downhill
                      : targetColor; // Default color for flat

                return (
                  <mesh key={idx} position={point}>
                    <sphereGeometry args={[0.02, 6, 6]} />
                    <meshBasicMaterial
                      color={elevationColor}
                      transparent
                      opacity={0.7}
                    />
                  </mesh>
                );
              })}
            </>
          )}

          {/* Path history visualization with gradient */}
          {showPaths && deer.pathHistory.length > 1 && (
            <>
              {/* Main path line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array(
                        deer.pathHistory.flatMap((p) => [p.x, p.y, p.z]),
                      ),
                      3,
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={pathColor}
                  transparent
                  opacity={0.4}
                  linewidth={1}
                />
              </line>

              {/* Path history dots with fading effect */}
              {deer.pathHistory.map((point, idx) => {
                const opacity = (idx / deer.pathHistory.length) * 0.6;
                const size = 0.01 + (idx / deer.pathHistory.length) * 0.02;
                return (
                  <mesh key={idx} position={point}>
                    <sphereGeometry args={[size, 4, 4]} />
                    <meshBasicMaterial
                      color={pathColor}
                      transparent
                      opacity={opacity}
                    />
                  </mesh>
                );
              })}
            </>
          )}

          {/* Collision check points */}
          {showCollisionChecks &&
            deer.collisionPoints.map((point, idx) => (
              <mesh key={idx} position={point}>
                <boxGeometry args={[0.05, 0.05, 0.05]} />
                <meshBasicMaterial color="#ff00ff" transparent opacity={0.5} />
              </mesh>
            ))}

          {/* Decision text */}
          {showDecisions && (
            <Text
              position={[
                deer.position.x,
                deer.position.y + 0.5,
                deer.position.z,
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
    showProjectedPath,
    showDecisions,
    showCollisionChecks,
    pathColor,
    targetColor,
    togglePathfinding,
    setShowTargets,
    setShowPaths,
    setShowProjectedPath,
    setShowDecisions,
    setShowCollisionChecks,
    setPathColor,
    setTargetColor,
  } = usePathfindingDebugStore();

  // Add keyboard shortcut (Ctrl/Cmd + Shift + P)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        togglePathfinding();
        console.log("🦌 Toggled deer pathfinding debug");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [togglePathfinding]);

  return (
    <>
      {/* Control panel */}
      {showPathfinding && (
        <div className="fixed bottom-4 right-4 z-50 w-64 space-y-3 rounded-lg bg-black/80 p-4 text-white">
          <div className="mb-2 flex items-center justify-between">
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
                className="h-4 w-4"
              />
              <span className="text-xs">Show Targets</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showProjectedPath}
                onChange={(e) => setShowProjectedPath(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-xs">Show Projected Path</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPaths}
                onChange={(e) => setShowPaths(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-xs">Show Path History</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDecisions}
                onChange={(e) => setShowDecisions(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-xs">Show Decisions</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCollisionChecks}
                onChange={(e) => setShowCollisionChecks(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-xs">Show Collision Checks</span>
            </label>
          </div>

          <div className="space-y-2 border-t border-gray-700 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs">Target Color:</label>
              <input
                type="color"
                value={targetColor}
                onChange={(e) => setTargetColor(e.target.value)}
                className="h-6 w-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs">Path Color:</label>
              <input
                type="color"
                value={pathColor}
                onChange={(e) => setPathColor(e.target.value)}
                className="h-6 w-8"
              />
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2 text-xs text-gray-400">
            <p>🎯 Red spheres: Movement targets</p>
            <p>🛤️ Path dots: 🔴 Uphill • 🔵 Downhill • Normal flat</p>
            <p>📍 Yellow trail: Path history (fading)</p>
            <p>💭 Text: Current state & distance</p>
            <p className="mt-1">⌨️ Toggle: Ctrl+Shift+D</p>
          </div>
        </div>
      )}

      {/* Floating indicator when hidden */}
      {!showPathfinding && (
        <div
          className="fixed bottom-4 right-4 z-50 cursor-pointer rounded-lg bg-black/60 px-3 py-2 text-xs text-white transition-colors hover:bg-black/80"
          onClick={togglePathfinding}
          title="Show pathfinding debug (Ctrl+Shift+D)"
        >
          🦌 Pathfinding Debug
        </div>
      )}
    </>
  );
}

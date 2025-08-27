"use client";

import { useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";

interface WaterTerraformToolProps {
  isActive: boolean;
  brushSize?: number;
  flowRate?: number;
  mode?: "add" | "remove" | "level";
}

/**
 * Water terraforming tool for interactive water placement and physics
 * Allows users to add, remove, or level water on the terrain
 */
export function WaterTerraformTool({
  isActive,
  brushSize = 0.5,
  flowRate = 0.1,
  mode = "add",
}: WaterTerraformToolProps) {
  const { camera, raycaster, scene } = useThree();
  const mousePositionRef = useRef(new THREE.Vector2());
  const isMouseDownRef = useRef(false);
  const lastApplicationTimeRef = useRef(0);

  const { terrainVertices, updateTerrainVertex } = useWorldStore();

  // Application throttle (60fps max)
  const APPLICATION_INTERVAL = 16; // ms

  // Find terrain vertices within brush radius
  const findVerticesInBrush = useCallback(
    (intersectionPoint: THREE.Vector3, radius: number) => {
      const affectedVertices: Array<{
        index: number;
        distance: number;
        vertex: (typeof terrainVertices)[0];
      }> = [];

      for (let i = 0; i < terrainVertices.length; i++) {
        const vertex = terrainVertices[i];
        if (!vertex) continue;

        const vertexPos = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
        const distance = vertexPos.distanceTo(intersectionPoint);

        if (distance <= radius) {
          affectedVertices.push({
            index: i,
            distance,
            vertex,
          });
        }
      }

      return affectedVertices;
    },
    [terrainVertices],
  );

  // Apply water terraforming effects
  const applyWaterEffect = useCallback(
    (intersectionPoint: THREE.Vector3) => {
      const currentTime = Date.now();
      if (currentTime - lastApplicationTimeRef.current < APPLICATION_INTERVAL) {
        return;
      }
      lastApplicationTimeRef.current = currentTime;

      const affectedVertices = findVerticesInBrush(
        intersectionPoint,
        brushSize,
      );

      affectedVertices.forEach(({ index, distance, vertex }) => {
        // Calculate falloff based on distance from brush center
        const falloff = Math.max(0, 1 - distance / brushSize);
        const effectStrength = falloff * flowRate;

        let newWaterLevel = vertex.waterLevel;

        switch (mode) {
          case "add":
            // Add water with physics consideration
            newWaterLevel += effectStrength;

            // Water flows to lower areas - check surrounding terrain
            const surroundingVertices = findVerticesInBrush(
              new THREE.Vector3(vertex.x, vertex.y, vertex.z),
              0.2,
            );

            let averageHeight = vertex.height;
            if (surroundingVertices.length > 1) {
              const totalHeight = surroundingVertices.reduce(
                (sum, sv) => sum + sv.vertex.height,
                0,
              );
              averageHeight = totalHeight / surroundingVertices.length;
            }

            // Water seeks lower elevation - boost effect in depressions
            if (vertex.height < averageHeight) {
              newWaterLevel += effectStrength * 0.5; // Extra water in low areas
            }
            break;

          case "remove":
            // Remove water with evaporation effect
            newWaterLevel = Math.max(0, newWaterLevel - effectStrength);
            break;

          case "level":
            // Level water to average of surrounding areas
            const nearbyVertices = findVerticesInBrush(
              new THREE.Vector3(vertex.x, vertex.y, vertex.z),
              brushSize * 1.5,
            );

            if (nearbyVertices.length > 1) {
              const averageWater =
                nearbyVertices.reduce(
                  (sum, nv) => sum + nv.vertex.waterLevel,
                  0,
                ) / nearbyVertices.length;
              newWaterLevel = THREE.MathUtils.lerp(
                vertex.waterLevel,
                averageWater,
                effectStrength,
              );
            }
            break;
        }

        // Clamp water level to reasonable bounds
        newWaterLevel = Math.max(0, Math.min(newWaterLevel, 5.0));

        // Only update if there's a meaningful change
        if (Math.abs(newWaterLevel - vertex.waterLevel) > 0.01) {
          updateTerrainVertex(index, {
            waterLevel: newWaterLevel,
          });

          console.log(
            `💧 Water terraforming: Vertex ${index} water level ${vertex.waterLevel.toFixed(2)} → ${newWaterLevel.toFixed(2)}`,
          );
        }
      });
    },
    [brushSize, flowRate, mode, findVerticesInBrush, updateTerrainVertex],
  );

  // Handle mouse/touch interaction
  const handlePointerInteraction = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isActive) return;

      let clientX: number, clientY: number;

      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        if (event.touches.length === 0) return;
        const touch = event.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      // Convert screen coordinates to normalized device coordinates
      const rect = (event.target as Element | null)?.getBoundingClientRect();
      if (!rect) return;

      mousePositionRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mousePositionRef.current.y =
        -((clientY - rect.top) / rect.height) * 2 + 1;

      // Perform raycasting to find terrain intersection
      raycaster.setFromCamera(mousePositionRef.current, camera);

      // Find terrain mesh in scene
      const terrainMesh = scene.children.find(
        (child) =>
          child instanceof THREE.Mesh && child.userData?.isTerrainMesh === true,
      ) as THREE.Mesh;

      if (terrainMesh) {
        const intersections = raycaster.intersectObject(terrainMesh);

        if (intersections.length > 0) {
          const intersectionPoint = intersections[0]?.point;
          if (intersectionPoint) {
            applyWaterEffect(intersectionPoint);
          }
        }
      }
    },
    [isActive, camera, raycaster, scene, applyWaterEffect],
  );

  // Set up event listeners
  useFrame(() => {
    if (!isActive) return;

    // Handle continuous application while mouse/touch is held down
    if (isMouseDownRef.current) {
      // Re-apply effect at current mouse position
      const syntheticEvent = new MouseEvent("mousemove", {
        clientX: mousePositionRef.current.x,
        clientY: mousePositionRef.current.y,
      });
      handlePointerInteraction(syntheticEvent);
    }
  });

  // Event handlers
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!isActive) return;
      isMouseDownRef.current = true;
      handlePointerInteraction(event);
    },
    [isActive, handlePointerInteraction],
  );

  const handlePointerUp = useCallback(() => {
    isMouseDownRef.current = false;
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isActive || !isMouseDownRef.current) return;
      handlePointerInteraction(event);
    },
    [isActive, handlePointerInteraction],
  );

  // Attach/detach event listeners based on tool state
  useFrame(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    if (isActive) {
      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("pointerup", handlePointerUp);
      canvas.addEventListener("pointermove", handlePointerMove);

      // Change cursor to indicate water tool
      canvas.style.cursor =
        mode === "add" ? "crosshair" : mode === "remove" ? "grab" : "move";
    } else {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.style.cursor = "default";
    }

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointermove", handlePointerMove);
    };
  });

  // Visual brush indicator
  if (!isActive) return null;

  return (
    <group>
      {/* Brush size indicator - shows up at intersection point */}
      <mesh>
        <ringGeometry args={[brushSize * 0.9, brushSize, 32]} />
        <meshBasicMaterial
          color={
            mode === "add" ? 0x0099ff : mode === "remove" ? 0xff6600 : 0x00ff00
          }
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

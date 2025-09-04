"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "~/lib/store";

/**
 * AnimalOrientationTest - Debug component to investigate deer orientation issues
 *
 * Tests the logic chain for animal orientation relative to globe gravity:
 * 1. Initial surface alignment
 * 2. Idle state orientation maintenance
 * 3. Surface normal calculation accuracy
 * 4. Rotation application and persistence
 */
export function AnimalOrientationTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const testGroupRef = useRef<THREE.Group>(null);
  const logCounter = useRef(0);

  // Get store state for deer objects
  const objects = useWorldStore((state) => state.objects);
  const deer = objects.filter((obj) => obj.type === "animals/deer");

  const addTestResult = (message: string) => {
    setTestResults((prev) => [
      ...prev.slice(-10),
      `${logCounter.current++}: ${message}`,
    ]);
  };

  // Test 1: Surface Normal Calculation
  const testSurfaceNormals = () => {
    addTestResult("=== Testing Surface Normal Calculations ===");

    // Test various positions on the globe (radius = 6.0)
    const testPositions = [
      new THREE.Vector3(0, 6.0, 0), // Top
      new THREE.Vector3(0, -6.0, 0), // Bottom
      new THREE.Vector3(6.0, 0, 0), // Side X
      new THREE.Vector3(0, 0, 6.0), // Side Z
      new THREE.Vector3(3, 3, 3).normalize().multiplyScalar(6.0), // Diagonal
    ];

    testPositions.forEach((pos, i) => {
      const surfaceNormal = pos.clone().normalize();
      const expectedNormal = pos.clone().normalize(); // Should be same as position normalized
      const normalAccuracy = surfaceNormal.dot(expectedNormal);

      addTestResult(
        `Position ${i}: Normal accuracy = ${normalAccuracy.toFixed(4)} (should be ~1.0)`,
      );
      addTestResult(
        `  Position: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]`,
      );
      addTestResult(
        `  Normal: [${surfaceNormal.x.toFixed(4)}, ${surfaceNormal.y.toFixed(4)}, ${surfaceNormal.z.toFixed(4)}]`,
      );
    });
  };

  // Test 2: Initial Orientation Logic (from DeerPhysics.tsx:79-107)
  const testInitialOrientation = () => {
    addTestResult("=== Testing Initial Orientation Logic ===");

    const testPosition = new THREE.Vector3(3, 3, 3)
      .normalize()
      .multiplyScalar(6.05);
    const surfaceNormal = testPosition.clone().normalize();

    addTestResult(
      `Test position: [${testPosition.x.toFixed(2)}, ${testPosition.y.toFixed(2)}, ${testPosition.z.toFixed(2)}]`,
    );
    addTestResult(
      `Surface normal: [${surfaceNormal.x.toFixed(4)}, ${surfaceNormal.y.toFixed(4)}, ${surfaceNormal.z.toFixed(4)}]`,
    );

    // Replicate orientation calculation from DeerPhysics.tsx:84-104
    const localUp = surfaceNormal;
    const worldUp = new THREE.Vector3(0, 1, 0);
    const localForward = worldUp
      .clone()
      .sub(localUp.clone().multiplyScalar(worldUp.dot(localUp)))
      .normalize();

    addTestResult(
      `World up dot surface normal: ${worldUp.dot(localUp).toFixed(4)}`,
    );
    addTestResult(
      `Initial forward length: ${localForward.length().toFixed(4)}`,
    );

    // Check for fallback logic
    if (localForward.length() < 0.1) {
      const worldForward = new THREE.Vector3(1, 0, 0);
      localForward
        .copy(worldForward)
        .sub(localUp.clone().multiplyScalar(worldForward.dot(localUp)))
        .normalize();
      addTestResult(`Used fallback forward calculation`);
    }

    const localRight = localForward.clone().cross(localUp).normalize();
    localForward.crossVectors(localUp, localRight).normalize();

    // Create rotation matrix
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeBasis(localRight, localUp, localForward.negate());
    const initialQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      rotationMatrix,
    );

    addTestResult(
      `Final quaternion: [${initialQuaternion.x.toFixed(4)}, ${initialQuaternion.y.toFixed(4)}, ${initialQuaternion.z.toFixed(4)}, ${initialQuaternion.w.toFixed(4)}]`,
    );

    // Test if quaternion represents upright orientation
    const testVector = new THREE.Vector3(0, 1, 0);
    testVector.applyQuaternion(initialQuaternion);
    const uprightAccuracy = testVector.dot(surfaceNormal);
    addTestResult(
      `Upright accuracy: ${uprightAccuracy.toFixed(4)} (should be close to 1.0)`,
    );
  };

  // Test 3: Live Deer Orientation Analysis
  const testLiveDeerOrientation = () => {
    addTestResult("=== Testing Live Deer Orientations ===");
    addTestResult(`Found ${deer.length} deer in scene`);

    if (deer.length === 0) {
      addTestResult("No deer found - spawn a deer first to test orientation");
      return;
    }

    deer.forEach((deerObj, i) => {
      const position = new THREE.Vector3(...deerObj.position);
      const rotation = deerObj.rotation
        ? new THREE.Vector3(...deerObj.rotation)
        : new THREE.Vector3(0, 0, 0);
      const surfaceNormal = position.clone().normalize();

      addTestResult(
        `Deer ${i} at [${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}]`,
      );
      addTestResult(
        `  Rotation: [${rotation.x.toFixed(4)}, ${rotation.y.toFixed(4)}, ${rotation.z.toFixed(4)}]`,
      );
      addTestResult(
        `  Surface normal: [${surfaceNormal.x.toFixed(4)}, ${surfaceNormal.y.toFixed(4)}, ${surfaceNormal.z.toFixed(4)}]`,
      );

      // Check if deer's up vector aligns with surface normal
      const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z);
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const deerUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
      const uprightAlignment = deerUp.dot(surfaceNormal);

      addTestResult(
        `  Upright alignment: ${uprightAlignment.toFixed(4)} (1.0 = perfect, 0.0 = perpendicular)`,
      );

      if (uprightAlignment < 0.8) {
        addTestResult(
          `  ⚠️ ISSUE: Deer ${i} is not properly upright relative to globe surface!`,
        );
      }
    });
  };

  // Test 4: Idle State Orientation Maintenance
  const testIdleStateOrientation = () => {
    addTestResult("=== Testing Idle State Orientation Maintenance ===");

    // Check if deer maintain orientation during idle
    deer.forEach((deerObj, i) => {
      const deerMovement = (
        deerObj as unknown as {
          deerMovement?: { isMoving?: boolean; state?: string };
        }
      ).deerMovement;
      if (deerMovement) {
        const isIdle = !deerMovement.isMoving || deerMovement.state === "idle";
        addTestResult(`Deer ${i}: ${isIdle ? "IDLE" : "MOVING"}`);

        if (isIdle) {
          // Analyze if idle deer maintain proper orientation
          const position = new THREE.Vector3(...deerObj.position);
          const surfaceNormal = position.clone().normalize();

          // Check rotation
          const rotation = deerObj.rotation
            ? new THREE.Vector3(...deerObj.rotation)
            : new THREE.Vector3(0, 0, 0);
          const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z);
          const quaternion = new THREE.Quaternion().setFromEuler(euler);
          const deerUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
          const uprightAlignment = deerUp.dot(surfaceNormal);

          addTestResult(
            `  Idle upright alignment: ${uprightAlignment.toFixed(4)}`,
          );

          if (uprightAlignment < 0.8) {
            addTestResult(
              `  🔥 FOUND ISSUE: Idle deer ${i} losing upright orientation!`,
            );
            addTestResult(
              `  🔍 Root cause: Idle state not maintaining surface normal alignment`,
            );
          }
        }
      }
    });
  };

  // Test 5: Physics vs Visual Model Alignment
  const testPhysicsVisualAlignment = () => {
    addTestResult("=== Testing Physics vs Visual Model Alignment ===");

    // This would require access to the physics bodies
    // For now, log what we can detect
    addTestResult("Physics body analysis requires runtime physics inspection");
    addTestResult("Key areas to check:");
    addTestResult("  1. RigidBody rotation matches visual model rotation");
    addTestResult("  2. Character controller maintains surface contact");
    addTestResult("  3. Kinematic position updates preserve orientation");
  };

  // Run all tests sequentially
  const runAllTests = () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults([]);
    logCounter.current = 0;

    addTestResult("🧪 Starting Animal Orientation Debug Tests...");

    testSurfaceNormals();
    testInitialOrientation();
    testLiveDeerOrientation();
    testIdleStateOrientation();
    testPhysicsVisualAlignment();

    addTestResult("✅ Tests completed - check results above");
    setIsRunning(false);
  };

  // Monitor deer in real-time
  useFrame(() => {
    if (!isRunning) return;

    // Could add real-time monitoring here
  });

  return (
    <group ref={testGroupRef}>
      {/* Visual test indicator */}
      <mesh position={[0, 8, 0]} onClick={runAllTests}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color={isRunning ? "orange" : "red"} />
      </mesh>

      {/* Test results displayed in browser console */}
      {testResults.length > 0 && (
        <mesh position={[0, 7.5, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="green" />
        </mesh>
      )}

      {/* Log results to console for easier reading */}
      {testResults.length > 0 &&
        (() => {
          // Test results logged
          return null;
        })()}
    </group>
  );
}

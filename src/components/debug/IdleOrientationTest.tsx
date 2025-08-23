"use client";

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';

/**
 * IdleOrientationTest - Focused test for deer idle state orientation issues
 * 
 * Specifically investigates why deer don't maintain upright orientation during idle:
 * 1. Monitors deer transition from moving to idle
 * 2. Tracks orientation changes during idle state
 * 3. Tests bounce animation effects on orientation
 * 4. Identifies where upright orientation is lost
 */
export function IdleOrientationTest() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringResults, setMonitoringResults] = useState<string[]>([]);
  const [trackedDeer, setTrackedDeer] = useState<string | null>(null);
  const monitoringRef = useRef<NodeJS.Timeout | null>(null);
  const frameCounter = useRef(0);

  // Get store state
  const objects = useWorldStore((state) => state.objects);
  const deer = objects.filter(obj => obj.type === "animals/deer");

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMonitoringResults(prev => [...prev.slice(-20), `[${timestamp}] ${message}`]);
    console.log(`🦌 ${message}`);
  };

  // Start monitoring a specific deer
  const startMonitoring = (deerObjectId?: string) => {
    if (deer.length === 0) {
      addResult("❌ No deer found - spawn a deer first");
      return;
    }

    const targetDeer = deerObjectId ?? deer[0]?.id;
    if (!targetDeer) {
      addResult("❌ Unable to find a valid deer ID");
      return;
    }
    setTrackedDeer(targetDeer);
    setIsMonitoring(true);
    setMonitoringResults([]);
    frameCounter.current = 0;

    addResult(`🎯 Started monitoring deer ${targetDeer}`);
    addResult("Waiting for idle state transition...");
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    setTrackedDeer(null);
    if (monitoringRef.current) {
      clearTimeout(monitoringRef.current);
    }
    addResult("⏹️ Monitoring stopped");
  };

  // Monitor deer orientation during each frame
  useFrame((_state, _delta) => {
    if (!isMonitoring || !trackedDeer) return;

    frameCounter.current++;
    
    // Only check every 30 frames to avoid spam
    if (frameCounter.current % 30 !== 0) return;

    const targetDeerObj = objects.find(obj => obj.id === trackedDeer);
    if (!targetDeerObj) {
      addResult(`❌ Tracked deer ${trackedDeer} not found`);
      stopMonitoring();
      return;
    }

    // Get deer position and rotation
    const position = new THREE.Vector3(...targetDeerObj.position);
    const rotation = targetDeerObj.rotation ? new THREE.Vector3(...targetDeerObj.rotation) : new THREE.Vector3(0, 0, 0);
    
    // Calculate expected surface normal (should be upright direction)
    const surfaceNormal = position.clone().normalize();
    
    // Calculate deer's actual up vector
    const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    const deerUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
    
    // Calculate alignment with surface normal
    const uprightAlignment = deerUp.dot(surfaceNormal);
    
    // Check deer movement state (if available from physics data)
    const deerMovement = (targetDeerObj as unknown as { deerMovement?: { isMoving?: boolean; state?: string } }).deerMovement;
    const isIdle = deerMovement ? (deerMovement.state === 'idle' || !deerMovement.isMoving) : 'unknown';
    
    // Log significant orientation issues
    if (uprightAlignment < 0.8) {
      addResult(`🔥 ORIENTATION ISSUE DETECTED!`);
      addResult(`   Upright alignment: ${uprightAlignment.toFixed(4)} (should be >0.8)`);
      addResult(`   Position: [${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}]`);
      addResult(`   Rotation: [${(rotation.x * 180/Math.PI).toFixed(1)}°, ${(rotation.y * 180/Math.PI).toFixed(1)}°, ${(rotation.z * 180/Math.PI).toFixed(1)}°]`);
      addResult(`   Movement state: ${isIdle}`);
      addResult(`   Surface normal: [${surfaceNormal.x.toFixed(3)}, ${surfaceNormal.y.toFixed(3)}, ${surfaceNormal.z.toFixed(3)}]`);
      addResult(`   Deer up vector: [${deerUp.x.toFixed(3)}, ${deerUp.y.toFixed(3)}, ${deerUp.z.toFixed(3)}]`);
      
      // Analyze the specific rotation issue
      const rotationMagnitude = Math.sqrt(rotation.x * rotation.x + rotation.y * rotation.y + rotation.z * rotation.z);
      if (rotationMagnitude > 0.1) {
        addResult(`   🔍 Non-zero rotation detected (magnitude: ${rotationMagnitude.toFixed(4)})`);
        
        // Check which axis has the problematic rotation
        if (Math.abs(rotation.x) > 0.05) addResult(`   ⚠️ X-axis rotation: ${(rotation.x * 180/Math.PI).toFixed(1)}° (tilting forward/backward)`);
        if (Math.abs(rotation.y) > 0.05) addResult(`   ⚠️ Y-axis rotation: ${(rotation.y * 180/Math.PI).toFixed(1)}° (turning left/right)`);
        if (Math.abs(rotation.z) > 0.05) addResult(`   ⚠️ Z-axis rotation: ${(rotation.z * 180/Math.PI).toFixed(1)}° (rolling left/right)`);
      }
    }
  });

  // Test the idle state bounce animation logic
  const testIdleBounceLogic = () => {
    addResult("=== Testing Idle State Bounce Animation Logic ===");
    
    // Simulate the bounce calculation from DeerPhysics.tsx:183-196
    const mockLastMovementSpeed = 1.5; // Previous movement speed
    const mockDelta = 0.016; // ~60 FPS
    
    let bouncePhase = 0;
    let lastMovementSpeed = mockLastMovementSpeed;
    
    addResult(`Initial conditions:`);
    addResult(`  Movement speed: ${lastMovementSpeed}`);
    addResult(`  Delta: ${mockDelta}`);
    
    // Simulate bounce decay (from DeerPhysics.tsx:180-181)
    const bounceDecayRate = 5.0;
    lastMovementSpeed = Math.max(0, lastMovementSpeed - bounceDecayRate * mockDelta);
    addResult(`  After decay: ${lastMovementSpeed.toFixed(4)}`);
    
    // Simulate bounce phase update (from DeerPhysics.tsx:184)
    bouncePhase += lastMovementSpeed * 8.0 * mockDelta;
    addResult(`  Bounce phase: ${bouncePhase.toFixed(4)}`);
    
    // Simulate bounce height calculation (from DeerPhysics.tsx:187-188)
    const maxBounceHeight = 0.08;
    const bounceHeight = Math.sin(bouncePhase) * maxBounceHeight * Math.min(lastMovementSpeed / 1.5, 1.0);
    addResult(`  Bounce height: ${bounceHeight.toFixed(6)}`);
    
    // Check if bounce affects position (from DeerPhysics.tsx:191-195)
    if (Math.abs(bounceHeight) > 0.01) {
      addResult(`  ❗ Bounce is active (${bounceHeight.toFixed(6)} > 0.01) - position will be modified`);
      
      // This is where the issue might be!
      // The code does: adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance);
      // But this might not preserve the deer's orientation!
      addResult(`  🔍 POTENTIAL ISSUE: Position modification during idle may not preserve orientation`);
      addResult(`  🔧 Check if setTranslation() in DeerPhysics.tsx:194 affects rotation`);
    } else {
      addResult(`  ✅ Bounce inactive (${bounceHeight.toFixed(6)} <= 0.01) - no position changes`);
    }
  };

  // Inspect the specific issue in DeerPhysics bounce animation
  const analyzeIdleStateIssue = () => {
    addResult("=== Analyzing Idle State Issue from DeerPhysics.tsx ===");
    
    // The issue appears to be in DeerPhysics.tsx lines 191-195:
    addResult("Issue Analysis:");
    addResult("1. During idle, deer still have bounce animation (lines 183-196)");
    addResult("2. When bounce height > 0.01, position is recalculated (line 191)");
    addResult("3. Code: adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance)");
    addResult("4. This normalizes position but doesn't account for rotation!");
    addResult("");
    addResult("🔥 ROOT CAUSE HYPOTHESIS:");
    addResult("The bounce animation during idle modifies position using setTranslation()");
    addResult("but doesn't maintain the deer's upright orientation relative to surface normal");
    addResult("");
    addResult("🔧 SUGGESTED FIX:");
    addResult("1. Either disable bounce during true idle state");
    addResult("2. Or ensure setTranslation() preserves rotation alignment");
    addResult("3. Or add orientation correction after position updates");
  };

  return (
    <group>
      {/* Control indicator */}
      <mesh position={[0, 9, 0]} onClick={() => isMonitoring ? stopMonitoring() : startMonitoring()}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshBasicMaterial color={isMonitoring ? "orange" : "blue"} />
      </mesh>
      
      {/* Test buttons */}
      <mesh position={[1, 9, 0]} onClick={testIdleBounceLogic}>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
      
      <mesh position={[2, 9, 0]} onClick={analyzeIdleStateIssue}>
        <cylinderGeometry args={[0.15, 0.15, 0.3]} />
        <meshBasicMaterial color="purple" />
      </mesh>
      
      {/* Debug info display */}
      {trackedDeer && (
        <mesh position={[0, 8.5, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="green" />
        </mesh>
      )}
      
      {/* Console output */}
      {monitoringResults.length > 0 && (() => {
        // Only log latest results to avoid spam
        const latestResults = monitoringResults.slice(-5);
        console.group("🦌 Idle Orientation Monitoring");
        latestResults.forEach(result => console.log(result));
        console.groupEnd();
        return null;
      })()}
    </group>
  );
}
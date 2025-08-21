"use client";

import { useState, useEffect } from 'react';

/**
 * PhysicsDebug - Simple physics debug component
 * Since @react-three/rapier Debug export may have issues, we'll create a simple alternative
 */
export function PhysicsDebug() {
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    // Global debug toggle for testing
    (window as any).togglePhysicsDebug = () => {
      setShowDebug(prev => !prev);
      console.log(`🔧 Physics debug: ${!showDebug ? 'enabled' : 'disabled'}`);
    };
    
    return () => {
      delete (window as any).togglePhysicsDebug;
    };
  }, [showDebug]);
  
  if (!showDebug) return null;
  
  // Simple wireframe indicators for physics bodies
  return (
    <group>
      {/* Debug visualization could be added here */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[6.5, 32, 32]} />
        <meshBasicMaterial wireframe color="lime" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
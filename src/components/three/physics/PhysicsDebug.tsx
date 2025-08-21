"use client";

import { useState, useEffect } from 'react';
import { useRapier } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';

interface DebugWindow {
  togglePhysicsDebug?: () => void;
}

interface PhysicsBodyUserData {
  isDeer?: boolean;
  isGlobe?: boolean;
  objectId?: string;
}

interface PhysicsBodyPosition {
  x: number;
  y: number;
  z: number;
}

interface RapierRigidBody {
  translation(): PhysicsBodyPosition;
  userData: PhysicsBodyUserData;
  linvel(): PhysicsBodyPosition; // Add velocity method
}

/**
 * PhysicsDebug - Rapier collision debug visualization
 * Shows collision shapes and physics bodies for debugging
 */
export function PhysicsDebug() {
  const [showDebug, setShowDebug] = useState(false);
  const [bodies, setBodies] = useState<RapierRigidBody[]>([]);
  const { world } = useRapier();
  
  useEffect(() => {
    // Global debug toggle for testing
    const debugWindow = window as Window & DebugWindow;
    
    debugWindow.togglePhysicsDebug = () => {
      setShowDebug(prev => {
        const newState = !prev;
        console.log(`🔧 Physics debug: ${newState ? 'enabled' : 'disabled'}`);
        console.log(`🔧 Debug state changed from ${prev} to ${newState}`);
        return newState;
      });
    };
    
    // Add keyboard shortcut (Ctrl+Shift+P)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        debugWindow.togglePhysicsDebug?.();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Auto-show debug instructions
    console.log('🔧 Physics Debug Available:');
    console.log('  - Run togglePhysicsDebug() in console');
    console.log('  - Or press Ctrl+Shift+P');
    
    return () => {
      delete debugWindow.togglePhysicsDebug;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Update physics bodies list for debugging
  useFrame(() => {
    if (!showDebug) return;
    
    const currentBodies: RapierRigidBody[] = [];
    world.forEachRigidBody((body) => {
      currentBodies.push(body as RapierRigidBody);
    });
    setBodies(currentBodies);
  });
  
  // Log when debug state changes
  useEffect(() => {
    if (showDebug) {
      console.log('🔧 Physics debug enabled - rendering debug visuals');
      console.log(`🔧 Current physics bodies count: ${bodies.length}`);
    } else {
      console.log('🔧 Physics debug disabled');
    }
  }, [showDebug, bodies.length]);
  
  if (!showDebug) return null;
  
  // Custom physics debug visualization
  console.log('🔧 Rendering PhysicsDebug component with', bodies.length, 'bodies');
  
  return (
    <group>
      {/* Globe collision surface visualization - more visible */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[6.0, 16, 16]} />
        <meshBasicMaterial wireframe color="lime" transparent opacity={0.8} />
      </mesh>
      
      {/* Deer placement zone visualization - more visible */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[6.05, 16, 16]} />
        <meshBasicMaterial wireframe color="cyan" transparent opacity={0.4} />
      </mesh>
      
      {/* Debug info text */}
      <mesh position={[0, 8, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
      
      {/* Debug info for each physics body */}
      {bodies.map((body, index) => {
        const position = body.translation();
        const userData = body.userData;
        
        if (userData?.isDeer) {
          const velocity = body.linvel();
          const velocityMagnitude = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
          
          // Show deer collision capsule and movement debug
          return (
            <group key={`deer-${index}`} position={[position.x, position.y, position.z]}>
              {/* Deer collision capsule visualization - matches actual collider */}
              <mesh position={[0, 0.2, 0]}>
                <capsuleGeometry args={[0.2, 0.4]} />
                <meshBasicMaterial wireframe color="red" transparent opacity={0.5} />
              </mesh>
              {/* Position marker at RigidBody center */}
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial color="yellow" />
              </mesh>
              
              {/* Surface normal indicator (local "up" direction) */}
              <mesh position={[0, 0.5, 0]}>
                <coneGeometry args={[0.05, 0.3]} />
                <meshBasicMaterial color="blue" />
              </mesh>
              
              {/* Velocity vector visualization - shows actual movement direction */}
              {velocityMagnitude > 0.1 && (
                <>
                  {/* Velocity arrow pointing in movement direction */}
                  <mesh 
                    position={[velocity.x * 0.5, velocity.y * 0.5 + 1, velocity.z * 0.5]}
                    lookAt={[
                      position.x + velocity.x, 
                      position.y + velocity.y + 1, 
                      position.z + velocity.z
                    ]}
                  >
                    <coneGeometry args={[0.1, 0.4]} />
                    <meshBasicMaterial color="lime" />
                  </mesh>
                  {/* Velocity magnitude indicator */}
                  <mesh position={[0, 1.2, 0]}>
                    <sphereGeometry args={[Math.min(velocityMagnitude * 0.1, 0.2), 8, 8]} />
                    <meshBasicMaterial color={velocityMagnitude > 1 ? "green" : "yellow"} />
                  </mesh>
                </>
              )}
              
              {/* Static deer when not moving */}
              {velocityMagnitude <= 0.1 && (
                <mesh position={[0, 1, 0]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshBasicMaterial color="red" />
                </mesh>
              )}
            </group>
          );
        }
        
        if (userData?.isGlobe) {
          // Globe physics body marker
          return (
            <mesh key={`globe-${index}`} position={[0, 0, 0]}>
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshBasicMaterial color="green" />
            </mesh>
          );
        }
        
        return null;
      })}
      
      {/* Physics world info */}
      <group position={[8, 8, 0]}>
        <mesh>
          <planeGeometry args={[4, 2]} />
          <meshBasicMaterial color="black" transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}
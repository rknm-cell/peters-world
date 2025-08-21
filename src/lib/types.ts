// Types for window extensions and physics-related data

// Window extensions for debugging and testing
export interface WindowExtensions {
  resetCameraControls?: () => void;
  togglePhysicsDebug?: () => void;
  logPhysicsStatus?: () => void;
  spawnPhysicsDeer?: () => void;
  testDeerSpawn?: () => void;
}

// Extend the global Window interface
declare global {
  interface Window {
    resetCameraControls?: () => void;
    togglePhysicsDebug?: () => void;
    logPhysicsStatus?: () => void;
    spawnPhysicsDeer?: () => void;
    testDeerSpawn?: () => void;
  }
}

// Rapier physics body userData types
export interface PhysicsBodyUserData {
  isDeer?: boolean;
  objectId?: string;
  [key: string]: unknown;
}

// Rapier world types
export interface RapierWorld {
  bodies: {
    len: () => number;
    getAll: () => Iterable<PhysicsBody>;
  };
  colliders: {
    len: () => number;
  };
  gravity: { x: number; y: number; z: number };
  timestep: number;
  forEachRigidBody: (callback: (body: PhysicsBody) => void) => void;
}

// Rapier physics body types
export interface PhysicsBody {
  userData: PhysicsBodyUserData;
  translation: () => { x: number; y: number; z: number };
  linvel: () => { x: number; y: number; z: number };
  mass: () => number;
  bodyType: () => number;
  addForce: (force: { x: number; y: number; z: number }, wake?: boolean) => void;
}

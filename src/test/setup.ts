import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Three.js and React Three Fiber
vi.mock('@react-three/fiber', () => ({
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 20 } },
    gl: { domElement: document.createElement('canvas') },
    scene: { children: [] },
  })),
  useFrame: vi.fn(),
}));

vi.mock('@react-three/rapier', () => ({
  useRapier: vi.fn(() => ({
    rapier: {},
    world: {},
  })),
  RigidBody: ({ children, ...props }: any) => <div data-testid="rigid-body" {...props}>{children}</div>,
  CapsuleCollider: ({ children, ...props }: any) => <div data-testid="capsule-collider" {...props}>{children}</div>,
}));

// Mock Three.js
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
    distanceTo: vi.fn().mockReturnValue(1),
    sub: vi.fn().mockReturnThis(),
    dot: vi.fn().mockReturnValue(0),
  })),
  Quaternion: vi.fn().mockImplementation((x = 0, y = 0, z = 0, w = 1) => ({
    x, y, z, w,
    clone: vi.fn().mockReturnThis(),
    angleTo: vi.fn().mockReturnValue(0),
    setFromAxisAngle: vi.fn().mockReturnThis(),
  })),
  Raycaster: vi.fn().mockImplementation(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn().mockReturnValue([]),
  })),
  Vector2: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  Mesh: vi.fn(),
  Group: vi.fn(),
}));

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Test setup file for Bun
// This file is preloaded by Bun's test runner

// Set up test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Mock performance API
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  } as any;
}

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

console.log('🧪 Test setup loaded successfully');

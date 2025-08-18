// Test setup file for Bun
import { vi } from "bun:test";

// Mock DOM environment
global.document = {
  createElement: (tagName: string) => ({
    tagName: tagName.toUpperCase(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    style: {},
  }),
  querySelector: () => null,
} as any;

global.window = {
  confirm: vi.fn(() => true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

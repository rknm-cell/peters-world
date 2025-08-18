// Test setup file for Bun
import { vi } from "bun:test";

// Mock DOM environment
global.document = {
  createElement: (tagName: string) => ({
    tagName: tagName.toUpperCase(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    addEventListener: vi.fn() as any, // Explicit type assertion
    removeEventListener: vi.fn() as any, // Explicit type assertion
    style: {},
  }),
  querySelector: () => null,
} as unknown as Document;

global.window = {
  confirm: vi.fn(() => true) as any, // Explicit type assertion
  addEventListener: vi.fn() as any, // Explicit type assertion
  removeEventListener: vi.fn() as any, // Explicit type assertion
} as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

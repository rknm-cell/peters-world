import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
    },
  },
});

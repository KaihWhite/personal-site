import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    server: {
      deps: {
        // Force phaser through Vite's transform pipeline so our resolve.alias for
        // phaser3spectorjs (an optional WebGL inspector dep that isn't installed) applies.
        inline: ['phaser'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Phaser's WebGLRenderer imports phaser3spectorjs (WebGL inspector) which isn't
      // installed as a runtime dep. Stub it out so Phaser can import in jsdom tests.
      'phaser3spectorjs': path.resolve(__dirname, 'src/__mocks__/phaser3spectorjs.ts'),
    },
  },
});

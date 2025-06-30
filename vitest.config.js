import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 10000,
    setupFiles: ['./test-setup.js'],
    globals: true,
    include: ['mcp-http-server.test.js'],
    exclude: ['packages/**/*', 'node_modules/**/*']
  },
}); 
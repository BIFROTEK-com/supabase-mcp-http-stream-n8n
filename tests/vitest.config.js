import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup.js'],
    include: ['../mcp-http-server.test.js'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../'),
    },
  },
}); 
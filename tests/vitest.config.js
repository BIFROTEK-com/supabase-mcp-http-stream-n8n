import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, 'test-setup.js')],
    include: [
      path.resolve(__dirname, 'mcp-http-server.test.js'),
      path.resolve(__dirname, '**/*.test.js')
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../'),
    },
  },
}); 
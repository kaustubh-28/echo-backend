import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, './src/config'),
      '@database': path.resolve(__dirname, './src/database'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});

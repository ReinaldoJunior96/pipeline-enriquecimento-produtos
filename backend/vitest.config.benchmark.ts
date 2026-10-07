import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/benchmark/**/*.benchmark.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    silent: false,
  },
});

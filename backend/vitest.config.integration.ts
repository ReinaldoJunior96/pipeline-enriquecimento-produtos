import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.integration-test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});

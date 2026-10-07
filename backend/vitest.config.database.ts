import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: [
      'test/integration/database/**/*.integration-test.ts',
      'test/integration/processing/**/*.integration-test.ts',
      'test/integration/queue/**/*.integration-test.ts',
    ],
    fileParallelism: false,
    testTimeout: 30_000,
    setupFiles: ['./test/support/isolamento-filas.ts'],
  },
});

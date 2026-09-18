import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['.harness/v5/loop/*.test.ts'] },
});

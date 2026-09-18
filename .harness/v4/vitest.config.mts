import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['.harness/v4/loop/*.test.ts'] },
});

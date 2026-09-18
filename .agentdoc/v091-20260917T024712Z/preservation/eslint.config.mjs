import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'release/**',
      'node_modules/**',
      '.harness/**',
      '.regent/**',
      'graphify-out/**',
      '.worktrees/**',
      // Forensic source copies and compiler outputs, never executable product sources.
      '.agentdoc/v09-*/preservation/**',
      '.agentdoc/v09-*/candidate-core*/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

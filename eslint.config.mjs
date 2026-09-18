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
      '.agentdoc/v091-*/preservation/**',
      '.agentdoc/v091-*/balance-baseline/**',
      '.agentdoc/v091-*/balance-candidate/**',
      '.agentdoc/v10-*/preservation/**',
      '.agentdoc/v10-*/baseline/**',
      '.agentdoc/v10-*/**/compiled-*/**',
      '.agentdoc/v10-*/reviews/**/.harness/**',
      '.agentdoc/v10-*/**/source-*/**',
      '.agentdoc/v10-*/pilot-package/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

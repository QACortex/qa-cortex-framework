// Repository lint config (flat config). Type-aware rules run on TypeScript 6.0.3 (ADR 0005).
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Spikes keep their own toolchains and lockfiles (preserved history, not linted here).
    ignores: ['**/dist/**', '**/node_modules/**', 'spikes/**', 'test-results/**', 'playwright-report/**', 'blob-report/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'playwright.config.ts'],
          defaultProject: 'tsconfig.tools.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Published package source: rules that protect consumers (ADR 0001).
    files: ['packages/*/src/**/*.ts'],
    rules: {
      // Top-level await breaks require() of our ESM package (ERR_REQUIRE_ASYNC_MODULE).
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AwaitExpression:not(:function AwaitExpression)',
          message: 'Top-level await is not allowed: it breaks require() of this ESM package (ADR 0001).',
        },
        {
          selector: 'ForOfStatement[await=true]:not(:function ForOfStatement)',
          message: 'Top-level for await is not allowed: it breaks require() of this ESM package (ADR 0001).',
        },
      ],
      // Playwright is a peer dependency and may only be imported for types (ADR 0001).
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              message: 'Import Playwright with `import type` only; core never loads it at runtime (ADR 0001).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
);

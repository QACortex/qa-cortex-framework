// Lint config for the automation project (independent of framework/).
// Same type-aware baseline the framework uses for its own tests.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // reference/: local, untracked reference scripts (never linted, type-checked or run).
  { ignores: ['node_modules/**', 'vendor/**', 'test-results/**', 'playwright-report/**', 'blob-report/**', 'allure-results/**', 'allure-report/**', 'reference/**'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Resetting local form state when a modal opens is a legitimate,
      // intentional effect in this codebase.
      'react-hooks/set-state-in-effect': 'off',
      // The experimental React Compiler is over-cautious about array deps
      // passed to selector functions; our useMemo usage is correct.
      'react-hooks/preserve-manual-memoization': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Context files intentionally export a provider component alongside their
    // hook — a standard React pattern. The fast-refresh rule doesn't apply.
    files: ['src/store/**/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])

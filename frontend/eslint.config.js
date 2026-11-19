import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'cypress/screenshots', 'cypress/videos', 'cypress/downloads']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['cypress/**', 'cypress.config.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Cypress-tesztek: a böngészőben futnak, a cy / Cypress / describe / it / expect globálisokkal.
  {
    files: ['cypress/**/*.js'],
    ignores: ['cypress/inditas.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.mocha, cy: 'readonly', Cypress: 'readonly', expect: 'readonly', assert: 'readonly' },
    },
  },
  // Node-ban futó fájlok: a tesztindító és a Cypress-konfiguráció.
  {
    files: ['cypress/inditas.js', 'cypress.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])

/* ESLint flat config compatible with ESLint v9+ / v10
   Mirrors rules from .eslintrc.json for TypeScript projects. */
const tsPlugin = require('@typescript-eslint/eslint-plugin');
module.exports = [
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 2020
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off'
    }
  }
];

module.exports = {
  root: true,
  ignorePatterns: ['node_modules/', '.wrangler/'],
  env: { es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-undef': 'off',
    'no-unused-vars': 'off',
  },
}


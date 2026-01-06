module.exports = {
  root: true,
  ignorePatterns: ['node_modules/', 'dist/'],
  env: { browser: true, es2022: true },
  overrides: [
    {
      files: ['src/**/*.js'],
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      extends: ['eslint:recommended'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
    {
      files: ['src/**/*.vue'],
      env: { browser: true, es2022: true },
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: 'espree',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      plugins: ['vue'],
      extends: ['eslint:recommended', 'plugin:vue/vue3-essential', 'prettier'],
      rules: {
        'no-unused-vars': 'off',
        'vue/multi-word-component-names': 'off',
      },
    },
  ],
}

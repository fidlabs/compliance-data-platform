module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unreachable': 'error',
    'no-restricted-globals': [
      'error',
      {
        name: 'parseInt',
        message: 'Use utils.stringToNumber() instead',
      },
      {
        name: 'parseFloat',
        message: 'Use utils.stringToNumber() instead',
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.name='Number']",
        message: 'Use utils.stringToNumber() instead',
      },
      {
        selector: "NewExpression[callee.name='Number']",
        message: 'Use utils.stringToNumber() instead',
      },
    ],
  },
};

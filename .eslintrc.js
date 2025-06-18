module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    // You can add custom rules here
    'react/react-in-jsx-scope': 'off', // not needed in React 17+
    '@typescript-eslint/no-unused-vars': ['warn']
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}

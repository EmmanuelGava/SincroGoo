module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    
    // Reglas de React
    'react/jsx-key': 'warn',
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',
    
    // Reglas de importación
    'import/no-unresolved': 'off',
    'import/named': 'off',
  },
  ignorePatterns: [
    '.next/',
    'node_modules/',
    'public/',
    '*.js',
    '*.json',
    '*.lock',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
} 
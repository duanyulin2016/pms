module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@firebase/security-rules'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@firebase/security-rules/no-unprotected-collections': 'error',
  },
  overrides: [
    {
      files: ['*.rules'],
      rules: {
        '@firebase/security-rules/no-unprotected-collections': 'error',
      },
    },
  ],
};

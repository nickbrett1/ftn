module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  extends: ['plugin:@next/next/recommended', 'airbnb', 'prettier', 'plugin:storybook/recommended'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: true
    }],
    'implicit-arrow-linebreak': 'off',
    'react/no-unknown-property': ['error', {
      ignore: ['css']
    }],
    'object-curly-newline': ['error', {
      ObjectExpression: {
        consistent: true,
        multiline: true
      },
      ObjectPattern: {
        consistent: true,
        multiline: true
      },
      ImportDeclaration: 'always-multiline',
      ExportDeclaration: {
        multiline: true,
        minProperties: 3
      }
    }],
    'react/jsx-wrap-multilines': ['error', {
      declaration: false,
      assignment: false
    }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
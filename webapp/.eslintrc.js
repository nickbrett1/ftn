module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
  extends: ['plugin:@next/next/recommended', 'airbnb', 'prettier'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
      },
    ],
    'implicit-arrow-linebreak': 'off',
    'react/no-unknown-property': [
      'error',
      {
        ignore: ['css'],
      },
    ],
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: {
          consistent: true,
          multiline: true,
        },
        ObjectPattern: {
          consistent: true,
          multiline: true,
        },
        ImportDeclaration: {
          multiline: true,
        },
        ExportDeclaration: {
          multiline: true,
          minProperties: 3,
        },
      },
    ],
    'react/jsx-wrap-multilines': [
      'error',
      {
        declaration: false,
        assignment: false,
      },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-filename-extension': [1, { extensions: ['.jsx'] }],
  },
  overrides: [
    {
      files: ['*.mdx'],
      extends: ['plugin:mdx/recommended'],
      rules: {
        'import/prefer-default-export': 'off',
        'react/jsx-filename-extension': [1, { extensions: ['.mdx'] }],
        'import/no-named-as-default': 'off',
        'import/no-named-as-default-member': 'off',
      },
      settings: {
        extensions: ['.mdx'],
        'mdx/code-blocks': true,
      },
    },
  ],
};

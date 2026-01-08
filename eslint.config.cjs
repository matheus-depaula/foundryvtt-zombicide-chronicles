const path = require('path');
const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');
const prettierPlugin = require('eslint-plugin-prettier');
const eslintCommentsPlugin = require('eslint-plugin-eslint-comments');
const jsoncParser = require('jsonc-eslint-parser');
const globals = require('globals');

const rootDir = __dirname;

// Shared rules for both TypeScript and JavaScript
const sharedRules = {
  // Formatting / Style
  semi: ['error', 'always'],
  quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
  'comma-dangle': ['error', 'always-multiline'],
  'eol-last': ['error', 'always'],
  'no-trailing-spaces': 'error',

  // Unused expressions
  'no-unused-expressions': 'error',

  // Code quality
  'prefer-const': 'error',
  'no-var': 'error',
  'object-shorthand': 'error',
  'prefer-arrow-callback': 'error',
  'prefer-template': 'error',
  'no-debugger': 'error',
  'no-alert': 'error',

  // Function conventions
  'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
  'arrow-parens': ['error', 'always'],

  // Best practices
  eqeqeq: ['error', 'always'],
  'no-eval': 'error',
  'no-console': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-return-assign': 'error',
  'no-sequences': 'error',
  'no-throw-literal': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-useless-call': 'error',
  'no-useless-concat': 'error',
  'no-useless-return': 'error',
  'prefer-promise-reject-errors': 'error',

  // Comments
  'spaced-comment': [
    'error',
    'always',
    {
      line: { markers: ['/', '!', '*'], exceptions: ['-', '+', '=', '*', '/', '!'] },
      block: { markers: ['*', '!'], exceptions: ['*', '-', '+', '='] },
    },
  ],
};

// Shared plugins for files that support them (TS and JS with prettier)
const sharedPlugins = {
  prettier: prettierPlugin,
};

// Shared plugin rules
const sharedPluginRules = {
  'prettier/prettier': 'error',
};

module.exports = [
  // Ignored files
  {
    ignores: ['dist/**', 'node_modules/**', 'tsconfig.tsbuildinfo'],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.{ts,mts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: path.join(rootDir, 'tsconfig.json'),
        tsconfigRootDir: rootDir,
      },
      globals: {
        ...globals.es2021,
        ...globals.browser,
        Hooks: 'readonly',
      },
    },

    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: { extensions: ['.ts', '.js'] },
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      'eslint-comments': eslintCommentsPlugin,
      ...sharedPlugins,
    },

    rules: {
      ...sharedRules,
      ...sharedPluginRules,

      // Unused vars & imports
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // TypeScript specific
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // Imports
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unused-modules': 'off',

      // TypeScript: let the compiler handle undefined symbols — disable ESLint's no-undef here
      'no-undef': 'off',

      // ESLint comments
      'eslint-comments/disable-enable-pair': 'error',
      'eslint-comments/no-duplicate-disable': 'error',
      'eslint-comments/no-unlimited-disable': 'error',
      'eslint-comments/no-unused-disable': 'error',
      'eslint-comments/no-unused-enable': 'error',

      // Override console message for TypeScript
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console']",
          message: 'Avoid using console; use `Logger` instead.',
        },
      ],
    },
  },

  // JavaScript ESM files (no TS "project" mode)
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
    plugins: {
      ...sharedPlugins,
    },
    rules: {
      ...sharedRules,
      ...sharedPluginRules,

      // Unused vars
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // Override console message for JavaScript
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console']",
          message: 'Avoid using console; use the global `log` (fancy-log) instead.',
        },
      ],
    },
  },

  // CommonJS files
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
  },

  // Node-based TS tooling files (still using the TS parser, but without project mode)
  {
    files: ['vite.config.mts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
  },

  // JSON files
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: jsoncParser,
    },
  },
];

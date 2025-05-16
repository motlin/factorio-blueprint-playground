import path from 'path';
import {fileURLToPath} from 'url';

import {includeIgnoreFile} from '@eslint/compat';
import js from '@eslint/js';
import pluginRouter from '@tanstack/eslint-plugin-router';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

const {
    // Browser-specific globals (window, document, etc.)
    browser,
    // CommonJS module system globals
    commonjs,
    // ECMAScript 2024 globals
    es2024,
    // Node.js runtime globals
    node,
    // Web Worker globals
    worker,
    // Vitest testing framework globals
    vitest,
} = globals;

// Get current directory in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gitignorePath = path.resolve(__dirname, '.gitignore');

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
    includeIgnoreFile(gitignorePath),

    { ignores: ['.llm/**'] },

    // Base configuration - applies to all files
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        linterOptions: {
            reportUnusedDisableDirectives: true,
            noInlineConfig: false,
        },
        settings: {
            maxWarnings: 0,
        },
    },

    js.configs.recommended,

    // TypeScript configuration
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname,
                ecmaFeatures: {
                    jsx: true,
                },
                EXPERIMENTAL_useProjectService: true,
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
        },
        rules: {
            ...typescript.configs['recommended'].rules,
            ...typescript.configs['recommended-requiring-type-checking'].rules,
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': ['error', {
                'ts-expect-error': {descriptionFormat: '^: .+$'},
                'ts-ignore': false,
                'ts-nocheck': false,
                'ts-check': true,
            }],
            '@typescript-eslint/no-inferrable-types': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/no-unnecessary-type-constraint': 'error',
        },
    },

    // Node.js environment
    {
        files: [
            '**/vite.config.{js,ts}',
            '**/vitest.config.{js,ts}',
            '**/jest.config.{js,ts}',
            '**/webpack.config.{js,ts}',
            '**/rollup.config.{js,ts}',
        ],
        languageOptions: {
            globals: {
                ...node,
                ...commonjs,
            },
        },
    },

    // Cloudflare Pages Functions
    {
        files: ['functions/**/*.{js,ts}'],
        languageOptions: {
            globals: {
                ...es2024,
                ...worker,
                KVNamespace: 'readonly',
            },
        },
    },

    // Browser environment
    {
        files: ['src/**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            globals: {
                ...es2024,
                ...browser,
            },
        },
    },

    // Test environment
    {
        files: [
            'test/**/*.{js,ts,jsx,tsx}',
            'test/fixtures/**/*.{js,ts}',
        ],
        languageOptions: {
            globals: {
                ...node,
                ...vitest,
                ...browser,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            'no-console': 'off',
        },
    },

    // React configuration
    {
        files: ['**/*.{jsx,tsx}'],
        settings: {
            react: {
                version: '18.2',
                pragma: 'React',
                pragmaFrag: 'Fragment',
            },
        },
        plugins: {
            'react': react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
        },
    },

    // Import plugin configuration
    {
        plugins: {
            'import': importPlugin,
        },
        rules: {
            'import/order': ['error', {
                'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                'alphabetize': {'order': 'asc'},
            }],
            'import/no-duplicates': 'error',
        },
    },

    // Common rules
    {
        rules: {
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', {'avoidEscape': true}],
            'jsx-quotes': ['error', 'prefer-double'],
            'no-console': ['warn', {allow: ['warn', 'error']}],
            'no-debugger': 'warn',
            'no-multiple-empty-lines': ['error', {'max': 1, 'maxEOF': 0}],
            'eol-last': ['error', 'always'],
            'no-trailing-spaces': 'error',
            'comma-dangle': ['error', 'always-multiline'],
            'line-comment-position': ['error', { 'position': 'above' }],
        },
    },

    // TanStack Router ESLint plugin
    ...pluginRouter.configs['flat/recommended'],
];

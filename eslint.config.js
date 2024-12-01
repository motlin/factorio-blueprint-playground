import path from 'path';
import {fileURLToPath} from 'url';

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Get current directory in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
    {
        languageOptions: {
            globals: {
                // Browser globals
                window: true,
                document: true,
                navigator: true,
                console: true,
                fetch: true,
                atob: true,
                btoa: true,
            },
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
    },

    {
        ignores: [
            'dist',
            'node_modules',
            'coverage',
            '.vite',
            'routeTree.gen.ts',
            'vite-env.d.ts',
            'tsconfig.app.tsbuildinfo',
            'tsconfig.node.tsbuildinfo',
        ],
    },

    js.configs.recommended,

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
                varsIgnorePattern: '^_',
            }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': ['error', {
                'ts-expect-error': {descriptionFormat: '^: .+$'},
                'ts-ignore': false,
                'ts-nocheck': false,
                'ts-check': true,
            }],
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
        },
    },

    // React config
    {
        files: ['**/*.{ts,tsx}'],
        settings: {
            react: {
                version: '18.2',
                pragma: 'h',
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

    // Import plugin config
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

    {
        rules: {
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', {'avoidEscape': true}],
            'jsx-quotes': ['error', 'prefer-double'],
            'no-console': ['warn', {allow: ['warn', 'error']}],
            'no-debugger': 'warn',
            'no-multiple-empty-lines': ['error', {'max': 1, 'maxEOF': 0}],
            'eol-last': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
        },
    },

    {
        files: ['test/**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                // Test environment globals
                describe: true,
                expect: true,
                it: true,
                beforeEach: true,
                afterEach: true,
                vi: true,
                vitest: true,
                // Node.js globals needed in tests
                console: true,
                __dirname: true,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            'react/display-name': 'off',
            'no-console': 'off',
        },
    },
];

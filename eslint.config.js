import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import {fileURLToPath} from 'url';
import path from 'path';

// Get current directory in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
    {
        ignores: [
            'dist',
            'node_modules',
            'coverage',
            '.vite',
            'routeTree.gen.ts',
            'vite-env.d.ts',
            'tsconfig.app.tsbuildinfo',
            'tsconfig.node.tsbuildinfo'
        ]
    },

    // Base configs
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    // Main source files configuration
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname,
                allowDefaultProject: true,
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        settings: {
            react: {
                version: '18.2',
                pragma: 'h',
                pragmaFrag: 'Fragment'
            }
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            import: importPlugin
        },
        rules: {
            // TypeScript
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': ['error', {
                'ts-expect-error': {descriptionFormat: '^: .+$'},
                'ts-ignore': false,
                'ts-nocheck': false,
                'ts-check': true
            }],

            // React
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',

            // React Hooks
            ...reactHooks.configs.recommended.rules,

            // Import
            'import/order': ['error', {
                'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                'alphabetize': {'order': 'asc'}
            }],
            'import/no-duplicates': 'error',

            // General style
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', {'avoidEscape': true}],
            'jsx-quotes': ['error', 'prefer-double'],
            'no-console': ['warn', {allow: ['warn', 'error']}],
            'no-debugger': 'warn',
            'no-multiple-empty-lines': ['error', {'max': 1, 'maxEOF': 0}],
            'eol-last': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline']
        }
    },

    // Test files configuration
    {
        files: ['test/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname
            }
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-floating-promises': 'off', // Often needed in tests
            'react/display-name': 'off'
        }
    },

    // Config files
    {
        files: ['*.config.{ts,js}', 'vite.config.ts', 'vitest.config.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname
            }
        }
    },

    // Disable type checking for JS files
    {
        files: ['**/*.js'],
        ...tseslint.configs.disableTypeChecked
    }
);

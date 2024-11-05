import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
    {
        ignores: [
            'dist',
            'node_modules',
            'coverage',
            'routeTree.gen.ts',
            'vite-env.d.ts'
        ]
    },

    // Base JS and TS configurations
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    // Main source files configuration
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: ['./tsconfig.app.json'],
                tsconfigRootDir: '.',
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
            'jsx-a11y': jsxA11y,
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

            // JSX A11Y
            ...jsxA11y.configs.recommended.rules,

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
                project: ['./tsconfig.app.json'],
                tsconfigRootDir: '.'
            }
        },
        rules: {
            // Relax certain rules for tests
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'react/display-name': 'off'
        }
    },

    // Configuration files
    {
        files: ['*.config.{ts,js}', 'vite.config.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: ['./tsconfig.node.json'],
                tsconfigRootDir: '.'
            }
        }
    }
);
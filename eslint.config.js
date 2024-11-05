import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'dist',
            'node_modules',
            '*.config.js',
            '*.config.ts',
            'routeTree.gen.ts',
            'coverage',
            '.eslintrc.js',
            'vite-env.d.ts'
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        // Configuration for TypeScript files
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
        rules: {
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { 'avoidEscape': true }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'warn'
        }
    },
    {
        // Configuration for TypeScript config files
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
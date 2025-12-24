import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['node_modules/', 'dist/', 'build/'],
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js'],
        languageOptions: {
            parser: typescriptParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        plugins: {
            prettier: eslintPluginPrettier,
            '@typescript-eslint': typescriptEslint,
        },
        rules: {
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'crlf',
                    semi: true,
                    singleQuote: true,
                    tabWidth: 4,
                    trailingComma: 'all',
                    printWidth: 120,
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'max-len': ['error', { code: 120, ignoreComments: true }],
        },
    },
    eslintPluginPrettierRecommended,
];

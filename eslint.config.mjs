import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import jestPlugin from 'eslint-plugin-jest';
import globals from 'globals';

export default [
	{
		ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
	},
	{
		files: ['packages/*/src/**/*.ts', 'packages/*/__tests__/**/*.ts'],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				sourceType: 'module'
			},
			globals: {
				...globals.node,
				...globals.jest
			}
		},
		plugins: {
			'@typescript-eslint': typescriptPlugin,
			prettier: eslintPluginPrettier,
			jest: jestPlugin
		},
		rules: {
			'prettier/prettier': ['error', { endOfLine: 'auto' }],

			'@typescript-eslint/consistent-type-definitions': 'error',
			'@typescript-eslint/dot-notation': 'off',
			'@typescript-eslint/explicit-member-accessibility': ['off', { accessibility: 'explicit' }],
			'@typescript-eslint/member-ordering': 'off',
			'@typescript-eslint/naming-convention': [
				'error',
				{ selector: 'typeLike', format: ['PascalCase'] }
			],
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-empty-interface': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/no-misused-new': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-shadow': ['error'],
			'@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
			'@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
			'@typescript-eslint/no-use-before-define': 'error',
			'@typescript-eslint/prefer-function-type': 'error',
			'@typescript-eslint/quotes': ['error', 'single'],
			'@typescript-eslint/semi': ['error', 'always'],
			'@typescript-eslint/unified-signatures': 'error',

			'jest/no-focused-tests': 'error',

			'arrow-body-style': 'off',
			'brace-style': ['error', '1tbs'],
			camelcase: 'off',
			curly: 'error',
			'dot-notation': 'off',
			'eol-last': 'error',
			eqeqeq: ['error', 'smart'],
			'guard-for-in': 'error',
			'no-bitwise': 'error',
			'no-caller': 'error',
			'no-console': 'error',
			'no-debugger': 'error',
			'no-empty': 'off',
			'no-empty-function': 'off',
			'no-eval': 'error',
			'no-fallthrough': 'error',
			'no-new-wrappers': 'error',
			'no-redeclare': 'error',
			'no-restricted-imports': 'error',
			'no-shadow': 'off',
			'no-throw-literal': 'error',
			'no-tabs': ['error', { allowIndentationTabs: true }],
			'no-trailing-spaces': 'error',
			'no-undef-init': 'error',
			'no-underscore-dangle': 'off',
			'no-unused-labels': 'error',
			'no-useless-constructor': 'off',
			'no-var': 'error',
			'padded-blocks': 'off',
			'prefer-const': 'error',
			quotes: [2, 'single', { avoidEscape: true }],
			radix: 'error',
			semi: ['error', 'always'],
			'space-before-function-paren': 'off',
			'spaced-comment': ['error', 'always', { markers: ['/'] }],
			'max-len': ['error', { code: 256 }]
		}
	},
	{
		files: ['packages/plugin-cli/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	{
		files: ['packages/ui-plugin-sdk/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.browser
			}
		}
	},
	{
		files: ['packages/*/__tests__/**/*.spec.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { vars: 'local', args: 'none' }]
		}
	},
	eslintConfigPrettier
];

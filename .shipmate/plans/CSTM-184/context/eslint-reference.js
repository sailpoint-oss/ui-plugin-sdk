// ESLint config from saas-sp-renderer (reference for CSTM-184)
// This config needs adaptation: remove nestjs plugin, adjust for pnpm workspace structure
module.exports = {
	'root': true,
	'extends': [
		'plugin:prettier/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:nestjs/recommended',
		'standard'
	],
	'env': {
		'browser': true,
		'es6': true,
		'node': true,
		'jest': true
	},
	'parser': '@typescript-eslint/parser',
	'parserOptions': {
		'project': 'tsconfig.json',
		'sourceType': 'module'
	},
	'plugins': [
		'@typescript-eslint',
		'jest',
		'prettier',
		'nestjs'
	],
	'ignorePatterns': [
		'node_modules/*',
		'etc/plugin-harness/**',
		'dist/*',
		'public/*',
		'views/*',
		'docs/*',
		'coverage/*',
		'schematics/*',
		'test-output/*',
		'webpack.config.js'
	],
	'rules': {
		'@typescript-eslint/consistent-type-definitions': 'error',
		'@typescript-eslint/dot-notation': 'off',
		'@typescript-eslint/explicit-member-accessibility': [
			'off',
			{
				'accessibility': 'explicit'
			}
		],
		'@typescript-eslint/indent': [
			'error',
			'tab',
			{
			  "ignoredNodes": [
				"FunctionExpression > .params[decorators.length > 0]",
				"FunctionExpression > .params > :matches(Decorator, :not(:first-child))",
				"ClassBody.body > PropertyDefinition[decorators.length > 0] > .key"
			  ]
			}
		],
		'@typescript-eslint/member-delimiter-style': [
			'error',
			{
				'multiline': {
					'delimiter': 'semi',
					'requireLast': true
				},
				'singleline': {
					'delimiter': 'semi',
					'requireLast': false
				}
			}
		],
		'@typescript-eslint/member-ordering': 'off',
		'@typescript-eslint/naming-convention':[
			'error',
			{
				selector: 'typeLike',
				format: ['PascalCase']
			}
		],
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-empty-interface': 'error',
		'@typescript-eslint/no-inferrable-types':'error',
		'@typescript-eslint/no-misused-new': 'error',
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/no-shadow': ['error'],
		'@typescript-eslint/no-unused-expressions': [
			'error', {
				allowTernary: true
			}
		],
		'@typescript-eslint/no-unused-vars': ['error', { 'ignoreRestSiblings': true }],
		'@typescript-eslint/no-use-before-define': 'error',
		'@typescript-eslint/prefer-function-type': 'error',
		'@typescript-eslint/quotes': [
			'error',
			'single'
		],
		'@typescript-eslint/semi': [
			'error',
			'always'
		],
		'@typescript-eslint/type-annotation-spacing': 'error',
		'@typescript-eslint/unified-signatures': 'error',
		'jest/no-focused-tests': 'error',
		'arrow-body-style': 'off',
		'brace-style': [
			'error',
			'1tbs'
		],
		'camelcase': 'off',
		'curly': 'error',
		'dot-notation': 'off',
		'eol-last': 'error',
		'eqeqeq': [
			'error',
			'smart'
		],
		'guard-for-in': 'error',
		'generator-star-spacing': ['error', 'after'],
		'id-blacklist': 'off',
		'id-denylist': 'off',
		'id-match': 'off',
		'indent': 'off',
		'lines-between-class-members': 'error',
		'max-len': [
			'error',
			{
				'code': 256
			}
		],
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
		'no-tabs': ['error', {'allowIndentationTabs': true}],
		'no-trailing-spaces': 'error',
		'no-undef-init': 'error',
		'no-underscore-dangle': 'off',
		'no-unused-expressions': 'error',
		'no-unused-labels': 'error',
		'no-unused-vars': 'error',
		'no-use-before-define': 'error',
		'no-useless-constructor': 'off',
		'no-var': 'error',
		'padded-blocks': 'off',
		'prefer-const': 'error',
		'prettier/prettier': [
			'error',
			{
				'endOfLine': 'auto'
			}
		],
		'quotes': [2, 'single', { 'avoidEscape': true }],
		'radix': 'error',
		'semi': ['error', 'always'],
		'space-before-function-paren': 'off',
		'spaced-comment': [
			'error',
			'always',
			{
				'markers': [
					'/'
				]
			}
		]
	},
	'overrides': [
		{
			'files': ['*.ts'],
			'extends': [
				'plugin:prettier/recommended'
			],
		},
		{
			'files': ['*spec.ts'],
			'rules': {
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-unused-vars': [
					'error',
					{
						'vars': 'local',
						'args': 'none'
					}
				]
			}
		}
	]
};

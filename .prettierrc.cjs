module.exports = {
	plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],
	printWidth: 120,
	tabWidth: 4,
	useTabs: true,
	bracketSpacing: true,
	quoteProps: 'as-needed',
	singleQuote: true,
	arrowParens: 'avoid',
	trailingComma: 'none',
	endOfLine: 'auto',
	importOrder: ['^@sailpoint/(.*)$', '<THIRD_PARTY_MODULES>', '^[./]'],
	importOrderSeparation: true,
	importOrderParserPlugins: ['typescript', 'decorators-legacy'],
	jsxSingleQuote: true
};

// Prettier config from saas-sp-renderer (reference for CSTM-184)
// This config needs adaptation: update importOrder for SDK packages
module.exports = {
	"plugins": [require.resolve("@trivago/prettier-plugin-sort-imports")],
	"printWidth": 120,
	"tabWidth": 4,
	"useTabs": true,
	"bracketSpacing": true,
	"quoteProps": "as-needed",
	"singleQuote": true,
	"arrowParens": "avoid",
	"trailingComma": "none",
	"endOfLine": "auto",
	"importOrder": [
		"^@nestjs",
		"^@sailpoint-priv/saas-atlasjs",
		"<THIRD_PARTY_MODULES>",
		"__mocks__.*"
	],
	"importOrderSeparation": true,
	"importOrderParserPlugins": ["typescript", "decorators-legacy"],
	"jsxSingleQuote": true
}

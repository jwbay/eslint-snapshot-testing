module.exports = {
	trailingComma: 'es5',
	tabWidth: 4,
	semi: false,
	useTabs: true,
	singleQuote: true,
	printWidth: 100,
	proseWrap: 'always',
	overrides: [
		{
			files: ['*.md'],
			options: {
				useTabs: false,
				semi: true,
			},
		},
	],
}

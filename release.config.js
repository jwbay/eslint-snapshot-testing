/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
	dryRun: true,
	plugins: [
		[
			'@semantic-release/commit-analyzer',
			{
				preset: 'angular',
				releaseRules: [{ type: 'chore', scope: 'docs', release: false }],
				parserOpts: {
					noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
				},
			},
		],
		[
			'@semantic-release/release-notes-generator',
			{
				preset: 'angular',
				parserOpts: {
					noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
				},
			},
		],
		'@semantic-release/npm',
		'@semantic-release/github',
	],
}

import { runLintFixtureTests } from '../ruleSnapshotTester'
import rule from './rules/camel-case-local-functions'

const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

runLintFixtureTests({
	rule,
	ruleName: 'unsupported-jsdoc',
})

it('should give a helpful warning when encountering an unsupported jsdoc tag in a fixture', () => {
	const warning = consoleWarn.mock.calls[0][0].trim()
	expect(warning).toMatchInlineSnapshot(
		`"Unrecognized tag '@something' in fixture JSDoc. Supported tags: test, filename, ruleOptions, acceptFix"`
	)
})

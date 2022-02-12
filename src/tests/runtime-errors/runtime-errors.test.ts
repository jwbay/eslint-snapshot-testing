import { runLintFixtureTests } from '../../ruleSnapshotTester'
import rule from '../rules/camel-case-local-functions'

let consoleWarn: jest.SpyInstance

beforeEach(() => {
	consoleWarn = jest.spyOn(console, 'warn')
})

afterEach(() => {
	consoleWarn.mockRestore()
})

it('should give a helpful error when unable to locate a fixture', () => {
	let error = new Error('test failed')
	try {
		runLintFixtureTests({
			rule,
			ruleName: 'my-rule-with-missing-fixture',
		})
	} catch (e) {
		error = e as Error
	}

	const cwd = process.cwd().toLowerCase()
	const message = error.message
		.toLowerCase()
		.replace(cwd, '')
		.replace(cwd, '')
		.replace(/\\/g, '/')

	expect(message).toMatchInlineSnapshot(`
"could not find fixture for the rule my-rule-with-missing-fixture.
looked for:
my-rule-with-missing-fixture.fixture
my-rule-with-missing-fixture.fixture.[any extension]

under the following directories:
/src/tests/runtime-errors
/src/tests/runtime-errors/__fixtures__"
`)
})

it('should give a helpful error when unable to parse rule options in a fixture', () => {
	consoleWarn.mockImplementation(() => {})
	let error = new Error('test failed')
	try {
		runLintFixtureTests({
			rule,
			ruleName: 'rule-options-jsdoc-parse-error',
		})
	} catch (e) {
		error = e as Error
	}

	const warning = consoleWarn.mock.calls[0][0].toLowerCase().trim()
	const errorMessage = error.message.toLowerCase().trim()
	expect(warning).toMatchInlineSnapshot(`
		"could not parse option json from fixture.
		source:
		this is not valid json"
	`)
	expect(errorMessage).toMatchInlineSnapshot(`"unexpected token h in json at position 1"`)
})

it('should give a helpful error when rule options are not an array', () => {
	let error = new Error('test failed')
	try {
		runLintFixtureTests({
			rule,
			ruleName: 'rule-options-jsdoc-not-array-value',
		})
	} catch (e) {
		error = e as Error
	}

	const message = error.message.toLowerCase().trim()
	expect(message).toMatchInlineSnapshot(`
		"rule options are required to be an array to avoid ambiguity.
		received type: number

		for this example eslint rule configuration:
		    my-rule-name: [\\"error\\", \\"first configuration value\\", { otherconfig: 42 }]
		the corresponding jsdoc entry should be:
			/** @ruleoptions [\\"first configuration value\\", { otherconfig: 42 }] */

		or for this example configuration:
		    my-other-rule-name: [\\"error\\", [\\"first\\", \\"second\\"]]
		the corresponding jsdoc entry should be:
		    /** @ruleoptions [[\\"first\\", \\"second\\"]]"
	`)
})

import { runFixture } from '../ruleSnapshotTester'
import rule from './rules/camel-case-local-functions'

it('should give a helpful error when unable to locate a fixture', () => {
	let error = new Error('test failed')
	try {
		runFixture({
			rule,
			ruleName: 'my-rule-with-missing-fixture',
		})
	} catch (e) {
		error = e
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
		/src/tests
		/src/tests/__fixtures__"
	`)
})

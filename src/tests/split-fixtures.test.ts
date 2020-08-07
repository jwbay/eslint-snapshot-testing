import { runFixture } from '../ruleSnapshotTester'
import rule from './rules/camel-case-local-functions'
import { RuleTester } from 'eslint'

 new RuleTester({}).run('wat', rule, {
	valid: [
		{
			code: `
				function foo() {};
				foo();`,
		},
	],
	invalid: [
		{
			code: `
			function Foo() {};
			Foo();`,
			errors: [
				{
					message: 'local function names should be camelCase',
				},
			],
		},
	],
})

runFixture({
	rule,
	ruleName: 'split-fixtures',
	testDirectory: __dirname,
})

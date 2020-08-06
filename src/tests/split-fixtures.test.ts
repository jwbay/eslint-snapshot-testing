import { run } from './ruleSnapshotTester'
import rule from '../rules/camel-case-local-functions'
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

run({
	rule,
	ruleName: 'split-fixture',
	testDirectory: __dirname,
})

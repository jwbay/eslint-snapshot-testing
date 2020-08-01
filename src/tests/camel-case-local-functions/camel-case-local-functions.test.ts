import { run } from '../ruleSnapshotTester'
import rule from '../../rules/camel-case-local-functions'
import { RuleTester } from 'eslint'

/**
 * .fixture extension under __fixtures__
 *
 * Extract test cases out of comments?
 *      // test: should blah blah blah
 *  sure but make this optional
 * Configuration......... idk
 *
 * keep in mind there will be ONE snap file per rule/test file
 * but potentially MULTIPLE fixtures.... which implies directory organization
 * OR a first class DSL as above to split test cases in fixtures (with config)
 *
 * by default, look for fixture files 1. next to test 2. in __fixtures__
 *
 */

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
	testDirectory: __dirname,
})

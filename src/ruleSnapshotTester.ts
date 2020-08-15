import * as fs from 'fs'
import { Linter, Rule } from 'eslint'
import { getFixtureDirectory } from './inferTestDirectory'
import { serializeLintResult } from './lintResultSerializer'
import { findFixtureFile } from './fixtureFinder'
import { parseFixture } from './fixtureParser'

interface Options {
	/**
	 * The rule object, with 'create' and 'meta' properties.
	 *
	 * @example
	 *
	 * runLintFixtureTests({
	 *   ...
	 *   rule: require('../rules/my-custom-rule')
	 * })
	 */
	rule: Rule.RuleModule
	/**
	 * The rule name. Used for test names and to locate fixtures.
	 *
	 * @example
	 *
	 * runLintFixtureTests({
	 *   ...
	 *   rulename: 'my-rule-name'
	 * })
	 */
	ruleName: string
	/**
	 * Used to locate fixtures. An attempt is made to infer the directory of
	 * the calling test, but if this fails, pass `__dirname` here explicitly.
	 *
	 * @example
	 *
	 * runLintFixtureTests({
	 *   ...
	 *   fixtureDirectory: __dirname
	 * })
	 */
	fixtureDirectory?: string
	/**
	 * Use this to set parser options for the rule being tested. These are
	 * permissive by default.
	 *
	 * @example
	 *
	 * runLintFixtureTests({
	 *   ...
	 *   eslintConfig: {
	 *     parserOptions: {
	 *       ecmaVersion: 2020,
	 *       sourceType: 'module',
	 *     }
	 *   }
	 * })
	 */
	eslintConfig?: Omit<Linter.Config, 'rules'>
}

const defaultLintConfig: Linter.Config = {
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
		ecmaFeatures: {
			globalReturn: true,
			jsx: true,
		},
	},
}

/**
 * Runs tests for a given rule based on a test fixture located by convention. The fixture
 * should contain a mix of valid and invalid code. Test cases will be generated, and the
 * lint results for the fixture code will be snapshotted by Jest.
 *
 * The test fixture should be named `my-rule-name.fixture`, or `my-rule-name.fixture.{ts,js}`.
 * It should either be in the same directory as the test, or in a `__fixtures__` directory
 * under the test's directory.
 *
 * @example
 * import myCustomRule from '../my-custom-eslint-rule';
 * import { runLintFixtureTests } from 'eslint-snapshot-rule-tester';
 *
 * runLintFixtureTests({
 *   rule: myCustomRule,
 *   ruleName: 'my-custom-rule',
 * });
 */
export function runLintFixtureTests({
	rule,
	ruleName,
	eslintConfig = defaultLintConfig,
	fixtureDirectory = getFixtureDirectory(new Error('getFixtureDirectory')),
}: Options) {
	const fixturePath = findFixtureFile(ruleName, fixtureDirectory)
	const fixtureSource = fs.readFileSync(fixturePath, 'utf8').replace(/\r\n/g, '\n')
	const tests = parseFixture(fixtureSource, fixturePath)
	tests.forEach((entry) => {
		test(entry.testName, () => {
			const linter = new Linter({})
			linter.defineRule(ruleName, rule)
			const result = linter.verify(
				entry.testSource,
				{
					...eslintConfig,
					rules: {
						[ruleName]: entry.ruleOptions ? ['error', ...entry.ruleOptions] : 'error',
					},
				},
				entry.fileName
			)
			const serialized = serializeLintResult({
				lintMessages: result,
				lintedSource: entry.testSource,
			})
			expect(serialized).toMatchSnapshot()
		})
	})
}

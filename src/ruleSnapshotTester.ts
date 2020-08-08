import * as fs from 'fs'
import * as path from 'path'
import { Linter, Rule } from 'eslint'
import type { Tag } from 'comment-parser'
import { getFixtureDirectory } from './inferTestDirectory'
import { serializeLintResult } from './lintResultSerializer'
import { findFixtureFile } from './fixtureFinder'
const commentParser: typeof import('comment-parser') = require('comment-parser')

interface RunFixtureOptions {
	/**
	 * The rule object, with 'create' and 'meta' properties.
	 *
	 * @example
	 *
	 * runFixture({
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
	 * runFixture({
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
	 * runFixture({
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
	 * runFixture({
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

	// TODOS
	// factor out modules
	// write a readme
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
}: RunFixtureOptions) {
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

interface FixtureEntry {
	testName: string
	fileName: string
	testSource: string
	ruleOptions?: any[]
}

const knownTags = ['test', 'filename', 'ruleOptions'] as const
type KnownTags = typeof knownTags[number]

function parseFixture(fixtureContent: string, fixturePath: string) {
	const fixtureFile = path.basename(fixturePath)
	const jsDocRegex = /\/\*\*\s*\n*([^\*]|(\*(?!\/)))*\*\//gm
	const jsDocMarker = '/**<jsdoc>*/'
	const jsDocs: string[] = []
	const markedContent = fixtureContent.replace(jsDocRegex, (captured) => {
		jsDocs.push(captured)
		return jsDocMarker
	})

	let splitContent = markedContent.split(jsDocMarker)
	const fixtureStartedWithJSDoc = splitContent[0].trim() == ''
	if (fixtureStartedWithJSDoc) {
		splitContent = splitContent.slice(1)
	} else {
		jsDocs.unshift('/** @test should lint correctly */')
	}

	const result = splitContent.map<FixtureEntry>((testSourceCode, index) => {
		const jsdoc = jsDocs[index]
		const parsedBlock = commentParser(jsdoc)[0]
		const entry: FixtureEntry = {
			testSource: testSourceCode,
			testName: 'should lint correctly',
			fileName: fixtureFile,
		}

		for (const instruction of parsedBlock.tags) {
			const tag = instruction.tag?.toLowerCase() as KnownTags
			switch (tag) {
				case 'test':
					entry.testName = instruction.name + ' ' + instruction.description
					continue
				case 'filename':
					entry.fileName = instruction.name + ' ' + (instruction.description ?? '')
					entry.fileName = entry.fileName.trim()
					continue
				case 'ruleoptions' as string:
					entry.ruleOptions = parseRuleOptionsFromJSDoc(instruction)
					continue
				default:
					const supported = knownTags.join(', ')
					console.warn(
						`Unrecognized tag '@${instruction.tag}' in fixture JSDoc. Supported tags: ${supported}`
					)
			}
		}

		return entry
	})

	return result
}

function parseRuleOptionsFromJSDoc(instruction: Tag) {
	// comment-parser strips wrapping array brackets, but we need them preserved (and required)
	// to avoid ambiguity. ESLint config allows 'spread' options for rules, e.g.:
	// 	my-rule: ['error', 'something', 'something else']
	// but it also supports arrays as a single option, e.g.:
	// 	my-rule: ['error', ['something', 'something else']]
	const ruleOptionSource = instruction.source.replace('@' + instruction.tag, '').trim()
	let parsedOptions: any[]
	try {
		parsedOptions = JSON.parse(ruleOptionSource)
	} catch (parseError) {
		console.warn(`
Could not parse option JSON from fixture.
Source:
${ruleOptionSource}
`)
		throw parseError
	}

	if (!Array.isArray(parsedOptions)) {
		const typeName = getTypeName(parsedOptions).toLowerCase()
		throw new Error(`Rule options are required to be an array to avoid ambiguity.
Received type: ${typeName}

For this example ESLint rule configuration:
    my-rule-name: ["error", "first configuration value", { otherConfig: 42 }]
the corresponding JSDoc entry should be:
	/** @ruleOptions ["first configuration value", { otherConfig: 42 }] */

Or for this example configuration:
    my-other-rule-name: ["error", ["first", "second"]]
the corresponding JSDoc entry should be:
    /** @ruleOptions [["first", "second"]]
`)
	}

	return parsedOptions
}

function getTypeName(object: any) {
	const fullName: string = Object.prototype.toString.call(object)
	return fullName.split(' ')[1].slice(0, -1)
}

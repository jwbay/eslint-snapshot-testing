import * as fs from 'fs'
import * as path from 'path'
import { Linter, Rule } from 'eslint'
import { getFixtureDirectory } from './inferTestDirectory'
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
	// TODO probably accept base config here

	// TODOS
	// option support in fixtures (maybe)
	// expose raw serializer somehow for scoped mocking support
}

const __fixtures__ = '__fixtures__'
export function runFixture({
	rule,
	ruleName,
	fixtureDirectory = getFixtureDirectory(new Error('getFixtureDirectory')),
}: RunFixtureOptions) {
	const fixtureFile =
		findFixtureFile(ruleName, fixtureDirectory) ||
		findFixtureFile(ruleName, path.join(fixtureDirectory, __fixtures__))

	if (!fixtureFile) {
		throw new Error(getFixtureDirectoryError(ruleName, fixtureDirectory))
	}

	const fixtureSource = fs.readFileSync(fixtureFile, 'utf8').replace(/\r\n/g, '\n')
	const tests = parseFixture(fixtureSource, fixtureFile)
	tests.forEach((entry) => {
		test(entry.testName, async () => {
			const linter = new Linter({})
			linter.defineRule(ruleName, rule)
			const result = linter.verify(
				entry.testSource,
				{
					rules: {
						[ruleName]: 1 as const,
					},
					// TODO configurable
					parserOptions: {
						ecmaVersion: 2015,
						sourceType: 'module',
					},
				},
				entry.fileName
			)
			const serialized = serializeLintFailuresForSnapshot(result, entry.testSource)
			expect(serialized).toMatchSnapshot()
		})
	})
}

function findFixtureFile(ruleName: string, directory: string) {
	const foundFile = fs.readdirSync(directory).find((entry) => {
		const extension = path.extname(entry)
		const name = entry.replace(new RegExp(extension + '$'), '')
		return name === ruleName || name === ruleName + '.fixture'
	})

	if (foundFile) {
		return path.join(directory, foundFile)
	}
}

function getFixtureDirectoryError(ruleName: string, fixtureDirectory: string) {
	return `Could not find fixture for the rule ${ruleName}.
Looked for:
${ruleName}.fixture
${ruleName}.fixture.[any extension]

under the following directories:
${fixtureDirectory}
${path.join(fixtureDirectory, __fixtures__)}`
}

interface FixtureEntry {
	testName: string
	fileName: string
	testSource: string
}

const knownTags = ['test', 'filename'] as const
type KnownTags = typeof knownTags[number]

function parseFixture(fixtureContent: string, fixtureFileName: string) {
	const fixtureFile = path.basename(fixtureFileName)
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
					entry.fileName = instruction.name
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

function serializeLintFailuresForSnapshot(
	lintMessages: Linter.LintMessage[],
	lintedSource: string
) {
	const sourceLines = lintedSource.split('\n')
	const errorMatrix: string[][] = []
	const uniqueMessages: string[] = []

	lintMessages.forEach((lintMessage) => {
		// ESLint line & column are 1-indexed for better IDE integration, but 0 works
		// better for us here
		const startLine = lintMessage.line - 1
		const endLine = lintMessage.endLine == null ? startLine : lintMessage.endLine - 1
		const startColumn = lintMessage.column - 1
		const endColumn = lintMessage.endColumn == null ? startColumn : lintMessage.endColumn - 1

		let messageId = uniqueMessages.indexOf(lintMessage.message) + 1
		if (messageId === 0) {
			messageId = uniqueMessages.push(lintMessage.message)
		}

		let currentLine = startLine
		let currentColumn = startColumn
		do {
			if (!errorMatrix[currentLine]) {
				errorMatrix[currentLine] = sourceLines[currentLine]
					.split('')
					// need to preserve existing whitespace (tab characters) when allocating a new error line
					// to avoid indentation issues
					.map((char) => (/\s/.test(char) ? char : ' '))
			}

			const endColumnForThisLine =
				currentLine === endLine ? endColumn : sourceLines[currentLine].length

			do {
				errorMatrix[currentLine][currentColumn] = '~'
				currentColumn++
			} while (currentColumn < endColumnForThisLine)

			errorMatrix[currentLine].push(' ', '[', messageId.toString(), ']')
			currentLine++
			currentColumn = 0
		} while (currentLine < endLine + 1)
	})

	const interleaved = sourceLines.reduce<string[]>((result, nextLine, index) => {
		const errorLine = errorMatrix[index]
		if (errorLine) {
			return [...result, nextLine, errorLine.join('')]
		}
		return [...result, nextLine]
	}, [])

	interleaved.push(
		...uniqueMessages.map((errorMessage, index) => `[${index + 1}] ${errorMessage}`)
	)

	return interleaved.join('\n')
}

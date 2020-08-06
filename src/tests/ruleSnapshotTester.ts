import * as fs from 'fs'
import * as path from 'path'
import { Linter, Rule } from 'eslint'
const commentParser: typeof import('comment-parser') = require('comment-parser')

interface RunOptions {
	rule: Rule.RuleModule
	ruleName: string
	// TODO infer path from new Error().stack
	testDirectory: string
	// TODO probably accept base config here

	// TODOS
	// tab support in fixtures
	// option support in fixtures (maybe)
	// expose raw serializer somehow for scoped mocking support
	// remove tslib
	// set up CI
	// set up semantic release
}

export function run(options: RunOptions) {
	const fixtureFileName = fs.readdirSync(options.testDirectory).find((entry) => {
		const extension = path.extname(entry)
		const name = entry.replace(new RegExp(extension + '$'), '')
		return name === options.ruleName || name === options.ruleName + '.fixture'
	})

	if (!fixtureFileName) {
		console.warn('Could not find fixture')
		return
	}

	const fixtureSource = fs
		.readFileSync(path.join(options.testDirectory, fixtureFileName), 'utf8')
		.replace(/\r\n/g, '\n')
	const tests = parseFixture(fixtureSource, fixtureFileName)
	tests.forEach((entry) => {
		test(entry.testName, async () => {
			const linter = new Linter({})
			linter.defineRule(options.ruleName, options.rule)
			const result = linter.verify(
				entry.testSource,
				{
					rules: {
						[options.ruleName]: 1 as const,
					},
					// TODO configurable
					parserOptions: {
						ecmaVersion: 2015,
						sourceType: 'module',
					},
				},
				entry.fileName
			)
			const formatted = getSnapshottableOutput(result, entry.testSource)
			expect(formatted).toMatchSnapshot()
		})
	})
}

interface FixtureEntry {
	testName: string
	fileName: string
	testSource: string
}

const knownTags = ['test', 'filename'] as const
type KnownTags = typeof knownTags[number]

function parseFixture(fixtureContent: string, fixtureFileName: string) {
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
			fileName: fixtureFileName,
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

function getSnapshottableOutput(messages: Linter.LintMessage[], source: string) {
	const sourceLines = source.split('\n')
	const errorMatrix: string[][] = []
	const uniqueMessages: string[] = []
	messages.forEach((message) => {
		const startLine = message.line - 1
		const endLine = message.endLine == null ? startLine : message.endLine - 1
		const startColumn = message.column - 1
		const endColumn = message.endColumn == null ? startColumn : message.endColumn - 1

		let messageId = uniqueMessages.indexOf(message.message) + 1
		if (messageId === 0) {
			messageId = uniqueMessages.push(message.message)
		}

		let currentLine = startLine
		let currentColumn = startColumn
		do {
			if (!errorMatrix[currentLine]) {
				const sourceLineLength = sourceLines[currentLine].length
				// TODO for tab support, should fill in with matching whitespace from source line
				errorMatrix[currentLine] = Array(sourceLineLength).fill(' ')
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

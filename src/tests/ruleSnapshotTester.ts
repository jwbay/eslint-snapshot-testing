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

	// NEXT: attach error messages to squigglies
}

export function run(options: RunOptions) {
	const fixtureFileName = fs.readdirSync(options.testDirectory).find((entry) => {
		const extension = path.extname(entry)
		return (
			entry.startsWith(options.ruleName) &&
			(extension === '.fixture' || entry.replace(extension, '').endsWith('.fixture'))
		)
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
			const config = {
				rules: {
					[options.ruleName]: 1 as const,
				},
			}

			const result = linter.verify(entry.testSource, config, entry.fileName)
			const formatted = await getSnapshottableOutput(result, entry.fileName, entry.testSource)
			expect(formatted).toMatchSnapshot()
		})
	})
}

interface FixtureEntry {
	testName: string
	fileName: string
	testSource: string
}

function parseFixture(fixtureContent: string, fixtureFileName: string) {
	const jsDocRegex = /\/\*\*\s*\n*([^\*]|(\*(?!\/)))*\*\//gm
	const jsDocMarker = '/**<jsdoc>*/'
	const jsDocs: string[] = []
	const markedContent = fixtureContent.replace(jsDocRegex, (captured) => {
		jsDocs.push(captured)
		return jsDocMarker
	})

	let splitContent = markedContent.split(jsDocMarker)
	const fixtureStartedWithJSDoc = splitContent[0] === ''
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
			switch (instruction.tag?.toLowerCase()) {
				case 'test':
					entry.testName = instruction.name + ' ' + instruction.description
					continue
				case 'filename':
					entry.fileName = instruction.name
					continue
				default:
					console.warn(`Unrecognized tag ${instruction.tag} in fixture JSDoc`)
			}
		}

		return entry
	})

	return result
}

async function getSnapshottableOutput(
	messages: Linter.LintMessage[],
	filePath: string,
	source: string
) {
	const sourceLines = source.split('\n')
	const errorMatrix = [] as string[][]
	messages.forEach((message) => {
		let { line, column, endLine = line, endColumn = column } = message

		do {
			if (!errorMatrix[line]) {
				const sourceLineLength = sourceLines[line - 1].length
				errorMatrix[line] = Array(sourceLineLength).fill(' ')
			}

			do {
				errorMatrix[line][column - 1] = '~'
				column++
			} while (column < endColumn)
			line++
		} while (line < endLine)
	})

	const interleaved = sourceLines.reduce<string[]>((result, nextLine, index) => {
		const errorLine = errorMatrix[index + 1]
		if (errorLine) {
			return [...result, nextLine, errorLine.join('')]
		}
		return [...result, nextLine]
	}, [])

	return interleaved.join('\n')
}

import * as fs from 'fs'
import * as path from 'path'
import { Linter, Rule, ESLint } from 'eslint'
const commentParser: typeof import('comment-parser') = require('comment-parser')

interface RunOptions {
	rule: Rule.RuleModule
	ruleName: string
	// TODO infer path from new Error().stack
	testDirectory: string
	// TODO probably accept base config here

	// NEXT: squigglies
	// backwards: https://github.com/angular-eslint/angular-eslint/blob/5b66f671721d79a49f89c4f7507bbee81d87e1f1/packages/utils/src/test-helpers.ts#L127
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

	const sourceCode = fs.readFileSync(path.join(options.testDirectory, fixtureFileName), 'utf8')
	const tests = parseFixture(sourceCode, fixtureFileName)
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
			const formatted = await getSnapshottableOutput(
				result,
				fixtureFileName,
				entry.testSource
			)
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
	const formatter = await new ESLint({}).loadFormatter('codeframe')
	const lintResult: Partial<ESLint.LintResult> = {
		source,
		filePath,
		messages,
		errorCount: messages.length,
		warningCount: 0,
	}

	return formatter.format([lintResult as ESLint.LintResult])
}

function getTestDirectory() {
	// https://github.com/errwischt/stacktrace-parser/blob/4e4009800d2eb076393be696a5c57f7517da2027/src/stack-trace-parser.js#L123
	const { stack } = new Error()
	const callingEntry = stack!
		.split(path.sep)
		.slice(1)
		.find((line) => {
			// at getTestDirectory (C:\Source\eslint-misc-rules\src\tests\ruleSnapshotTester.ts:51:20)
			return !line.trim().endsWith(path.basename(__filename))
		})
	console.log(callingEntry)
}

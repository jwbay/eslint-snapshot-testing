import * as fs from 'fs'
import * as path from 'path'
import { Linter, Rule, ESLint } from 'eslint'

interface RunOptions {
	rule: Rule.RuleModule
	// TODO can infer this from new Error().stack ✨
	/** Pass in as __dirname from your test. The directory name is expected to match the rule name. */
	testDirectory: string
	// TODO probably accept base config here
}

export function run(options: RunOptions) {
	const ruleName = path.basename(options.testDirectory)
	const fixturesDirectory = options.testDirectory
	const fixtures = fs
		.readdirSync(fixturesDirectory)
		.filter((entry) => path.extname(entry) === '.fixture')

	if (fixtures.length === 0) {
		console.warn(`No fixtures found for ${fixturesDirectory}`)
	}

	for (const fixtureFileName of fixtures) {
		const testName = fixtureFileName.replace(path.extname(fixtureFileName), '')
		const sourceCode = fs.readFileSync(path.join(fixturesDirectory, fixtureFileName), 'utf8')

		it(`should lint correctly for ${testName}`, async () => {
			const linter = new Linter({})
			linter.defineRule(ruleName, options.rule)
			const config = {
				rules: {
					[ruleName]: 1 as const,
				},
			}

			const result = linter.verify(sourceCode, config, fixtureFileName)
			const formatted = await getSnapshottableOutput(result, fixtureFileName, sourceCode)
			if (testName === ruleName) {
				expect(formatted).toMatchSnapshot()
			} else {
				expect(formatted).toMatchSnapshot(testName)
			}
		})
	}
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

import { Linter, Rule } from 'eslint'
import { serializeLintResult } from './'
import { VariableDeclarator } from 'estree'

const processCwd = jest.spyOn(process, 'cwd')
const sourceCode = `\nconst foo = 'something';`
let consoleSpy: jest.SpyInstance

beforeEach(() => {
	consoleSpy?.mockRestore()
	processCwd.mockReturnValue('/cwd')
})

it('should surface fatal errors from eslint', () => {
	consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

	expect(() => {
		lint(sourceCode, { parser: 'this-parser-does-not-exist' })
	}).toThrowErrorMatchingInlineSnapshot(
		`"Encountered fatal error during lint execution: Configured parser 'this-parser-does-not-exist' was not found."`
	)

	expect(consoleSpy.mock.calls[0][0]).toMatchObject({
		ruleId: null,
		severity: 2,
		message: "Configured parser 'this-parser-does-not-exist' was not found.",
	})
})

describe('serializeLintResult supports per-test setup and mocking for lint rules', () => {
	test('should not have errors', () => {
		processCwd.mockReturnValue('/foo')
		expect(lint(sourceCode)).toMatchSnapshot()
	})

	test('should have errors', () => {
		processCwd.mockReturnValue('/bar')
		expect(lint(sourceCode)).toMatchSnapshot()
	})
})

function lint(source: string, config: Linter.Config = {}) {
	const linter = new Linter({})
	linter.defineRule('my-rule-name', testRule)
	const lintMessages = linter.verify(source, {
		...config,
		rules: { ['my-rule-name']: 'error' },
		parserOptions: {
			ecmaVersion: 2020,
		},
	})
	return serializeLintResult({
		lintedSource: source,
		lintMessages,
	})
}

const testRule: Rule.RuleModule = {
	create(context) {
		return {
			VariableDeclarator(node) {
				const variableDeclarator = node as VariableDeclarator

				if (
					variableDeclarator.id?.type === 'Identifier' &&
					variableDeclarator.id.name === 'foo' &&
					process.cwd().startsWith('/bar')
				) {
					context.report({
						loc: variableDeclarator.id.loc!,
						message:
							'variables named foo are not allowed when working directory is /bar',
					})
				}
			},
		}
	},
}

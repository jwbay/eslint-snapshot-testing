import { Linter, Rule } from 'eslint'
import { serializeLintResult } from './'
import { VariableDeclarator } from 'estree'

const processCwd = jest.spyOn(process, 'cwd')
const sourceCode = `\nconst foo = 'something';`

beforeEach(() => {
	processCwd.mockReturnValue('/cwd')
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

function lint(source: string) {
	const linter = new Linter({})
	linter.defineRule('my-rule-name', testRule)
	const lintMessages = linter.verify(source, {
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

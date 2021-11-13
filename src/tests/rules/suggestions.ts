import { Rule } from 'eslint'
import { VariableDeclarator } from 'estree'

export const noFooAllowed: Rule.RuleModule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		// @ts-ignore eslint@8 types don't exist yet
		hasSuggestions: true,
	},
	create(context) {
		return {
			VariableDeclarator(node) {
				const variableDeclarator = node as VariableDeclarator
				if (variableDeclarator.id?.type === 'Identifier') {
					const identifier = variableDeclarator.id
					const location = identifier.loc!
					const name = identifier.name
					const forbidden = name.toLowerCase().includes('foo')

					if (forbidden) {
						context.report({
							loc: location,
							message: "Variable names should not contain 'foo'",
							suggest: [
								{
									desc: `Replace 'foo' with 'bar' in '${name}'`,
									fix: (fixer) => {
										const fixedName = name.includes('Foo')
											? name.replace('Foo', 'Bar')
											: name.replace('foo', 'bar')
										return fixer.replaceText(identifier, fixedName)
									},
								},
								{
									desc: `Replace 'foo' with 'baz' in '${name}'`,
									fix: (fixer) => {
										const fixedName = name.includes('Foo')
											? name.replace('Foo', 'Baz')
											: name.replace('foo', 'baz')
										return fixer.replaceText(identifier, fixedName)
									},
								},
							],
						})
					}
				}
			},
		}
	},
}

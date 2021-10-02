import { Rule } from 'eslint'
import { ClassDeclaration, Identifier, SourceLocation, VariableDeclarator } from 'estree'

export const noFooAllowed: Rule.RuleModule = {
	meta: {
		type: 'problem',
		fixable: 'code',
		messages: {
			noFooClasses: "class name '{{name}}' should not include '{{forbidden}}'.",
			noFooVars: "variable name '{{name}}' should not include '{{forbidden}}'.",
		},
	},
	create(context) {
		if (context.getFilename().includes('spec')) {
			return {}
		}

		const denyList: string[] = context.options?.[0]?.forbidden ?? ['foo']
		const misbehavingFix = context.options?.[0]?.badFix ?? false
		return {
			ClassDeclaration(node) {
				const classDeclaration = node as ClassDeclaration
				if (classDeclaration.id?.type === 'Identifier') {
					checkIdentifier(classDeclaration.id, classDeclaration.loc!, 'noFooClasses')
				}
			},
			VariableDeclarator(node) {
				const variableDeclarator = node as VariableDeclarator
				if (variableDeclarator.id?.type === 'Identifier') {
					checkIdentifier(variableDeclarator.id, variableDeclarator.id.loc!, 'noFooVars')
				}
			},
		}

		function checkIdentifier(
			identifier: Identifier,
			location: SourceLocation,
			messageId: string
		) {
			const name = identifier.name
			const forbidden = denyList.find((forbidden) => name.toLowerCase().includes(forbidden))
			if (forbidden) {
				context.report({
					loc: location,
					messageId: messageId,
					data: { name, forbidden },
					fix: (fixer) => {
						const fixedName = name.includes('Foo')
							? name.replace('Foo', misbehavingFix ? 'FooBar' : 'Bar')
							: name.replace('foo', misbehavingFix ? 'foobar' : 'bar')
						return fixer.replaceText(identifier, fixedName)
					},
				})
			}
		}
	},
}

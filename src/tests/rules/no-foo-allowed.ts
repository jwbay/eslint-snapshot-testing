import { Rule } from 'eslint'
import { ClassDeclaration, VariableDeclarator } from 'estree'

export const noFooAllowed: Rule.RuleModule = {
	meta: {
		type: 'problem',
		messages: {
			noFooClasses: "class name '{{name}}' should not include foo.",
			noFooVars: "variable name '{{name}}' should not include foo.",
		},
	},
	create(context) {
		return {
			ClassDeclaration(node) {
				const classDeclaration = node as ClassDeclaration

				if (
					classDeclaration.id?.type === 'Identifier' &&
					classDeclaration.id.name.toLowerCase().includes('foo')
				) {
					const name = classDeclaration.id.name
					context.report({
						loc: classDeclaration.loc!,
						messageId: 'noFooClasses',
						data: { name },
					})
				}
			},
			VariableDeclarator(node) {
				const variableDeclarator = node as VariableDeclarator

				if (
					variableDeclarator.id?.type === 'Identifier' &&
					variableDeclarator.id.name.toLowerCase().includes('foo')
				) {
					const name = variableDeclarator.id.name
					context.report({
						loc: variableDeclarator.loc!,
						messageId: 'noFooVars',
						data: { name },
					})
				}
			},
		}
	},
}

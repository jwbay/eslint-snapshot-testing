import { Rule } from 'eslint'
import { ClassDeclaration, VariableDeclarator } from 'estree'

export const noFooAllowed: Rule.RuleModule = {
	meta: {
		type: 'problem',
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
		return {
			ClassDeclaration(node) {
				const classDeclaration = node as ClassDeclaration

				if (classDeclaration.id?.type === 'Identifier') {
					const checkedName = classDeclaration.id.name.toLowerCase()
					const forbidden = denyList.find((forbidden) => checkedName.includes(forbidden))
					if (forbidden) {
						const name = classDeclaration.id.name
						context.report({
							loc: classDeclaration.loc!,
							messageId: 'noFooClasses',
							data: { name, forbidden },
						})
					}
				}
			},
			VariableDeclarator(node) {
				const variableDeclarator = node as VariableDeclarator

				if (variableDeclarator.id?.type === 'Identifier') {
					const checkedName = variableDeclarator.id.name.toLowerCase()
					const forbidden = denyList.find((forbidden) => checkedName.includes(forbidden))
					if (forbidden) {
						const name = variableDeclarator.id.name
						context.report({
							loc: variableDeclarator.id.loc!,
							messageId: 'noFooVars',
							data: { name, forbidden },
						})
					}
				}
			},
		}
	},
}

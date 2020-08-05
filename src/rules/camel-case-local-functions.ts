import type { Rule } from 'eslint'
import type { CallExpression } from 'estree'

const rule: Rule.RuleModule = {
	meta: {
		type: 'layout',
		schema: [], // no options
	},
	create(context) {
		if (context.getFilename().endsWith('.tsx')) {
			return {}
		}

		return {
			CallExpression(node) {
				const callExpression = node as CallExpression
				if (
					callExpression.callee.type === 'Identifier' &&
					callExpression.callee.name[0] !== callExpression.callee.name[0].toLowerCase()
				) {
					context.report({
						loc: callExpression.callee.loc!,
						message: 'local function names should be camelCase',
					})
				}
			},
		}
	},
}

export default rule

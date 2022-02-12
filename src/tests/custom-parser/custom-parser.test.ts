import { runLintFixtureTests } from '../../ruleSnapshotTester'
import { noFooAllowed } from '../rules/no-foo-allowed'

runLintFixtureTests({
	rule: noFooAllowed,
	ruleName: 'custom-parser',
	eslintConfig: {
		parser: '@typescript-eslint/parser',
	},
})

import { runLintFixtureTests } from '../ruleSnapshotTester'
import { noFooAllowed } from './rules/no-foo-allowed'

runLintFixtureTests({
	rule: noFooAllowed,
	ruleName: 'error-spans-tab-support',
})

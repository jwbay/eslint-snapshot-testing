import { runLintFixtureTests } from '../../ruleSnapshotTester'
import { noFooAllowed } from '../rules/no-foo-allowed'

runLintFixtureTests({
	rule: noFooAllowed,
	ruleName: 'parse-errors',
})

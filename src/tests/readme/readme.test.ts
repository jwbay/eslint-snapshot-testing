import { runLintFixtureTests } from '../../ruleSnapshotTester'
import { noFooAllowed } from '../rules/no-foo-allowed'

// will generate and run tests for you
runLintFixtureTests({
	rule: noFooAllowed,
	ruleName: 'readme',
})

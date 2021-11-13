import { runLintFixtureTests } from '../../ruleSnapshotTester'
import { noFooAllowed } from '../rules/suggestions'

runLintFixtureTests({
	rule: noFooAllowed,
	ruleName: 'suggestions',
})

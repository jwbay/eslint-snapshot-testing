import { runLintFixtureTests } from '../../ruleSnapshotTester'
import rule from '../rules/camel-case-local-functions'

runLintFixtureTests({
	rule,
	ruleName: 'fixture-starting-with-whitespace',
})

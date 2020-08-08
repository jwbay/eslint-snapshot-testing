import { runLintFixtureTests } from '../ruleSnapshotTester'
import rule from './rules/camel-case-local-functions'

runLintFixtureTests({
	rule,
	ruleName: 'split-fixtures',
})

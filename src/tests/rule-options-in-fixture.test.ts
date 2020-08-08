import { runLintFixtureTests } from '../ruleSnapshotTester'
import { noRestrictedImports } from './rules/no-restricted-imports'

runLintFixtureTests({
	rule: noRestrictedImports,
	ruleName: 'rule-options-in-fixture',
})

import { runFixture } from '../ruleSnapshotTester'
import { noRestrictedImports } from './rules/no-restricted-imports'

runFixture({
	rule: noRestrictedImports,
	ruleName: 'rule-options-in-fixture',
})

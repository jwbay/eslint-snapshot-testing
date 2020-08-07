import { run } from './ruleSnapshotTester'
import { noFooAllowed } from '../rules/no-foo-allowed'

run({
	rule: noFooAllowed,
	ruleName: 'error-spans-tab-support',
	testDirectory: __dirname,
})

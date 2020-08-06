import { run } from './ruleSnapshotTester'
import { noFooAllowed } from '../rules/no-foo-allowed'

run({
	rule: noFooAllowed,
	ruleName: 'error-spans',
	testDirectory: __dirname,
})

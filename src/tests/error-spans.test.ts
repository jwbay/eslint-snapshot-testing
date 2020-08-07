import { runFixture } from '../ruleSnapshotTester'
import { noFooAllowed } from './rules/no-foo-allowed'

runFixture({
	rule: noFooAllowed,
	ruleName: 'error-spans',
	testDirectory: __dirname,
})

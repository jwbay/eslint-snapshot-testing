import { run } from './ruleSnapshotTester'
import rule from '../rules/camel-case-local-functions'

run({
	rule,
	ruleName: 'fixture-starting-with-whitespace',
	testDirectory: __dirname,
})

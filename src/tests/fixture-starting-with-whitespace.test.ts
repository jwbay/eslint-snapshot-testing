import { runFixture } from '../ruleSnapshotTester'
import rule from './rules/camel-case-local-functions'

runFixture({
	rule,
	ruleName: 'fixture-starting-with-whitespace',
})

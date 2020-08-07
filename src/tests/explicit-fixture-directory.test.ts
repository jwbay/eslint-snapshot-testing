import { runFixture } from '../ruleSnapshotTester'
import rule from './rules/camel-case-local-functions'
import { join } from 'path'

runFixture({
	rule,
	ruleName: 'explicit-fixture-directory',
	fixtureDirectory: join(__dirname, 'custom-fixture-directory'),
})

jest.mock('path', (): typeof import('path') => {
	const realPath = jest.requireActual('path')
	return {
		...realPath,
		isAbsolute: jest.fn(),
		dirname: jest.fn(),
	}
})

import { getFixtureDirectory } from './inferTestDirectory'
import * as path from 'path'

const absoluteMock = path.isAbsolute as jest.Mock
const dirnameMock = path.dirname as jest.Mock
const expectedError = /could not determine test directory/i

beforeEach(() => {
	// implementations varies across operating systems
	absoluteMock.mockReturnValue(true)
	dirnameMock.mockReturnValue('<unknown>')
})

it('should parse the calling test name from a stacktrace for windows', () => {
	const error = new Error('test')

	error.stack = `Error: test
    at runFixture (X:\\rootdir\\src\\ruleSnapshotTester.ts:26:41)
    at Object.<anonymous> (X:\\rootdir\\src\\tests\\error-spans.test.ts:4:1)
    at Runtime._execModule (X:\\rootdir\\node_modules\\jest-runtime\\build\\index.js:1217:24)`

	dirnameMock.mockImplementation((path) => {
		if (path.includes('error-spans.test')) {
			return 'X:\\rootdir\\src\\tests'
		}
	})

	expect(getFixtureDirectory(error)).toBe('X:\\rootdir\\src\\tests')
})

it('should parse the calling test name from a stacktrace for a unixy OS', () => {
	const error = new Error('test')

	error.stack = `Error: test
    at runFixture (/x/rootdir/src/ruleSnapshotTester.ts:26:41)
    at Object.<anonymous> (/x/rootdir/src/tests/error-spans.test.ts:4:1)
    at Runtime._execModule (/x/rootdir/node_modules/jest-runtime/build/index.js:1217:24)`

	dirnameMock.mockImplementation((path) => {
		if (path.includes('error-spans.test')) {
			return '/x/rootdir/src/tests'
		}
	})

	expect(getFixtureDirectory(error)).toBe('/x/rootdir/src/tests')
})

it('should error if path is determined not to be absolute', () => {
	const error = new Error('test')

	error.stack = `Error: test
    at runFixture (X:\\rootdir\\src\\ruleSnapshotTester.ts:26:41)
    at Object.<anonymous> (X:\\rootdir\\src\\tests\\error-spans.test.ts:4:1)
    at Runtime._execModule (X:\\rootdir\\node_modules\\jest-runtime\\build\\index.js:1217:24)`

	dirnameMock.mockImplementation((path) => {
		if (path.includes('error-spans.test')) {
			return 'X:\\rootdir\\src\\tests'
		}
	})

	absoluteMock.mockReturnValue(false)

	expect(() => getFixtureDirectory(error)).toThrowError(expectedError)
})

import * as path from 'path'

export function getFixtureDirectory(error: Error) {
	const fixtureDirectoryError =
		'Could not determine test directory for fixtures. Pass `fixtureDirectory: __dirname` explicitly.'

	if (!error.stack) {
		throw new Error(fixtureDirectoryError)
	}

	const trace = parseNodeStacktrace(error.stack)
	const callingFile = trace[1]?.file
	if (!callingFile) {
		throw new Error(fixtureDirectoryError)
	}

	if (!path.isAbsolute(callingFile)) {
		throw new Error(fixtureDirectoryError)
	}

	return path.dirname(callingFile)
}

// From https://github.com/errwischt/stacktrace-parser, which has dependencies we don't want
function parseNodeStacktrace(stackString: string) {
	interface ParsedLine {
		file: string
		methodName: string
		lineNumber: number
		column: number | null
	}

	const nodeRe = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i
	const lines = stackString.split('\n')
	return lines.reduce<ParsedLine[]>((stack, line) => {
		const parseResult = parse(line)

		if (parseResult) {
			stack.push(parseResult)
		}

		return stack
	}, [])

	function parse(line: string): ParsedLine | null {
		const parts = nodeRe.exec(line)

		if (!parts) {
			return null
		}

		return {
			file: parts[2],
			methodName: parts[1] || '<unknown>',
			lineNumber: +parts[3],
			column: parts[4] ? +parts[4] : null,
		}
	}
}

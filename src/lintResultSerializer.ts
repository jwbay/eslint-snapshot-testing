import type { Linter } from 'eslint'

interface SerializeOptions {
	lintedSource: string
	lintMessages: Linter.LintMessage[]
}

/**
 * Serializes the results from calling the ESLint `verify` API into a snapshot-friendly
 * format. This is **not** needed when using `runLintFixtureTests`. Instead, this can be
 * used when full control is needed over test cases, e.g. for per-test setup or mocking.
 *
 * @example
 * import myCustomRule from '../my-custom-eslint-rule';
 * import someFunction from '../helpers/someFunction';
 * import { serializeLintResult } from 'eslint-rule-snapshot-testing';
 * import { Linter } from 'eslint';
 *
 * test('when someFunction is false', () => {
 *   someFunction.mockReturnValue(false);
 *   const source = "// source code to be linted";
 *   const esLintResult = lint(source);
 *   const serializedResult = serializeLintResult({ lintedSource: source, lintMessages: esLintResult });
 *   expect(serializedResult).toMatchSnapshot();
 * });
 *
 * test('when someFunction is true', () => {
 *   someFunction.mockReturnValue(true);
 *   ...
 * });
 *
 * function lint(source) {
 *   const linter = new Linter({});
 *   linter.defineRule('my-rule-name', myCustomRule);
 *   return linter.verify(source, { rules: { ['my-rule-name']: 'error' } });
 * }
 */
export function serializeLintResult({ lintedSource, lintMessages }: SerializeOptions) {
	const sourceLines = lintedSource.split(/\r?\n/)
	const errorLines = new Map<number, string[][]>()
	const uniqueMessages: string[] = []

	lintMessages.forEach((lintMessage) => {
		checkFatalError(lintMessage)

		// ESLint line & column are 1-indexed for better IDE integration, but 0 works
		// better for us here
		const startLine = lintMessage.line - 1
		const endLine = lintMessage.endLine == null ? startLine : lintMessage.endLine - 1
		const startColumn = lintMessage.column - 1
		const endColumn = lintMessage.endColumn == null ? startColumn : lintMessage.endColumn - 1

		let messageId = uniqueMessages.indexOf(lintMessage.message) + 1
		if (messageId === 0) {
			messageId = uniqueMessages.push(lintMessage.message)
		}

		let currentLine = startLine
		let currentColumn = startColumn
		do {
			const currentErrorLine = Array.from(sourceLines[currentLine]).map((char) => {
				// need to preserve existing whitespace (tab characters) when allocating a new error line
				// to avoid indentation issues
				return isWhitespace(char) ? char : ' '
			})

			const endColumnForThisLine =
				currentLine === endLine ? endColumn : sourceLines[currentLine].length

			do {
				currentErrorLine[currentColumn] = '~'
				currentColumn++
			} while (currentColumn < endColumnForThisLine)

			currentErrorLine[currentColumn++] = ' '
			currentErrorLine[currentColumn++] = '['
			currentErrorLine[currentColumn++] = messageId.toString()
			currentErrorLine[currentColumn++] = ']'

			const allErrorsOnThisLine = errorLines.get(currentLine) ?? []
			allErrorsOnThisLine.push(currentErrorLine)
			errorLines.set(currentLine, allErrorsOnThisLine)

			currentLine++
			currentColumn = 0
		} while (currentLine < endLine + 1)
	})

	const interleaved = sourceLines.reduce<string[]>((result, nextLine, index) => {
		const errorLineSet = errorLines.get(index)
		if (errorLineSet) {
			const collapsed = collapseErrorLines(errorLineSet)
			result.push(nextLine, ...collapsed.map((line) => line.join('')))
		} else {
			result.push(nextLine)
		}

		return result
	}, [])

	interleaved.push(
		...uniqueMessages.map((errorMessage, index) => `[${index + 1}] ${errorMessage}`)
	)

	return interleaved.join('\n')
}

function checkFatalError(lintMessage: Linter.LintMessage) {
	// Allow parsing errors (indicated by non-zero coordinates) to show in the snapshot
	// instead of throwing a hard error, but something like a misconfigured parser or
	// missing rule should throw
	if (lintMessage.fatal && lintMessage.line === 0 && lintMessage.column === 0) {
		console.error(lintMessage)
		throw new Error(`Encountered fatal error during lint execution: ${lintMessage.message}`)
	}
}

function collapseErrorLines(allErrorLines: string[][]) {
	let [mainLine, ...rest] = allErrorLines
	const collidedErrorLines: string[][] = []

	nextLine: for (const errorLine of rest) {
		const mergedLine = [...mainLine]
		for (let column = 0; column < errorLine.length; column++) {
			const currentCharacter = errorLine[column]
			const collision = !isWhitespace(mainLine[column]) && !isWhitespace(currentCharacter)
			if (collision) {
				collidedErrorLines.push(errorLine)
				continue nextLine
			}

			mergedLine[column] = isWhitespace(currentCharacter)
				? mergedLine[column]
				: currentCharacter
		}

		mainLine = mergedLine
	}

	return [mainLine, ...collidedErrorLines]
}

function isWhitespace(char: string) {
	return !char || !char.trim()
}

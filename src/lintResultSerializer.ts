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
 * import { serializeLintResult } from 'eslint-snapshot-rule-tester';
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
	const sourceLines = lintedSource.split('\n')
	const errorMatrix: string[][] = []
	const uniqueMessages: string[] = []

	lintMessages.forEach((lintMessage) => {
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
			if (!errorMatrix[currentLine]) {
				errorMatrix[currentLine] = sourceLines[currentLine]
					.split('')
					// need to preserve existing whitespace (tab characters) when allocating a new error line
					// to avoid indentation issues
					.map((char) => (/\s/.test(char) ? char : ' '))
			}

			const endColumnForThisLine =
				currentLine === endLine ? endColumn : sourceLines[currentLine].length

			do {
				errorMatrix[currentLine][currentColumn] = '~'
				currentColumn++
			} while (currentColumn < endColumnForThisLine)

			errorMatrix[currentLine].push(' ', '[', messageId.toString(), ']')
			currentLine++
			currentColumn = 0
		} while (currentLine < endLine + 1)
	})

	const interleaved = sourceLines.reduce<string[]>((result, nextLine, index) => {
		const errorLine = errorMatrix[index]
		if (errorLine) {
			return [...result, nextLine, errorLine.join('')]
		}
		return [...result, nextLine]
	}, [])

	interleaved.push(
		...uniqueMessages.map((errorMessage, index) => `[${index + 1}] ${errorMessage}`)
	)

	return interleaved.join('\n')
}

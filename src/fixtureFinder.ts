import * as fs from 'fs'
import * as path from 'path'

const __fixtures__ = '__fixtures__'

export function findFixtureFile(ruleName: string, fixtureDirectory: string) {
	const fixtureFile =
		searchForFixture(ruleName, fixtureDirectory) ||
		searchForFixture(ruleName, path.join(fixtureDirectory, __fixtures__))

	if (!fixtureFile) {
		throw new Error(getFixtureDirectoryError(ruleName, fixtureDirectory))
	}

	return fixtureFile
}

function searchForFixture(ruleName: string, directory: string) {
	let foundFile

	try {
		foundFile = fs.readdirSync(directory).find((entry) => {
			const extension = path.extname(entry)
			const name = entry.replace(new RegExp(extension + '$'), '')
			return name === ruleName || name === ruleName + '.fixture'
		})
	} catch (e) {
		const missingDirectory = (e as NodeJS.ErrnoException)?.code === 'ENOENT'
		if (!missingDirectory) {
			throw e
		}
	}

	if (foundFile) {
		return path.join(directory, foundFile)
	}
}

function getFixtureDirectoryError(ruleName: string, fixtureDirectory: string) {
	return `Could not find fixture for the rule ${ruleName}.
Looked for:
${ruleName}.fixture
${ruleName}.fixture.[any extension]

under the following directories:
${fixtureDirectory}
${path.join(fixtureDirectory, __fixtures__)}`
}

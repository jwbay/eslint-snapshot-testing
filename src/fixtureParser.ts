import * as path from 'path'
import type { Tag } from 'comment-parser'

const commentParser: typeof import('comment-parser') = require('comment-parser')

interface FixtureEntry {
	testName: string
	fileName: string
	testSource: string
	ruleOptions?: any[]
}

const knownTags = ['test', 'filename', 'ruleOptions'] as const
type KnownTags = typeof knownTags[number]

export function parseFixture(fixtureContent: string, fixturePath: string) {
	const fixtureFile = path.basename(fixturePath)
	const jsDocRegex = /\/\*\*\s*\n*([^\*]|(\*(?!\/)))*\*\//gm
	const jsDocMarker = '/**<jsdoc>*/'
	const jsDocs: string[] = []
	const markedContent = fixtureContent.replace(jsDocRegex, (captured) => {
		jsDocs.push(captured)
		return jsDocMarker
	})

	let splitContent = markedContent.split(jsDocMarker)
	const fixtureStartedWithJSDoc = splitContent[0].trim() == ''
	if (fixtureStartedWithJSDoc) {
		splitContent = splitContent.slice(1)
	} else {
		jsDocs.unshift('/** @test should lint correctly */')
	}

	const result = splitContent.map<FixtureEntry>((testSourceCode, index) => {
		const jsdoc = jsDocs[index]
		const parsedBlock = commentParser(jsdoc)[0]
		const entry: FixtureEntry = {
			testSource: testSourceCode,
			testName: 'should lint correctly',
			fileName: fixtureFile,
		}

		for (const instruction of parsedBlock.tags) {
			const tag = instruction.tag?.toLowerCase() as KnownTags
			switch (tag) {
				case 'test':
					entry.testName = instruction.name + ' ' + instruction.description
					continue
				case 'filename':
					entry.fileName = instruction.name + ' ' + instruction.description
					entry.fileName = entry.fileName.trim()
					continue
				case 'ruleoptions' as string:
					entry.ruleOptions = parseRuleOptionsFromJSDoc(instruction)
					continue
				default:
					const supported = knownTags.join(', ')
					console.warn(
						`Unrecognized tag '@${instruction.tag}' in fixture JSDoc. Supported tags: ${supported}`
					)
			}
		}

		return entry
	})

	return result
}

function parseRuleOptionsFromJSDoc(instruction: Tag) {
	// comment-parser strips wrapping array brackets, but we need them preserved (and required)
	// to avoid ambiguity. ESLint config allows 'spread' options for rules, e.g.:
	// 	my-rule: ['error', 'something', 'something else']
	// but it also supports arrays as a single option, e.g.:
	// 	my-rule: ['error', ['something', 'something else']]
	const ruleOptionSource = instruction.source.replace('@' + instruction.tag, '').trim()
	let parsedOptions: any[]
	try {
		parsedOptions = JSON.parse(ruleOptionSource)
	} catch (parseError) {
		console.warn(`
Could not parse option JSON from fixture.
Source:
${ruleOptionSource}
`)
		throw parseError
	}

	if (!Array.isArray(parsedOptions)) {
		const typeName = getTypeName(parsedOptions).toLowerCase()
		throw new Error(`Rule options are required to be an array to avoid ambiguity.
Received type: ${typeName}

For this example ESLint rule configuration:
    my-rule-name: ["error", "first configuration value", { otherConfig: 42 }]
the corresponding JSDoc entry should be:
	/** @ruleOptions ["first configuration value", { otherConfig: 42 }] */

Or for this example configuration:
    my-other-rule-name: ["error", ["first", "second"]]
the corresponding JSDoc entry should be:
    /** @ruleOptions [["first", "second"]]
`)
	}

	return parsedOptions
}

function getTypeName(object: any) {
	const fullName: string = Object.prototype.toString.call(object)
	return fullName.split(' ')[1].slice(0, -1)
}

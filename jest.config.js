/** @type {import('@jest/types').Config.GlobalConfig} */
module.exports = {
	testMatch: ['<rootDir>/src/**/*.test.ts'],
	collectCoverageFrom: ['src/*.ts'],
	coverageReporters: ['html', 'text-summary'],
}

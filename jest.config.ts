import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'jsdom',
	testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				useESM: false,
				tsconfig: 'tsconfig.json'
			}
		]
	},
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1'
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80
		}
	}
};

export default config;

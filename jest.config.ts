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
	moduleFileExtensions: ['ts', 'js', 'json']
};

export default config;

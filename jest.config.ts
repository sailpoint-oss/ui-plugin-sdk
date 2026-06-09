import type { Config } from 'jest';

const config: Config = {
	projects: [
		{
			displayName: 'plugin-cli',
			rootDir: '<rootDir>/packages/plugin-cli',
			testEnvironment: 'node',
			testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
			transform: {
				'^.+\\.ts$': [
					'ts-jest',
					{
						useESM: false,
						tsconfig: '<rootDir>/tsconfig.jest.json'
					}
				]
			},
			moduleFileExtensions: ['ts', 'js', 'json']
		},
		{
			displayName: 'ui-plugin-sdk',
			rootDir: '<rootDir>/packages/ui-plugin-sdk',
			testEnvironment: 'jsdom',
			testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
			transform: {
				'^.+\\.ts$': [
					'ts-jest',
					{
						useESM: false,
						tsconfig: '<rootDir>/tsconfig.json'
					}
				]
			},
			moduleFileExtensions: ['ts', 'js', 'json']
		}
	]
};

export default config;

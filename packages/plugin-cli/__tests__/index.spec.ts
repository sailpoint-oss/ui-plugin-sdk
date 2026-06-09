import { VERSION } from '../src/index';

describe('@sailpoint/plugin-cli', () => {
	it('should export VERSION', () => {
		expect(VERSION).toBe('0.0.0');
	});
});

import { VERSION } from '../src/index';

describe('@sailpoint/ui-plugin-sdk', () => {
	it('should export VERSION', () => {
		expect(VERSION).toBe('0.0.0');
	});
});

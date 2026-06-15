import { PluginRuntimeClient, RuntimeEngine, VERSION } from '../src/index';

describe('@sailpoint/ui-plugin-sdk', () => {
	it('should export VERSION', () => {
		expect(VERSION).toBe('0.0.0');
	});

	it('should export runtime classes', () => {
		expect(PluginRuntimeClient).toBeDefined();
		expect(RuntimeEngine).toBeDefined();
	});
});

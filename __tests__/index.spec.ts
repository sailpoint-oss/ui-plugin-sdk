import * as sdk from '../src/index';

describe('@sailpoint/ui-plugin-sdk', () => {
	it('should export VERSION', () => {
		expect(sdk.VERSION).toBe('0.0.0');
	});

	it('should expose plugin-facing API surface only', () => {
		expect(sdk.createSDK).toBeDefined();
		expect('RuntimeEngine' in sdk).toBe(false);
		expect('RuntimeHandshake' in sdk).toBe(false);
		expect('InternalSailPointPluginSDK' in sdk).toBe(false);
	});
});

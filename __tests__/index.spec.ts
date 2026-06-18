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

	it('should not expose initialize on created SDK', () => {
		const createdSdk = sdk.createSDK({
			targetOrigin: 'https://plugins.sailpoint.test',
			targetWindow: {
				postMessage: () => undefined
			},
			sourceWindow: {
				addEventListener: () => undefined,
				removeEventListener: () => undefined
			}
		});

		expect('initialize' in createdSdk).toBe(false);
	});
});

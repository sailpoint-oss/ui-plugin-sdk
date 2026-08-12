import * as sdk from '../src/index';
import { resolveTargetOrigin } from '../src/runtime/target-origin';

const setAncestorOrigins = (origins: string[] | undefined): void => {
	Object.defineProperty(window.location, 'ancestorOrigins', {
		configurable: true,
		value: origins
	});
};

const setReferrer = (referrer: string): void => {
	Object.defineProperty(document, 'referrer', {
		configurable: true,
		value: referrer
	});
};

describe('@sailpoint/ui-plugin-sdk', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/');
		setAncestorOrigins([]);
		setReferrer('');
	});

	it('should export VERSION', () => {
		expect(sdk.VERSION).toBe('0.0.0');
	});

	it('should export ApiError for consumer instanceof narrowing', () => {
		const body = { messages: [{ text: 'Not found' }] };
		const error = new sdk.ApiError({
			status: 404,
			statusText: 'Not Found',
			path: '/v3/accounts/missing',
			body
		});

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(sdk.ApiError);
		expect(error).toMatchObject({
			name: 'ApiError',
			message: 'API request failed with status 404 Not Found.',
			status: 404,
			statusText: 'Not Found',
			path: '/v3/accounts/missing',
			body
		});
	});

	it('should expose plugin-facing API surface only', () => {
		expect(sdk.createSDK).toBeDefined();
		expect('RuntimeEngine' in sdk).toBe(false);
		expect('RuntimeHandshake' in sdk).toBe(false);
		expect('InternalSailPointPluginSDK' in sdk).toBe(false);
		expect('mockSdkContext' in sdk).toBe(false);
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

	it('should preserve an explicit targetOrigin override', () => {
		window.history.replaceState({}, '', '/?parentOrigin=https%3A%2F%2Fquery.example.com');
		setAncestorOrigins(['https://ancestor.example.com']);

		expect(resolveTargetOrigin('https://override.example.com')).toBe('https://override.example.com');
		expect(() => sdk.createSDK({ targetOrigin: 'https://override.example.com' })).not.toThrow();
	});

	it('should create an SDK without config by resolving the parentOrigin query parameter', () => {
		window.history.replaceState({}, '', '/?parentOrigin=https%3A%2F%2Facme.identitynow.com');

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
		expect(() => sdk.createSDK()).not.toThrow();
	});

	it('should prefer parentOrigin over the document referrer', () => {
		window.history.replaceState({}, '', '/?parentOrigin=https%3A%2F%2Facme.identitynow.com');
		setReferrer('https://referrer.example.com/ui/page');

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
	});

	it('should resolve parentOrigin when ancestorOrigins is unavailable', () => {
		window.history.replaceState({}, '', '/?parentOrigin=https%3A%2F%2Facme.identitynow.com');
		setAncestorOrigins(undefined);

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
	});

	it('should decode a base64-wrapped parentOrigin query parameter', () => {
		const encodedOrigin = btoa('http://localhost:3000');
		window.history.replaceState({}, '', `/?parentOrigin=b64-${encodedOrigin}`);

		expect(resolveTargetOrigin()).toBe('http://localhost:3000');
	});

	it('should reject a malformed base64 parentOrigin query parameter', () => {
		window.history.replaceState({}, '', '/?parentOrigin=b64-not-valid-base64!');

		expect(() => resolveTargetOrigin()).toThrow('must contain a valid HTTP(S) URL');
	});

	it('should reject a non-HTTP parentOrigin query parameter', () => {
		window.history.replaceState({}, '', '/?parentOrigin=javascript%3Aalert%281%29');

		expect(() => resolveTargetOrigin()).toThrow('must contain a valid HTTP(S) URL');
	});

	it('should reject a malformed parentOrigin query parameter', () => {
		window.history.replaceState({}, '', '/?parentOrigin=not-a-url');

		expect(() => resolveTargetOrigin()).toThrow('must contain a valid HTTP(S) URL');
	});

	it('should use the browser ancestor origin when it agrees with parentOrigin', () => {
		window.history.replaceState({}, '', '/?parentOrigin=https%3A%2F%2Facme.identitynow.com');
		setAncestorOrigins(['https://acme.identitynow.com']);

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
	});

	it('should reconcile normalized query and browser ancestor origins', () => {
		window.history.replaceState({}, '', '/?parentOrigin=https%3A%2F%2FACME.identitynow.com%3A443%2Fplugin%2Fpage');
		setAncestorOrigins(['https://acme.identitynow.com']);

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
	});

	it('should use the browser ancestor origin when parentOrigin is absent', () => {
		setAncestorOrigins(['https://acme.identitynow.com']);

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
	});

	it('should prefer the browser ancestor origin over the document referrer', () => {
		setAncestorOrigins(['https://acme.identitynow.com']);
		setReferrer('https://referrer.example.com/ui/page');

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
	});

	it('should reject conflicting query and browser ancestor origins', () => {
		window.history.replaceState({}, '', '/?parentOrigin=https%3A%2F%2Facme.identitynow.com');
		setAncestorOrigins(['https://evil.example.com']);

		expect(() => resolveTargetOrigin()).toThrow('does not match the browser ancestor origin');
	});

	it('should fall back to the document referrer origin', () => {
		setReferrer('https://acme.identitynow.com/ui/page');

		expect(resolveTargetOrigin()).toBe('https://acme.identitynow.com');
		expect(() => sdk.createSDK()).not.toThrow();
	});

	it('should reject an unusable document referrer', () => {
		setReferrer('about:blank');

		expect(() => resolveTargetOrigin()).toThrow('document.referrer must contain a valid HTTP(S) URL');
	});

	it('should throw an actionable error when no origin is available', () => {
		expect(() => sdk.createSDK()).toThrow('Open the plugin inside ISC via ?spPluginDev=<alias>');
	});

	it('should throw a clear error outside a browser', () => {
		const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined
		});

		try {
			expect(() => sdk.createSDK()).toThrow(
				'Unable to resolve App Shell origin outside a browser. Pass config.targetOrigin explicitly.'
			);
		} finally {
			if (windowDescriptor) {
				Object.defineProperty(globalThis, 'window', windowDescriptor);
			}
		}
	});

	it('should require an explicit origin when document is unavailable', () => {
		const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
		Object.defineProperty(globalThis, 'document', {
			configurable: true,
			value: undefined
		});

		try {
			expect(() => sdk.createSDK()).toThrow(
				'Unable to resolve App Shell origin outside a browser. Pass config.targetOrigin explicitly.'
			);
		} finally {
			if (documentDescriptor) {
				Object.defineProperty(globalThis, 'document', documentDescriptor);
			}
		}
	});
});

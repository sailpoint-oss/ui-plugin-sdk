import { createSDK } from '../src';
import { MESSAGE_TYPES } from '../src/protocol/constants';
import type { PluginContext, UserCapabilities } from '../src/public/types';
import { mockSdkContext } from '../src/testing';

const NOW = 1_717_600_000_000;
const NOW_ISO = new Date(NOW).toISOString();
const CAPABILITIES: UserCapabilities = {
	isOrgAdmin: true,
	isHelpdesk: false,
	isDashboard: true,
	isCertAdmin: false,
	isReportAdmin: false,
	isSourceAdmin: false,
	isSourceSubadmin: false,
	isRoleAdmin: false,
	isRoleSubadmin: false,
	isCloudGovAdmin: false,
	isCloudGovUser: false,
	isSaasManagementAdmin: false,
	isSaasManagementReader: false
};
const CONTEXT: PluginContext = {
	tenant: {
		id: 'tenant-1',
		scriptName: 'acme',
		org: 'acme',
		name: 'Acme',
		pod: 'useast1',
		region: 'us-east-1',
		apiUrl: {
			idn: 'https://acme.api.identitynow.com'
		},
		products: []
	},
	user: {
		id: 'user-1',
		displayName: 'Test User',
		email: 'test@sailpoint.com',
		capabilities: CAPABILITIES
	},
	page: {
		route: 'https://acme.identitynow.com/ui/plugin/accounts-plugin/accounts',
		subPath: 'accounts'
	},
	slot: {
		id: 'slot-1'
	},
	pluginConfiguration: {
		pluginId: 'plugin-1'
	}
};

describe('mockSdkContext', () => {
	it('intercepts parent messages and completes the SDK handshake', async () => {
		const appShell = mockSdkContext({
			context: CONTEXT,
			now: () => NOW
		});

		try {
			const sdk = createSDK({
				targetOrigin: appShell.targetOrigin,
				now: () => NOW
			});

			await expect(sdk.getContext()).resolves.toEqual(CONTEXT);
			expect(appShell.messages.map(({ message }) => (message as { type: string }).type)).toEqual([
				MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
				MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES,
				MESSAGE_TYPES.SP_PLUGIN_INIT_RES
			]);
			expect(appShell.messages.every(({ targetOrigin }) => targetOrigin === appShell.targetOrigin)).toBe(true);
		} finally {
			appShell.restore();
		}
	});

	it('supports token refreshes and inbound token and viewport events', async () => {
		const appShell = mockSdkContext({
			context: CONTEXT,
			token: 'initial-token',
			now: () => NOW
		});

		try {
			const sdk = createSDK({
				targetOrigin: appShell.targetOrigin,
				now: () => NOW
			});
			await sdk.getContext();

			await expect(sdk.api.getToken(true)).resolves.toBe('initial-token');

			const onTokenUpdate = jest.fn();
			const onViewportChange = jest.fn();
			sdk.events.onTokenUpdate(onTokenUpdate);
			sdk.events.onViewportChange(onViewportChange);

			appShell.emitTokenUpdate('updated-token');
			appShell.emitViewportChange({
				width: 1280,
				height: 720
			});

			expect(onTokenUpdate).toHaveBeenCalledWith('updated-token');
			expect(onViewportChange).toHaveBeenCalledWith({
				width: 1280,
				height: 720
			});
			await expect(sdk.api.getToken()).resolves.toBe('updated-token');
			expect(
				appShell.messages.some(
					({ message }) => (message as { type?: string }).type === MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ
				)
			).toBe(true);
		} finally {
			appShell.restore();
		}
	});

	it('defaults to a representative full-page route and derives its subPath', async () => {
		const appShell = mockSdkContext({ now: () => NOW });

		try {
			const sdk = createSDK({ targetOrigin: appShell.targetOrigin, now: () => NOW });

			expect(appShell.context.page).toEqual({
				route: 'https://mock-app-shell.sailpoint.test/ui/plugin/mock-plugin/settings',
				subPath: 'settings'
			});
			await expect(sdk.getContext()).resolves.toEqual(appShell.context);
		} finally {
			appShell.restore();
		}
	});

	it('derives subPath from route and ignores a supplied value', async () => {
		const appShell = mockSdkContext({
			context: {
				...CONTEXT,
				page: { route: 'https://acme.identitynow.com/ui/plugin/accounts-plugin/accounts/42', subPath: 'stale' }
			},
			now: () => NOW
		});

		try {
			const sdk = createSDK({ targetOrigin: appShell.targetOrigin, now: () => NOW });

			expect(appShell.context.page.subPath).toBe('accounts/42');
			await expect(sdk.getContext()).resolves.toMatchObject({ page: { subPath: 'accounts/42' } });
		} finally {
			appShell.restore();
		}
	});

	it('records normalized route changes sent to the mock origin', async () => {
		const appShell = mockSdkContext({
			context: CONTEXT,
			now: () => NOW
		});

		try {
			const sdk = createSDK({
				targetOrigin: appShell.targetOrigin,
				now: () => NOW
			});

			await sdk.navigation.setRoute('/x');
			await sdk.navigation.setRoute('y');
			window.parent.postMessage(
				{
					type: MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT,
					timestamp: NOW_ISO,
					payload: { subPath: 'foreign' }
				},
				'https://elsewhere.example.com'
			);

			expect(appShell.routeChanges).toEqual(['x', 'y']);
		} finally {
			appShell.restore();
		}
	});

	it('records mismatched target origins without simulating a host response', async () => {
		const appShell = mockSdkContext({
			now: () => NOW
		});

		try {
			window.parent.postMessage(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					requestId: 'wrong-origin',
					protocolVersion: 'v1.0',
					timestamp: NOW_ISO,
					payload: {}
				},
				'https://unexpected.example'
			);
			await Promise.resolve();

			expect(appShell.messages).toEqual([
				{
					message: expect.objectContaining({
						requestId: 'wrong-origin'
					}),
					targetOrigin: 'https://unexpected.example'
				}
			]);
		} finally {
			appShell.restore();
		}
	});

	it('restores the original parent postMessage implementation idempotently', () => {
		const originalPostMessage = window.parent.postMessage;
		const appShell = mockSdkContext();

		expect(window.parent.postMessage).not.toBe(originalPostMessage);

		appShell.restore();
		appShell.restore();

		expect(window.parent.postMessage).toBe(originalPostMessage);
	});

	it('reports the mock host color scheme and drives theme changes without a handshake', () => {
		const appShell = mockSdkContext({ colorScheme: 'dark', now: () => NOW });

		try {
			const sdk = createSDK({ targetOrigin: appShell.targetOrigin, now: () => NOW });
			const onThemeChange = jest.fn();
			sdk.events.onThemeChange(onThemeChange);

			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);

			appShell.emitThemeChange('light');

			expect(onThemeChange).toHaveBeenCalledWith({ colorScheme: 'light' });
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(false);
			expect(appShell.messages).toEqual([]);
		} finally {
			appShell.restore();
		}
	});

	it('answers the dark color-scheme query like a browser and removes matchMedia on restore', () => {
		expect('matchMedia' in window).toBe(false);
		const appShell = mockSdkContext();

		try {
			const query = window.matchMedia('(prefers-color-scheme: dark)');
			const onChange = jest.fn();
			query.addEventListener('change', onChange);

			expect(query.matches).toBe(false);

			appShell.emitThemeChange('dark');
			appShell.emitThemeChange('dark');

			expect(query.matches).toBe(true);
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange.mock.calls[0][0]).toMatchObject({
				type: 'change',
				matches: true,
				media: '(prefers-color-scheme: dark)'
			});
			expect(window.matchMedia('(min-width: 1px)').matches).toBe(false);
		} finally {
			appShell.restore();
		}

		expect('matchMedia' in window).toBe(false);
	});

	it('skips the matchMedia patch when explicit window mocks run outside a browser', () => {
		const originalPostMessage = jest.fn();
		const parentWindow = { postMessage: originalPostMessage };
		const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined
		});

		try {
			const appShell = mockSdkContext({
				parentWindow,
				sourceWindow: { dispatchEvent: () => true }
			});

			expect(() => appShell.emitThemeChange('dark')).not.toThrow();
			appShell.restore();

			expect(parentWindow.postMessage).toBe(originalPostMessage);
		} finally {
			if (windowDescriptor) {
				Object.defineProperty(globalThis, 'window', windowDescriptor);
			}
		}

		expect('matchMedia' in window).toBe(false);
	});

	it('passes other media queries to an existing matchMedia and puts it back on restore', () => {
		const originalMatchMedia = jest.fn((query: string) => ({ matches: true, media: query }));
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			writable: true,
			value: originalMatchMedia
		});

		try {
			const appShell = mockSdkContext({ colorScheme: 'dark' });

			expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true);
			expect(originalMatchMedia).not.toHaveBeenCalled();
			expect(window.matchMedia('(min-width: 1px)')).toEqual({ matches: true, media: '(min-width: 1px)' });

			appShell.restore();

			expect(window.matchMedia).toBe(originalMatchMedia);
		} finally {
			Reflect.deleteProperty(window, 'matchMedia');
		}
	});
});

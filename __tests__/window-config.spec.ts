import { createSDK } from '../src';
import type { PluginContext, SailPointWindowConfig, UserCapabilities } from '../src';
import { mockSdkContext } from '../src/testing';

const NOW = 1_717_600_000_000;

const CAPABILITIES: UserCapabilities = {
	isOrgAdmin: true,
	isHelpdesk: false,
	isDashboard: false,
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
			idn: 'https://acme.api.identitynow.com/'
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
		route: 'https://acme.identitynow.com/plugins/example'
	},
	slot: {
		id: 'slot-1'
	},
	pluginConfiguration: {
		pluginId: 'plugin-1'
	}
};

const requireSailpointConfig = (): NonNullable<Window['sailpointConfig']> => {
	const sailpointConfig = window.sailpointConfig;
	if (!sailpointConfig) {
		throw new Error('Expected window.sailpointConfig to be registered.');
	}

	return sailpointConfig;
};

describe('window.sailpointConfig', () => {
	beforeEach(() => {
		delete window.sailpointConfig;
	});

	it('is undefined before handshake completes', () => {
		mockSdkContext({ context: CONTEXT, now: () => NOW }).restore();

		createSDK({ targetOrigin: 'https://mock-app-shell.sailpoint.test', now: () => NOW });

		expect(window.sailpointConfig).toBeUndefined();
	});

	it('returns baseurl and accessToken matching getContext and getToken after handshake', async () => {
		const appShell = mockSdkContext({
			context: CONTEXT,
			token: 'handshake-token',
			now: () => NOW
		});

		try {
			const sdk = createSDK({
				targetOrigin: appShell.targetOrigin,
				now: () => NOW
			});

			await sdk.getContext();

			expect(window.sailpointConfig).toBeDefined();
			await expect(requireSailpointConfig()()).resolves.toEqual({
				baseurl: 'https://acme.api.identitynow.com',
				accessToken: 'handshake-token'
			} satisfies SailPointWindowConfig);
			await expect(sdk.api.getToken()).resolves.toBe('handshake-token');
		} finally {
			appShell.restore();
		}
	});

	it('strips trailing slashes from baseurl', async () => {
		const appShell = mockSdkContext({
			context: CONTEXT,
			now: () => NOW
		});

		try {
			const sdk = createSDK({
				targetOrigin: appShell.targetOrigin,
				now: () => NOW
			});

			await sdk.getContext();

			const config = await requireSailpointConfig()();

			expect(config.baseurl).toBe('https://acme.api.identitynow.com');
			expect(config).not.toHaveProperty('nermBaseurl');
		} finally {
			appShell.restore();
		}
	});

	it('returns an updated accessToken after emitTokenUpdate', async () => {
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
			await expect(requireSailpointConfig()()).resolves.toMatchObject({
				accessToken: 'initial-token'
			});

			appShell.emitTokenUpdate('rotated-token');

			await expect(requireSailpointConfig()()).resolves.toMatchObject({
				baseurl: 'https://acme.api.identitynow.com',
				accessToken: 'rotated-token'
			});
		} finally {
			appShell.restore();
		}
	});

	it('lets the latest createSDK registration win', async () => {
		const firstContext: PluginContext = {
			...CONTEXT,
			tenant: {
				...CONTEXT.tenant,
				apiUrl: { idn: 'https://first.api.identitynow.com' }
			}
		};
		const secondContext: PluginContext = {
			...CONTEXT,
			tenant: {
				...CONTEXT.tenant,
				apiUrl: { idn: 'https://second.api.identitynow.com' }
			}
		};

		const firstShell = mockSdkContext({
			context: firstContext,
			token: 'first-token',
			now: () => NOW
		});

		try {
			const firstSdk = createSDK({
				targetOrigin: firstShell.targetOrigin,
				now: () => NOW
			});
			await firstSdk.getContext();

			await expect(requireSailpointConfig()()).resolves.toMatchObject({
				baseurl: 'https://first.api.identitynow.com',
				accessToken: 'first-token'
			});
		} finally {
			firstShell.restore();
		}

		const secondShell = mockSdkContext({
			context: secondContext,
			token: 'second-token',
			now: () => NOW
		});

		try {
			const secondSdk = createSDK({
				targetOrigin: secondShell.targetOrigin,
				now: () => NOW
			});
			await secondSdk.getContext();

			await expect(requireSailpointConfig()()).resolves.toEqual({
				baseurl: 'https://second.api.identitynow.com',
				accessToken: 'second-token'
			});
		} finally {
			secondShell.restore();
		}
	});
});

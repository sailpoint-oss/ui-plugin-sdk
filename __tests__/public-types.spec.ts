import { createSDK } from '../src';
import type {
	CapabilityFlagKey,
	PluginContext,
	RouteChangePayload,
	SailPointPluginSDK,
	UserCapabilities
} from '../src';
import { mockSdkContext } from '../src/testing';
import type { MockPluginContext } from '../src/testing';

/**
 * Compile-time contract tests.
 *
 * The SDK's type declarations are the plugin author's only documentation of the
 * App Shell contract, so the shapes that must *not* compile are pinned here with
 * `@ts-expect-error`. Each one fails the build if the declaration loosens again:
 * `@ts-expect-error` is itself an error when the line below it type-checks.
 */
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

/**
 * The README's "Testing Plugins Offline" context literal, verbatim. Compiling it
 * here is what keeps the documented example honest as the shapes tighten.
 */
const README_CONTEXT: MockPluginContext = {
	tenant: {
		id: 'tenant-1',
		scriptName: 'acme',
		org: 'acme',
		name: 'Acme',
		pod: 'useast1',
		region: 'us-east-1',
		apiUrl: { idn: 'https://acme.api.identitynow.com' },
		products: []
	},
	user: { id: 'user-1', displayName: 'Test User', email: 'test@example.com', capabilities: CAPABILITIES },
	page: { route: 'https://acme.identitynow.com/ui/plugin/example/settings' },
	slot: { id: 'slot-1' },
	pluginConfiguration: { pluginId: 'plugin-1' }
};

describe('public context type contract', () => {
	it('reads capability flags without optional chaining', () => {
		const isOrgAdmin: boolean = README_CONTEXT.user.capabilities.isOrgAdmin;

		expect(isOrgAdmin).toBe(true);

		/**
		 * The regression CSTM-354 closes: under the old `capabilities?: string[]`
		 * declaration this line compiled and threw at runtime. It is now a compile
		 * error, and the assertion records why that matters.
		 */
		expect(() => {
			// @ts-expect-error capabilities is a flag map, not the legacy string array.
			README_CONTEXT.user.capabilities.includes('ORG_ADMIN');
		}).toThrow(TypeError);
	});

	it('no longer declares rights that App Shell never sends', () => {
		// @ts-expect-error amsRights was removed with PLTUI-16110.
		expect(README_CONTEXT.user.amsRights).toBeUndefined();
		// @ts-expect-error uiRights was never sent by App Shell.
		expect(README_CONTEXT.user.uiRights).toBeUndefined();
		// @ts-expect-error index signatures were removed, so typos are compile errors.
		expect(README_CONTEXT.user.capabilties).toBeUndefined();
	});

	it('exposes product licenses without a cast', () => {
		const context: MockPluginContext = {
			...README_CONTEXT,
			tenant: {
				...README_CONTEXT.tenant,
				products: [
					{
						productName: 'idn',
						url: 'https://acme.identitynow.com',
						productTenantId: 'product-tenant-1',
						productRegion: 'us-east-1',
						apiUrl: 'https://acme.api.identitynow.com',
						licenses: [{ licenseId: 'idn:access-request', legacyFeatureName: 'ACCESS_REQUEST' }],
						zone: 'useast1',
						status: '',
						dateCreated: ''
					}
				]
			}
		};

		const legacyFeatureName: string = context.tenant.products[0].licenses[0].legacyFeatureName;

		expect(legacyFeatureName).toBe('ACCESS_REQUEST');
		// @ts-expect-error productRight is deliberately not part of the product shape.
		expect(context.tenant.products[0].productRight).toBeUndefined();
	});

	it('exports the capability flag key union for plugin-side lookups', () => {
		const labels: Record<CapabilityFlagKey, string> = {
			isOrgAdmin: 'Org Admin',
			isHelpdesk: 'Helpdesk',
			isDashboard: 'Dashboard',
			isCertAdmin: 'Certification Admin',
			isReportAdmin: 'Report Admin',
			isSourceAdmin: 'Source Admin',
			isSourceSubadmin: 'Source Subadmin',
			isRoleAdmin: 'Role Admin',
			isRoleSubadmin: 'Role Subadmin',
			isCloudGovAdmin: 'Cloud Gov Admin',
			isCloudGovUser: 'Cloud Gov User',
			isSaasManagementAdmin: 'SaaS Management Admin',
			isSaasManagementReader: 'SaaS Management Reader'
		};

		expect(labels.isOrgAdmin).toBe('Org Admin');
	});

	it('requires page.subPath on PluginContext but not on mock input', () => {
		const route = 'https://acme.identitynow.com/ui/plugin/example';
		const subPath: string = README_CONTEXT.page.subPath ?? '';
		const mockInput: MockPluginContext = { ...README_CONTEXT, page: { route } };

		// @ts-expect-error subPath is always present on resolved context; only mock input may omit it.
		const resolved: PluginContext = { ...README_CONTEXT, page: { route } };

		expect([subPath, mockInput.page.route, resolved.page.route]).toEqual(['', route, route]);
	});

	it('exports the navigation namespace and RouteChangePayload', async () => {
		const appShell = mockSdkContext();

		try {
			const sdk: SailPointPluginSDK = createSDK({ targetOrigin: appShell.targetOrigin });
			const payload: RouteChangePayload = { subPath: 'settings' };
			const result: Promise<void> = sdk.navigation.setRoute(payload.subPath);
			await result;

			// @ts-expect-error subPath is required; the host treats a missing value as the plugin home.
			const missing: RouteChangePayload = {};
			expect(missing).toEqual({});
			// @ts-expect-error setRoute only accepts a string subPath.
			await expect(sdk.navigation.setRoute(1)).rejects.toThrow(TypeError);
		} finally {
			appShell.restore();
		}
	});

	it('completes the handshake with the documented README context', async () => {
		const appShell = mockSdkContext({ context: README_CONTEXT });

		try {
			const sdk = createSDK({ targetOrigin: appShell.targetOrigin });

			await expect(sdk.getContext()).resolves.toEqual(appShell.context);
			expect(appShell.context.page.subPath).toBe('settings');
		} finally {
			appShell.restore();
		}
	});
});

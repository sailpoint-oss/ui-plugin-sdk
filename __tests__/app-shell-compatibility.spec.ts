import { createSDK } from '../src';
import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../src/protocol/constants';
import type { MessageSource, MessageTarget, RuntimeMessageEvent } from '../src/protocol/types';

const APP_SHELL_ORIGIN = 'https://acme.identitynow.com';
const NOW = 1_721_234_567_000;
const NOW_ISO = new Date(NOW).toISOString();

/**
 * Verbatim shape emitted by saas-sp-renderer's `buildInitPayload()` at
 * `4100daea` (PLTUI-16110). Kept literal on purpose: this fixture is the pinned
 * host contract, so it must be transcribed from the renderer rather than built
 * from the SDK's own helpers or types.
 *
 * Post-PLTUI-16110 specifics worth preserving verbatim:
 * - `userContext.capabilities` is an exhaustive boolean map, not a string array.
 * - `productRight` is absent from products; no per-product access flag replaces it.
 * - `status` and `dateCreated` are sent as empty strings by the host today.
 * - `pageContext.route` carries `window.location.href`, a full URL.
 */
const APP_SHELL_INIT_PAYLOAD = {
	pluginConfiguration: {
		slotConfiguration: {
			slot: 'full-page',
			minimumHeight: 400,
			maximumHeight: 2000
		},
		pluginId: 'plugin-1'
	},
	userContext: {
		id: 'user-1',
		displayName: 'Test User',
		email: 'test@example.com',
		capabilities: {
			isOrgAdmin: true,
			isHelpdesk: false,
			isDashboard: true,
			isCertAdmin: false,
			isReportAdmin: false,
			isSourceAdmin: true,
			isSourceSubadmin: false,
			isRoleAdmin: false,
			isRoleSubadmin: false,
			isCloudGovAdmin: false,
			isCloudGovUser: false,
			isSaasManagementAdmin: false,
			isSaasManagementReader: false
		}
	},
	tenantContext: {
		id: 'tenant-1',
		name: 'Acme',
		pod: 'useast1',
		region: 'us-east-1',
		scriptName: 'acme',
		org: 'acme',
		apiUrl: {
			idn: 'https://acme.api.identitynow.com'
		},
		products: [
			{
				productName: 'idn',
				url: 'https://acme.identitynow.com',
				productTenantId: 'product-tenant-1',
				productRegion: 'us-east-1',
				apiUrl: 'https://acme.api.identitynow.com',
				licenses: [
					{
						licenseId: 'idn:access-request',
						legacyFeatureName: 'ACCESS_REQUEST'
					}
				],
				zone: 'useast1',
				status: '',
				dateCreated: ''
			}
		]
	},
	pageContext: {
		route: 'https://acme.identitynow.com/plugin/plugin-1'
	},
	slotContext: {
		id: 'slot-1'
	}
};

/**
 * Minimal shared envelope shape used by the SDK and saas-sp-renderer.
 * `protocolVersion` is optional because App Shell responses carry it in the
 * READY payload instead of repeating it as top-level envelope metadata.
 */
interface ContractEnvelope {
	type: string;
	requestId?: string;
	protocolVersion?: string;
	timestamp: string;
	payload: unknown;
}

/**
 * Browser-window stand-in that delivers App Shell messages to SDK listeners.
 */
class ContractSourceWindow implements MessageSource {
	private readonly listeners = new Set<(event: RuntimeMessageEvent) => void>();

	public addEventListener(eventName: 'message', listener: (event: RuntimeMessageEvent) => void): void {
		if (eventName === 'message') {
			this.listeners.add(listener);
		}
	}

	public removeEventListener(eventName: 'message', listener: (event: RuntimeMessageEvent) => void): void {
		if (eventName === 'message') {
			this.listeners.delete(listener);
		}
	}

	public emit(message: ContractEnvelope): void {
		for (const listener of this.listeners) {
			listener({
				data: message,
				origin: APP_SHELL_ORIGIN,
				source: null
			});
		}
	}
}

/**
 * Parent-window stand-in that records every SDK message before allowing each
 * test to drive the matching App Shell response.
 */
class ContractAppShell implements MessageTarget {
	public readonly received: Array<{ message: ContractEnvelope; targetOrigin: string }> = [];
	public onMessage: (message: ContractEnvelope) => void = () => undefined;

	public postMessage(message: unknown, targetOrigin: string): void {
		const envelope = message as ContractEnvelope;
		this.received.push({
			message: envelope,
			targetOrigin
		});
		this.onMessage(envelope);
	}
}

/**
 * Creates the exact base envelope emitted by saas-sp-renderer: ISO timestamp,
 * request correlation, and no top-level protocolVersion.
 */
const appShellEnvelope = (type: string, requestId: string, payload: unknown): ContractEnvelope => ({
	type,
	requestId,
	timestamp: NOW_ISO,
	payload
});

/**
 * Guards the outbound SDK invariants that previously drifted from App Shell.
 */
const expectValidSdkEnvelope = (message: ContractEnvelope): void => {
	expect(typeof message.timestamp).toBe('string');
	expect(Number.isFinite(Date.parse(message.timestamp))).toBe(true);
	expect(message.requestId).toEqual(expect.any(String));
};

/**
 * Contract tests intentionally use public createSDK APIs and App Shell-shaped
 * messages instead of SDK test helpers. This prevents both implementations
 * from changing together and hiding an integration incompatibility.
 */
describe('saas-sp-renderer contract compatibility', () => {
	it('completes the full handshake with exact App Shell envelope and token shapes', async () => {
		const sourceWindow = new ContractSourceWindow();
		const appShell = new ContractAppShell();
		window.history.replaceState({}, '', `/?parentOrigin=${encodeURIComponent(APP_SHELL_ORIGIN)}`);
		const contextPayload = APP_SHELL_INIT_PAYLOAD;

		appShell.onMessage = message => {
			expectValidSdkEnvelope(message);

			if (message.type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ) {
				expect(message.payload).toEqual({
					protocolVersion: COIP_PROTOCOL_VERSION
				});
				/**
				 * postMessage delivery is asynchronous in browsers. Microtasks preserve
				 * that ordering so the SDK can install the next handshake waiter.
				 */
				queueMicrotask(() => {
					sourceWindow.emit(
						appShellEnvelope(MESSAGE_TYPES.SP_PLUGIN_READY_RES, message.requestId as string, {
							protocolVersion: COIP_PROTOCOL_VERSION
						})
					);
					queueMicrotask(() => {
						sourceWindow.emit(
							appShellEnvelope(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, 'token-delivery-1', {
								token: {
									accessToken: 'app-shell-token',
									refreshInterval: 300
								}
							})
						);
					});
				});
				return;
			}

			if (message.type === MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES) {
				expect(message.requestId).toBe('token-delivery-1');
				queueMicrotask(() => {
					sourceWindow.emit(
						appShellEnvelope(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'plugin-init-1', contextPayload)
					);
				});
				return;
			}

			if (message.type === MESSAGE_TYPES.SP_PLUGIN_INIT_RES) {
				expect(message.requestId).toBe('plugin-init-1');
			}
		};

		const sdk = createSDK({
			parentWindow: appShell,
			sourceWindow,
			now: () => NOW,
			requestTimeoutMs: 500
		});

		await expect(sdk.getContext()).resolves.toEqual({
			tenant: contextPayload.tenantContext,
			user: contextPayload.userContext,
			page: contextPayload.pageContext,
			slot: contextPayload.slotContext,
			pluginConfiguration: contextPayload.pluginConfiguration
		});
		/**
		 * AC-4: the capability map reaches the plugin key-for-key, and AC-8: the
		 * host's mount configuration is no longer silently discarded.
		 */
		const context = await sdk.getContext();
		expect(context.user.capabilities).toEqual(contextPayload.userContext.capabilities);
		expect(context.pluginConfiguration.pluginId).toBe('plugin-1');
		expect(context.pluginConfiguration.slotConfiguration?.maximumHeight).toBe(2000);
		expect(context.tenant.products[0].licenses[0].legacyFeatureName).toBe('ACCESS_REQUEST');
		/**
		 * Plugin consumers receive only the access-token string even though App
		 * Shell transports a token metadata object.
		 */
		await expect(sdk.api.getToken()).resolves.toBe('app-shell-token');
		expect(appShell.received.map(({ message }) => message.type)).toEqual([
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
			MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES,
			MESSAGE_TYPES.SP_PLUGIN_INIT_RES
		]);
		expect(appShell.received.every(({ targetOrigin }) => targetOrigin === APP_SHELL_ORIGIN)).toBe(true);
	});

	it('normalizes App Shell token objects for refreshes and update events', async () => {
		const sourceWindow = new ContractSourceWindow();
		const appShell = new ContractAppShell();

		appShell.onMessage = message => {
			if (message.type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ) {
				queueMicrotask(() => {
					sourceWindow.emit(
						appShellEnvelope(MESSAGE_TYPES.SP_PLUGIN_READY_RES, message.requestId as string, {
							protocolVersion: COIP_PROTOCOL_VERSION
						})
					);
					queueMicrotask(() => {
						sourceWindow.emit(
							appShellEnvelope(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, 'token-delivery-2', {
								token: {
									accessToken: 'initial-token',
									refreshInterval: 300
								}
							})
						);
					});
				});
				return;
			}

			if (message.type === MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES) {
				queueMicrotask(() => {
					sourceWindow.emit(
						appShellEnvelope(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'plugin-init-2', {
							...APP_SHELL_INIT_PAYLOAD,
							slotContext: {}
						})
					);
				});
				return;
			}

			if (message.type === MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ) {
				queueMicrotask(() => {
					sourceWindow.emit(
						appShellEnvelope(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, message.requestId as string, {
							token: {
								accessToken: 'refreshed-token',
								refreshInterval: 300
							}
						})
					);
				});
			}
		};

		const sdk = createSDK({
			targetOrigin: APP_SHELL_ORIGIN,
			parentWindow: appShell,
			sourceWindow,
			now: () => NOW,
			requestTimeoutMs: 500
		});
		await sdk.getContext();

		/**
		 * Both pull-based refreshes and push-based updates use App Shell token
		 * objects and must normalize to the SDK's public string contract.
		 */
		await expect(sdk.api.getToken(true)).resolves.toBe('refreshed-token');

		const onTokenUpdate = jest.fn();
		sdk.events.onTokenUpdate(onTokenUpdate);
		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT,
			timestamp: NOW_ISO,
			payload: {
				token: {
					accessToken: 'event-token',
					refreshInterval: 300
				}
			}
		});

		expect(onTokenUpdate).toHaveBeenCalledWith('event-token');
		await expect(sdk.api.getToken()).resolves.toBe('event-token');
	});

	it('correlates App Shell protocol errors through payload.requestId', async () => {
		const sourceWindow = new ContractSourceWindow();
		const appShell = new ContractAppShell();

		appShell.onMessage = message => {
			if (message.type !== MESSAGE_TYPES.SP_PLUGIN_READY_REQ) {
				return;
			}

			queueMicrotask(() => {
				/**
				 * App Shell creates its own error-envelope requestId and places the
				 * rejected SDK requestId inside payload.requestId.
				 */
				sourceWindow.emit(
					appShellEnvelope(MESSAGE_TYPES.SP_ERROR_RES, 'app-shell-error-id', {
						type: 'ERR_UNSUPPORTED_VERSION',
						requestId: message.requestId
					})
				);
			});
		};

		const sdk = createSDK({
			targetOrigin: APP_SHELL_ORIGIN,
			parentWindow: appShell,
			sourceWindow,
			now: () => NOW,
			requestTimeoutMs: 500
		});

		await expect(sdk.getContext()).rejects.toMatchObject({
			details: {
				code: 'HANDSHAKE_FAILED',
				message: 'App Shell rejected request with ERR_UNSUPPORTED_VERSION.',
				details: {
					hostErrorCode: 'ERR_UNSUPPORTED_VERSION'
				}
			}
		});
	});

	/**
	 * Pinned to saas-sp-renderer `d283d69c` (CSTM-525): App Shell reads
	 * `payload.subPath` from `RouteChangeEvtPayload` in
	 * `plugin-post-handshake-messages.ts`, only after the handshake completes.
	 */
	it('emits SP_ROUTE_CHANGE_EVT matching App Shell RouteChangeEvtPayload after the handshake', async () => {
		const sourceWindow = new ContractSourceWindow();
		const appShell = new ContractAppShell();

		appShell.onMessage = message => {
			if (message.type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ) {
				queueMicrotask(() => {
					sourceWindow.emit(
						appShellEnvelope(MESSAGE_TYPES.SP_PLUGIN_READY_RES, message.requestId as string, {
							protocolVersion: COIP_PROTOCOL_VERSION
						})
					);
					queueMicrotask(() => {
						sourceWindow.emit(
							appShellEnvelope(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, 'token-delivery-1', {
								token: { accessToken: 'app-shell-token', refreshInterval: 300 }
							})
						);
					});
				});
				return;
			}

			if (message.type === MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES) {
				queueMicrotask(() => {
					sourceWindow.emit(
						appShellEnvelope(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'plugin-init-1', APP_SHELL_INIT_PAYLOAD)
					);
				});
			}
		};

		const sdk = createSDK({
			targetOrigin: APP_SHELL_ORIGIN,
			parentWindow: appShell,
			sourceWindow,
			now: () => NOW,
			requestTimeoutMs: 500
		});

		await sdk.navigation.setRoute('/settings/general?tab=2#top');

		expect(appShell.received.map(({ message }) => message.type)).toEqual([
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
			MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES,
			MESSAGE_TYPES.SP_PLUGIN_INIT_RES,
			'SP_ROUTE_CHANGE_EVT'
		]);
		const routeChange = appShell.received[3];
		expect(routeChange.targetOrigin).toBe(APP_SHELL_ORIGIN);
		expect(routeChange.message).toStrictEqual({
			type: 'SP_ROUTE_CHANGE_EVT',
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW_ISO,
			payload: { subPath: 'settings/general?tab=2#top' }
		});
	});
});

import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../protocol/constants.js';
import type {
	MessageTarget,
	RuntimeEnvelope,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from '../protocol/types.js';
import type { PluginContext, UserCapabilities, ViewportUpdatePayload } from '../public/types.js';

const DEFAULT_TARGET_ORIGIN = 'https://mock-app-shell.sailpoint.test';
const DEFAULT_TOKEN = 'mock-sdk-token';

/**
 * Capability flags for the default mock user.
 *
 * All `false` deliberately: the mock is what plugin authors copy, so the default
 * should model a least-privileged user and force an explicit opt-in to any
 * capability the plugin's happy path depends on.
 */
const DEFAULT_CAPABILITIES: UserCapabilities = {
	isOrgAdmin: false,
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

const DEFAULT_CONTEXT: PluginContext = {
	tenant: {
		id: 'mock-tenant',
		scriptName: 'mock-tenant',
		org: 'mock-tenant',
		name: 'Mock Tenant',
		pod: 'mock-pod',
		region: 'mock-region',
		apiUrl: {
			idn: 'https://mock-tenant.api.identitynow.test'
		},
		products: []
	},
	user: {
		id: 'mock-user',
		displayName: 'Mock User',
		email: 'mock.user@example.com',
		capabilities: DEFAULT_CAPABILITIES
	},
	page: {
		route: 'https://mock-app-shell.sailpoint.test/'
	},
	slot: {},
	pluginConfiguration: {
		pluginId: 'mock-plugin',
		slotConfiguration: {
			slot: 'mock-slot',
			minimumHeight: 400,
			maximumHeight: 2000
		}
	}
};

interface MockSourceWindow {
	dispatchEvent(event: Event): boolean;
}

export interface MockSdkContextOptions {
	context?: PluginContext;
	token?: string;
	targetOrigin?: string;
	protocolVersion?: string;
	now?: () => number;
	parentWindow?: MessageTarget;
	sourceWindow?: MockSourceWindow;
}

export interface MockOutboundMessage {
	message: unknown;
	targetOrigin: string;
}

export interface MockSdkContextHandle {
	readonly context: PluginContext;
	readonly messages: readonly MockOutboundMessage[];
	readonly targetOrigin: string;
	emitTokenUpdate(token: string): void;
	emitViewportChange(dimensions: ViewportUpdatePayload): void;
	restore(): void;
}

const getBrowserWindow = (): Window => {
	if (typeof window === 'undefined') {
		throw new Error('mockSdkContext requires a browser-like window or explicit window mocks.');
	}

	return window;
};

const isEnvelope = (value: unknown): value is RuntimeEnvelope => {
	return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
};

/**
 * Installs a lightweight App Shell mock around the SDK's parent-window transport.
 * The returned handle can emit host events and must be restored after each test.
 */
export const mockSdkContext = (options: MockSdkContextOptions = {}): MockSdkContextHandle => {
	const browserWindow = options.parentWindow && options.sourceWindow ? null : getBrowserWindow();
	const parentWindow = options.parentWindow ?? (browserWindow?.parent as unknown as MessageTarget);
	const sourceWindow = options.sourceWindow ?? (browserWindow as unknown as MockSourceWindow);
	const targetOrigin = options.targetOrigin ?? DEFAULT_TARGET_ORIGIN;
	const protocolVersion = options.protocolVersion ?? COIP_PROTOCOL_VERSION;
	const now = options.now ?? (() => Date.now());
	const timestamp = (): string => new Date(now()).toISOString();
	const context = options.context ?? DEFAULT_CONTEXT;
	const messages: MockOutboundMessage[] = [];
	const originalPostMessage = parentWindow.postMessage;
	let currentToken = options.token ?? DEFAULT_TOKEN;
	let requestSequence = 0;
	let restored = false;

	const nextRequestId = (): string => {
		requestSequence += 1;
		return `mock-sdk-${requestSequence}`;
	};

	const dispatchIncoming = (message: RuntimeEnvelope): void => {
		sourceWindow.dispatchEvent(
			new MessageEvent('message', {
				data: message,
				origin: targetOrigin
			})
		);
	};

	const dispatchRequest = (type: RuntimeRequestEnvelope['type'], payload: unknown): void => {
		dispatchIncoming({
			type,
			requestId: nextRequestId(),
			timestamp: timestamp(),
			payload
		});
	};

	const dispatchResponse = (type: RuntimeResponseEnvelope['type'], requestId: string, payload: unknown): void => {
		dispatchIncoming({
			type,
			requestId,
			timestamp: timestamp(),
			payload
		});
	};

	const enqueue = (callback: () => void): void => {
		if (typeof queueMicrotask === 'function') {
			queueMicrotask(callback);
			return;
		}

		void Promise.resolve().then(callback);
	};

	const handleOutboundMessage = (message: unknown, outboundOrigin: string): void => {
		messages.push({
			message,
			targetOrigin: outboundOrigin
		});

		if (restored || outboundOrigin !== targetOrigin || !isEnvelope(message)) {
			return;
		}

		switch (message.type) {
			case MESSAGE_TYPES.SP_PLUGIN_READY_REQ:
				enqueue(() => {
					dispatchResponse(MESSAGE_TYPES.SP_PLUGIN_READY_RES, message.requestId, {
						protocolVersion
					});
					enqueue(() => {
						dispatchRequest(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, {
							token: {
								accessToken: currentToken,
								refreshInterval: 300
							}
						});
					});
				});
				break;
			case MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES:
				enqueue(() => {
					dispatchRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, context);
				});
				break;
			case MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ:
				enqueue(() => {
					dispatchResponse(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, message.requestId, {
						token: {
							accessToken: currentToken,
							refreshInterval: 300
						}
					});
				});
				break;
		}
	};

	parentWindow.postMessage = handleOutboundMessage;

	return {
		context,
		get messages(): readonly MockOutboundMessage[] {
			return [...messages];
		},
		targetOrigin,
		emitTokenUpdate(token: string): void {
			currentToken = token;
			dispatchIncoming({
				type: MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT,
				timestamp: timestamp(),
				payload: {
					token: {
						accessToken: token,
						refreshInterval: 300
					}
				}
			});
		},
		emitViewportChange(dimensions: ViewportUpdatePayload): void {
			dispatchIncoming({
				type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
				timestamp: timestamp(),
				payload: dimensions
			});
		},
		restore(): void {
			if (restored) {
				return;
			}

			parentWindow.postMessage = originalPostMessage;
			restored = true;
		}
	};
};

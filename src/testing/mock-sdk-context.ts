import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../protocol/constants.js';
import type {
	MessageTarget,
	RuntimeEnvelope,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from '../protocol/types.js';
import type { PluginContext, ViewportUpdatePayload } from '../public/types.js';

const DEFAULT_TARGET_ORIGIN = 'https://mock-app-shell.sailpoint.test';
const DEFAULT_TOKEN = 'mock-sdk-token';

const DEFAULT_CONTEXT: PluginContext = {
	tenant: {
		id: 'mock-tenant',
		scriptName: 'mock-tenant',
		org: 'mock-tenant'
	},
	user: {
		id: 'mock-user',
		displayName: 'Mock User',
		email: 'mock.user@example.com'
	},
	page: {
		route: '/'
	},
	slot: {}
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
			protocolVersion,
			timestamp: now(),
			payload
		});
	};

	const dispatchResponse = (type: RuntimeResponseEnvelope['type'], requestId: string, payload: unknown): void => {
		dispatchIncoming({
			type,
			requestId,
			protocolVersion,
			timestamp: now(),
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
						ready: true
					});
					enqueue(() => {
						dispatchRequest(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, {
							token: currentToken
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
						token: currentToken
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
				protocolVersion,
				timestamp: now(),
				payload: {
					token
				}
			});
		},
		emitViewportChange(dimensions: ViewportUpdatePayload): void {
			dispatchIncoming({
				type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
				protocolVersion,
				timestamp: now(),
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

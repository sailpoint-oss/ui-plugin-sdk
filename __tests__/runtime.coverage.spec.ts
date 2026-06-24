import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../src/protocol/constants';
import type {
	MessageSource,
	MessageTarget,
	RuntimeMessageEvent,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from '../src/protocol/types';
import { InternalSailPointPluginSDK, PluginRuntimeClient } from '../src/runtime/client';
import { RuntimeEngine, RuntimeEngineError } from '../src/runtime/engine';
import { RuntimeHandshake } from '../src/runtime/handshake';
import { isEventType, isRequestType, isResponseType, validateEnvelope, validateOrigin } from '../src/runtime/validator';

/**
 * Coverage-focused suite that exercises defensive/error branches.
 */
const TRUSTED_ORIGIN = 'https://plugins.sailpoint.test';
const NOW = 1_717_600_000_000;

class FakeSourceWindow implements MessageSource {
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

	public emit(data: unknown, origin: string = TRUSTED_ORIGIN, source: unknown = this): void {
		for (const listener of this.listeners) {
			listener({ data, origin, source });
		}
	}
}

class FakeTargetWindow implements MessageTarget {
	public readonly sentMessages: Array<{ message: unknown; targetOrigin: string }> = [];

	public postMessage(message: unknown, targetOrigin: string): void {
		this.sentMessages.push({ message, targetOrigin });
	}
}

const makeRequest = (
	type: RuntimeRequestEnvelope['type'],
	requestId: string,
	payload: unknown,
	timestamp: number = NOW
): RuntimeRequestEnvelope => ({
	type,
	requestId,
	payload,
	protocolVersion: COIP_PROTOCOL_VERSION,
	timestamp
});

const makeResponse = (
	type: RuntimeResponseEnvelope['type'],
	requestId: string,
	payload: unknown,
	timestamp: number = NOW
): RuntimeResponseEnvelope => ({
	type,
	requestId,
	payload,
	protocolVersion: COIP_PROTOCOL_VERSION,
	timestamp
});

const findMessageByType = <TEnvelope extends { type: string }>(
	targetWindow: FakeTargetWindow,
	type: string
): TEnvelope => {
	const message = targetWindow.sentMessages.find(sent => {
		const envelope = sent.message as { type?: unknown };
		return envelope.type === type;
	});
	if (!message) {
		throw new Error(`Could not find message with type ${type}`);
	}
	return message.message as TEnvelope;
};

const shiftMessageByType = <TEnvelope extends { type: string }>(
	targetWindow: FakeTargetWindow,
	type: string
): TEnvelope => {
	const index = targetWindow.sentMessages.findIndex(sent => {
		const envelope = sent.message as { type?: unknown };
		return envelope.type === type;
	});
	if (index < 0) {
		throw new Error(`Could not find message with type ${type}`);
	}
	const [message] = targetWindow.sentMessages.splice(index, 1);
	return message.message as TEnvelope;
};

describe('validator branches', () => {
	const options = {
		expectedProtocolVersion: COIP_PROTOCOL_VERSION,
		maxClockSkewMs: 1000,
		now: () => NOW
	};

	it('validates trusted origins and wildcard origin', () => {
		expect(validateOrigin(TRUSTED_ORIGIN, TRUSTED_ORIGIN)).toBeNull();
		expect(validateOrigin('https://any.origin', '*')).toBeNull();
		expect(validateOrigin('https://evil.example', TRUSTED_ORIGIN)).toMatchObject({
			code: 'INVALID_ORIGIN'
		});
	});

	it('validates envelope errors and success cases', () => {
		expect(validateEnvelope(null, options)).toMatchObject({
			ok: false,
			error: { code: 'INVALID_ENVELOPE' }
		});

		expect(
			validateEnvelope(
				{
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: NOW,
					payload: {}
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'INVALID_ENVELOPE' }
		});

		expect(
			validateEnvelope(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					timestamp: NOW,
					payload: {}
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'INVALID_PROTOCOL_VERSION' }
		});

		expect(
			validateEnvelope(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					protocolVersion: '0.0.1',
					timestamp: NOW,
					payload: {},
					requestId: 'req-1'
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'INVALID_PROTOCOL_VERSION' }
		});

		expect(
			validateEnvelope(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: 'bad',
					payload: {},
					requestId: 'req-1'
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'INVALID_TIMESTAMP' }
		});

		expect(
			validateEnvelope(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: NOW - 10_000,
					payload: {},
					requestId: 'req-1'
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'INVALID_TIMESTAMP' }
		});

		expect(
			validateEnvelope(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: NOW,
					requestId: 'req-1'
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'INVALID_ENVELOPE' }
		});

		expect(
			validateEnvelope(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: NOW,
					payload: {}
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'INVALID_REQUEST_ID' }
		});

		expect(
			validateEnvelope(
				{
					type: 'SP_UNKNOWN',
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: NOW,
					payload: {}
				},
				options
			)
		).toMatchObject({
			ok: false,
			error: { code: 'UNSUPPORTED_MESSAGE_TYPE' }
		});

		expect(
			validateEnvelope(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: NOW,
					payload: {},
					requestId: 'req-1'
				},
				options
			)
		).toMatchObject({
			ok: true
		});

		expect(isRequestType(MESSAGE_TYPES.SP_PLUGIN_READY_REQ)).toBe(true);
		expect(isResponseType(MESSAGE_TYPES.SP_PLUGIN_READY_RES)).toBe(true);
		expect(isEventType(MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT)).toBe(true);
	});
});

describe('engine and client branch coverage', () => {
	it('supports default source window when browser window exists', () => {
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		engine.start();
		engine.stop();
		engine.stop();
	});

	it('rejects pending requests and waiters when stopped', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		engine.start();

		const pendingRequest = engine.sendRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, {}, { timeoutMs: 5000 });
		const pendingWaiter = engine.waitForRequest(MESSAGE_TYPES.SP_PLUGIN_READY_REQ, { timeoutMs: 5000 });

		engine.stop();

		await expect(pendingRequest).rejects.toMatchObject({
			details: { code: 'HANDSHAKE_FAILED' }
		});
		await expect(pendingWaiter).rejects.toMatchObject({
			details: { code: 'HANDSHAKE_FAILED' }
		});
	});

	it('times out waitForRequest promises', async () => {
		jest.useFakeTimers();
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		engine.start();

		const waiting = engine.waitForRequest(MESSAGE_TYPES.SP_PLUGIN_READY_REQ, { timeoutMs: 25 });
		jest.advanceTimersByTime(30);

		await expect(waiting).rejects.toMatchObject({
			details: { code: 'REQUEST_TIMEOUT' }
		});
		jest.useRealTimers();
	});

	it('sends errors for unhandled requests and ignores unmatched SP_ERROR_RES', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		engine.start();

		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ, 'missing-handler', {}));
		await Promise.resolve();

		const errorEnvelope = shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES);
		expect(errorEnvelope.requestId).toBe('missing-handler');
		expect(errorEnvelope.payload).toMatchObject({
			error: { code: 'INVALID_SEQUENCE' }
		});

		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_ERROR_RES, 'unknown', {}));
		/**
		 * Unmatched SP_ERROR_RES should not recursively emit new errors.
		 */
		expect(targetWindow.sentMessages).toHaveLength(0);
	});

	it('handles mismatched responses and response errors', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		engine.start();

		const pending = engine.sendRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, { plugin: 'x' }, { timeoutMs: 500 });
		const outbound = shiftMessageByType<RuntimeRequestEnvelope>(targetWindow, MESSAGE_TYPES.SP_PLUGIN_INIT_REQ);

		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES, outbound.requestId, {
				ok: true
			})
		);

		await expect(pending).rejects.toMatchObject({
			details: { code: 'INVALID_SEQUENCE' }
		});
		expect(
			findMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES).payload
		).toMatchObject({
			error: { code: 'INVALID_SEQUENCE' }
		});

		const pendingError = engine.sendRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, {}, { timeoutMs: 500 });
		const outboundForError = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_INIT_REQ
		);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_ERROR_RES, outboundForError.requestId, {}));

		await expect(pendingError).rejects.toBeInstanceOf(RuntimeEngineError);
		await expect(pendingError).rejects.toMatchObject({
			details: { code: 'HANDSHAKE_FAILED' }
		});
	});

	it('normalizes handler-thrown errors', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		engine.start();

		const unregisterStringError = engine.onRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, () => {
			throw new Error('plain error');
		});
		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'string-error', {}));
		await Promise.resolve();
		expect(
			shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES).payload
		).toMatchObject({
			error: { code: 'HANDSHAKE_FAILED', message: 'plain error' }
		});
		unregisterStringError();

		const unregisterRuntimeError = engine.onRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, () => {
			throw new RuntimeEngineError({
				code: 'INVALID_SEQUENCE',
				message: 'custom error'
			});
		});
		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'runtime-error', {}));
		await Promise.resolve();
		expect(
			shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES).payload
		).toMatchObject({
			error: { code: 'INVALID_SEQUENCE', message: 'custom error' }
		});
		unregisterRuntimeError();
	});

	it('emits events and supports client request wrappers', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const client = new PluginRuntimeClient({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		client.start();

		client.emitTokenUpdate({ token: 'next' });
		client.emitViewportUpdate({ width: 100, height: 200 });
		expect(
			findMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT)
		).toBeDefined();
		expect(
			findMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT)
		).toBeDefined();

		const stopRequestHandler = client.onRequest(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ, () => ({
			token: 'handled'
		}));
		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ, 'request-hook', {}));
		await Promise.resolve();
		expect(
			findMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES)
		).toBeDefined();
		stopRequestHandler();

		const directRequest = client.request(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, { sample: true });
		const outbound = shiftMessageByType<RuntimeRequestEnvelope>(targetWindow, MESSAGE_TYPES.SP_PLUGIN_INIT_REQ);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_PLUGIN_INIT_RES, outbound.requestId, { ok: true }));
		await expect(directRequest).resolves.toEqual({ ok: true });

		client.stop();
	});
});

describe('plugin SDK branch coverage', () => {
	const completeInitialization = async (
		sdk: InternalSailPointPluginSDK,
		sourceWindow: FakeSourceWindow,
		targetWindow: FakeTargetWindow
	): Promise<void> => {
		const initializePromise = sdk.initialize();

		const readyRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ
		);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_PLUGIN_READY_RES, readyRequest.requestId, { ready: true }));
		await Promise.resolve();

		sourceWindow.emit(
			makeRequest(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, 'token-delivery', {
				token: 'cached-token'
			})
		);
		await Promise.resolve();
		shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES);

		sourceWindow.emit(
			makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'init-request', {
				tenant: { id: 'tenant-1', scriptName: 'acme', org: 'acme' },
				user: { id: 'user-1', displayName: 'Test User', email: 'test@sailpoint.com' },
				page: { route: 'https://plugins.sailpoint.test/page' },
				slot: { id: 'slot-1' }
			})
		);
		await Promise.resolve();
		shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_PLUGIN_INIT_RES);

		await initializePromise;
	};

	it('uses window.parent when no explicit target window is provided', () => {
		const sourceWindow = new FakeSourceWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		expect(sdk).toBeDefined();
	});

	it('rejects initialization when token delivery payload is not an object', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		const initializePromise = sdk.initialize();
		const readyRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ
		);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_PLUGIN_READY_RES, readyRequest.requestId, { ready: true }));
		await Promise.resolve();

		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, 'token-invalid', null));
		await expect(initializePromise).rejects.toMatchObject({
			details: {
				code: 'HANDSHAKE_FAILED',
				message: 'Auth token delivery payload must be an object.'
			}
		});
		const errorResponse = shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES);
		expect(errorResponse.requestId).toBe('token-invalid');
		expect(errorResponse.payload).toMatchObject({
			error: {
				code: 'HANDSHAKE_FAILED',
				message: 'Auth token delivery payload must be an object.'
			}
		});
	});

	it('rejects initialization when token value is missing', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		const initializePromise = sdk.initialize();
		const readyRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ
		);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_PLUGIN_READY_RES, readyRequest.requestId, { ready: true }));
		await Promise.resolve();

		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, 'token-missing', {}));
		await expect(initializePromise).rejects.toMatchObject({
			details: {
				code: 'HANDSHAKE_FAILED',
				message: 'Auth token delivery payload must include a non-empty token.'
			}
		});
		const errorResponse = shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES);
		expect(errorResponse.requestId).toBe('token-missing');
		expect(errorResponse.payload).toMatchObject({
			error: {
				code: 'HANDSHAKE_FAILED',
				message: 'Auth token delivery payload must include a non-empty token.'
			}
		});
	});

	it('rejects initialization when init payload is not plugin context shaped', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		const initializePromise = sdk.initialize();
		const readyRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ
		);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_PLUGIN_READY_RES, readyRequest.requestId, { ready: true }));
		await Promise.resolve();
		sourceWindow.emit(
			makeRequest(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, 'token-valid', {
				token: 'jwt-token'
			})
		);
		await Promise.resolve();
		shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES);

		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'init-invalid', { page: {} }));
		await expect(initializePromise).rejects.toMatchObject({
			details: {
				code: 'HANDSHAKE_FAILED',
				message: 'Plugin init payload did not match expected context shape.'
			}
		});
		const errorResponse = shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES);
		expect(errorResponse.requestId).toBe('init-invalid');
		expect(errorResponse.payload).toMatchObject({
			error: {
				code: 'HANDSHAKE_FAILED',
				message: 'Plugin init payload did not match expected context shape.'
			}
		});
	});

	it('throws from getContext when initialize does not hydrate context', async () => {
		class BrokenContextSdk extends InternalSailPointPluginSDK {
			public override async initialize(): Promise<void> {
				return Promise.resolve();
			}
		}

		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new BrokenContextSdk({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await expect(sdk.getContext()).rejects.toMatchObject({
			details: {
				code: 'HANDSHAKE_FAILED',
				message: 'Plugin context is not available after initialization.'
			}
		});
	});

	it('returns cached token on non-force refresh and delegates events facade', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);
		const messageCountBeforeTokenRead = targetWindow.sentMessages.length;
		await expect(sdk.getToken()).resolves.toBe('cached-token');
		expect(targetWindow.sentMessages.length).toBe(messageCountBeforeTokenRead);

		const onViewportChange = jest.fn();
		const unsubscribeViewport = sdk.events.onViewportChange(onViewportChange);
		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
			payload: { width: 900, height: 700 },
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW
		});
		expect(onViewportChange).toHaveBeenCalledWith({ width: 900, height: 700 });
		unsubscribeViewport();
	});

	it('cleans up token subscription on stop and handshake delegates to initialize', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);
		sdk.stop();

		class HandshakeDelegationSdk extends InternalSailPointPluginSDK {
			public called = false;
			public override async initialize(): Promise<void> {
				this.called = true;
			}
		}

		const delegationSdk = new HandshakeDelegationSdk({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		await delegationSdk.handshake();
		expect(delegationSdk.called).toBe(true);
	});
});

describe('handshake branch coverage', () => {
	it('is idempotent after successful completion', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		engine.start();

		const handshake = new RuntimeHandshake({
			engine,
			requestTimeoutMs: 500
		});

		const firstPass = handshake.perform({
			authToken: 'jwt-token',
			initPayload: { pluginId: 'idempotent' }
		});
		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_READY_REQ, 'ready-1', {}));
		await Promise.resolve();
		await Promise.resolve();
		const tokenReq = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ
		);
		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES, tokenReq.requestId, { delivered: true })
		);
		await Promise.resolve();
		await Promise.resolve();
		const initReq = shiftMessageByType<RuntimeRequestEnvelope>(targetWindow, MESSAGE_TYPES.SP_PLUGIN_INIT_REQ);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_PLUGIN_INIT_RES, initReq.requestId, { initialized: true }));
		await firstPass;

		const messageCountAfterFirstHandshake = targetWindow.sentMessages.length;
		await handshake.perform({
			authToken: 'jwt-token',
			initPayload: { pluginId: 'idempotent' }
		});
		expect(targetWindow.sentMessages.length).toBe(messageCountAfterFirstHandshake);
	});
});

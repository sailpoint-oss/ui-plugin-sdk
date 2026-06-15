import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../src/protocol/constants';
import type {
	MessageSource,
	MessageTarget,
	RuntimeMessageEvent,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from '../src/protocol/types';
import { PluginRuntimeClient } from '../src/runtime/client';
import { RuntimeEngine, RuntimeEngineError } from '../src/runtime/engine';

/**
 * Baseline behavior tests for runtime request/response/event flows.
 */
const TRUSTED_ORIGIN = 'https://plugins.sailpoint.test';
const UNTRUSTED_ORIGIN = 'https://evil.example';
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
		/**
		 * Simulates browser "message" events synchronously for deterministic tests.
		 */
		for (const listener of this.listeners) {
			listener({
				data,
				origin,
				source
			});
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

const findAndRemoveMessageByType = <TEnvelope extends { type: string }>(
	targetWindow: FakeTargetWindow,
	type: string
): TEnvelope => {
	const index = targetWindow.sentMessages.findIndex(sent => {
		const message = sent.message as { type?: unknown };
		return message.type === type;
	});

	if (index === -1) {
		throw new Error(`Could not find message with type ${type}`);
	}

	const [message] = targetWindow.sentMessages.splice(index, 1);
	return message.message as TEnvelope;
};

describe('RuntimeEngine', () => {
	it('maps request and response messages into promises', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		engine.start();

		const resultPromise = engine.sendRequest(
			MESSAGE_TYPES.SP_PLUGIN_INIT_REQ,
			{ pluginName: 'Accounts' },
			{ timeoutMs: 500 }
		);

		const outboundRequest = findAndRemoveMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_INIT_REQ
		);
		expect(outboundRequest.payload).toEqual({ pluginName: 'Accounts' });

		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_PLUGIN_INIT_RES, outboundRequest.requestId, {
				initialised: true
			})
		);

		await expect(resultPromise).resolves.toEqual({ initialised: true });
	});

	it('routes unsolicited events to subscribers and supports unsubscribe', () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		engine.start();

		const received: unknown[] = [];
		const unsubscribe = engine.onEvent(MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT, eventEnvelope => {
			received.push(eventEnvelope.payload);
		});

		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
			payload: { width: 1200, height: 800 },
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW
		});
		expect(received).toEqual([{ width: 1200, height: 800 }]);

		unsubscribe();
		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
			payload: { width: 1440, height: 900 },
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW
		});
		expect(received).toHaveLength(1);
	});

	it('handles incoming requests via registered handlers', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		engine.start();
		engine.onRequest(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ, () => ({
			token: 'runtime-token'
		}));

		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ, 'req-1', {}));
		await Promise.resolve();

		const response = findAndRemoveMessageByType<RuntimeResponseEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES
		);
		expect(response.requestId).toBe('req-1');
		expect(response.payload).toEqual({ token: 'runtime-token' });
	});

	it('sends SP_ERROR_RES for invalid origin and malformed envelopes', () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		engine.start();

		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_READY_REQ, 'req-bad-origin', {}), UNTRUSTED_ORIGIN);

		const invalidOriginError = findAndRemoveMessageByType<RuntimeResponseEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_ERROR_RES
		);
		expect(invalidOriginError.requestId).toBe('req-bad-origin');
		expect(invalidOriginError.payload).toMatchObject({
			error: { code: 'INVALID_ORIGIN' }
		});

		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
			requestId: 'req-malformed',
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW
		});

		const malformedError = findAndRemoveMessageByType<RuntimeResponseEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_ERROR_RES
		);
		expect(malformedError.requestId).toBe('req-malformed');
		expect(malformedError.payload).toMatchObject({
			error: { code: 'INVALID_ENVELOPE' }
		});
	});

	it('sends SP_ERROR_RES for out-of-sequence responses', () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const engine = new RuntimeEngine({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		engine.start();
		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_PLUGIN_INIT_RES, 'req-missing', {
				initialized: true
			})
		);

		const sequenceError = findAndRemoveMessageByType<RuntimeResponseEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_ERROR_RES
		);
		expect(sequenceError.requestId).toBe('req-missing');
		expect(sequenceError.payload).toMatchObject({
			error: { code: 'INVALID_SEQUENCE' }
		});
	});

	it('times out pending requests', async () => {
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

		const resultPromise = engine.sendRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, {}, { timeoutMs: 100 });

		jest.advanceTimersByTime(101);
		await expect(resultPromise).rejects.toBeInstanceOf(RuntimeEngineError);
		await expect(resultPromise).rejects.toMatchObject({
			details: {
				code: 'REQUEST_TIMEOUT'
			}
		});

		jest.useRealTimers();
	});
});

describe('PluginRuntimeClient', () => {
	it('performs handshake in READY -> token -> init order', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const client = new PluginRuntimeClient({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			getAuthToken: () => 'jwt-token',
			getInitPayload: () => ({
				pluginId: 'hr-plugin'
			}),
			requestTimeoutMs: 500
		});

		client.start();

		const handshakePromise = client.handshake();
		/**
		 * Handshake starts by waiting for inbound READY from plugin iframe.
		 */
		sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_READY_REQ, 'ready-1', {}));
		await Promise.resolve();

		const readyResponse = findAndRemoveMessageByType<RuntimeResponseEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_READY_RES
		);
		expect(readyResponse.requestId).toBe('ready-1');
		await Promise.resolve();

		const tokenRequest = findAndRemoveMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ
		);
		expect(tokenRequest.payload).toEqual({ token: 'jwt-token' });

		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES, tokenRequest.requestId, {
				delivered: true
			})
		);
		await Promise.resolve();
		await Promise.resolve();

		const initRequest = findAndRemoveMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_INIT_REQ
		);
		expect(initRequest.payload).toEqual({ pluginId: 'hr-plugin' });

		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_PLUGIN_INIT_RES, initRequest.requestId, {
				initialised: true
			})
		);

		await expect(handshakePromise).resolves.toBeUndefined();
	});

	it('supports post-handshake token and viewport APIs', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const client = new PluginRuntimeClient({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			getAuthToken: () => 'jwt-token'
		});

		client.start();

		const currentTokenPromise = client.getCurrentToken();
		const tokenRequest = findAndRemoveMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ
		);

		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, tokenRequest.requestId, {
				token: 'refreshed-token'
			})
		);
		await expect(currentTokenPromise).resolves.toBe('refreshed-token');

		const onTokenUpdate = jest.fn();
		const onViewportUpdate = jest.fn();
		const unsubscribeToken = client.onTokenUpdate(onTokenUpdate);
		const unsubscribeViewport = client.onViewportUpdate(onViewportUpdate);

		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT,
			payload: { token: 'rotated-token' },
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW
		});
		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
			payload: { width: 800, height: 600 },
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW
		});

		expect(onTokenUpdate).toHaveBeenCalledWith({ token: 'rotated-token' });
		expect(onViewportUpdate).toHaveBeenCalledWith({ width: 800, height: 600 });

		unsubscribeToken();
		unsubscribeViewport();
	});
});

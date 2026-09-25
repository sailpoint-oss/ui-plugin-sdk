import { ApiError } from '../src/index';
import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../src/protocol/constants';
import type {
	MessageSource,
	MessageTarget,
	RuntimeEventEnvelope,
	RuntimeMessageEvent,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from '../src/protocol/types';
import { InternalSailPointPluginSDK, PluginRuntimeClient } from '../src/runtime/client';
import { RuntimeEngine, RuntimeEngineError } from '../src/runtime/engine';
import { RuntimeHandshake } from '../src/runtime/handshake';
import { extractSubPath } from '../src/runtime/page-route';
import { isEventType, isRequestType, isResponseType, validateEnvelope, validateOrigin } from '../src/runtime/validator';

/**
 * Coverage-focused suite that exercises defensive/error branches.
 */
const TRUSTED_ORIGIN = 'https://plugins.sailpoint.test';
const NOW = 1_717_600_000_000;
const NOW_ISO = new Date(NOW).toISOString();

/**
 * Exhaustive capability map, as App Shell always sends it.
 */
const CAPABILITIES = {
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

const TENANT_FIXTURE = {
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
};

const USER_FIXTURE = {
	id: 'user-1',
	displayName: 'Test User',
	email: 'test@sailpoint.com',
	capabilities: CAPABILITIES
};

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
	timestamp: string = NOW_ISO
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
	timestamp: string = NOW_ISO
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

const toBase64Url = (value: string): string => {
	return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const createJwtWithExp = (expSeconds: number): string => {
	return `${toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${toBase64Url(
		JSON.stringify({ exp: expSeconds })
	)}.signature`;
};

const jsonResponse = (status: number, payload: unknown, statusText = ''): Response => {
	const serializedBody = JSON.stringify(payload);
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		json: async () => payload,
		text: async () => serializedBody ?? ''
	} as Response;
};

const textResponse = (status: number, body: string, statusText = ''): Response => {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		text: async () => body
	} as Response;
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
					timestamp: NOW_ISO,
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
					timestamp: NOW_ISO,
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
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					protocolVersion: '0.0.1',
					timestamp: NOW_ISO,
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
					timestamp: new Date(NOW - 10_000).toISOString(),
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
					timestamp: NOW_ISO,
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
					timestamp: NOW_ISO,
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
					timestamp: NOW_ISO,
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
					timestamp: NOW_ISO,
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
		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_ERROR_RES,
			requestId: 'app-shell-error-id',
			timestamp: NOW_ISO,
			payload: {
				type: 'ERR_UNSUPPORTED_VERSION',
				requestId: outboundForError.requestId
			}
		});

		await expect(pendingError).rejects.toBeInstanceOf(RuntimeEngineError);
		await expect(pendingError).rejects.toMatchObject({
			details: {
				code: 'HANDSHAKE_FAILED',
				message: 'App Shell rejected request with ERR_UNSUPPORTED_VERSION.',
				details: {
					hostErrorCode: 'ERR_UNSUPPORTED_VERSION'
				}
			}
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

describe('extractSubPath', () => {
	const HOST = 'https://acme.identitynow.com';

	it.each([
		['start route (alias)', `${HOST}/ui/plugin/my-plugin`, ''],
		['start route with trailing slash', `${HOST}/ui/plugin/my-plugin/`, ''],
		['one level', `${HOST}/ui/plugin/my-plugin/settings`, 'settings'],
		['multi level', `${HOST}/ui/plugin/my-plugin/settings/general/advanced`, 'settings/general/advanced'],
		[
			'full-page mount by pluginId UUID',
			`${HOST}/ui/plugin/3f2c1a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f/settings`,
			'settings'
		],
		[
			'dev alias query is not part of the path',
			`${HOST}/ui/plugin/my-plugin/settings?spPluginDev=my-plugin`,
			'settings'
		],
		['query and hash excluded', `${HOST}/ui/plugin/my-plugin/accounts?tab=2#top`, 'accounts'],
		['percent-encoding preserved', `${HOST}/ui/plugin/my-plugin/a%20b`, 'a%20b'],
		['doubled slashes collapsed', `${HOST}/ui/plugin/my-plugin//x///y`, 'x/y'],
		['plugin segment without a route key', `${HOST}/ui/plugin`, ''],
		['no app shell prefix', `${HOST}/plugin/my-plugin/settings`, 'settings'],
		['plugin-less host page (slot mount)', `${HOST}/ui/a/admin/identities`, ''],
		['plural plugins is not the plugin segment', `${HOST}/plugins/example`, ''],
		['malformed href', 'not a url', ''],
		['empty string', '', '']
	])('%s', (_label, route, expected) => {
		expect(extractSubPath(route)).toBe(expected);
	});
});

describe('plugin SDK branch coverage', () => {
	const completeInitialization = async (
		sdk: InternalSailPointPluginSDK,
		sourceWindow: FakeSourceWindow,
		targetWindow: FakeTargetWindow,
		initialToken = 'cached-token',
		initPayload?: unknown
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
				token: initialToken
			})
		);
		await Promise.resolve();
		shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES);

		const defaultInitPayload = {
			pluginConfiguration: { pluginId: 'plugin-1' },
			tenant: TENANT_FIXTURE,
			user: USER_FIXTURE,
			page: { route: 'https://plugins.sailpoint.test/page' },
			slot: { id: 'slot-1' }
		};
		sourceWindow.emit(
			makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'init-request', {
				...(initPayload ?? defaultInitPayload)
			})
		);
		await Promise.resolve();
		shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_PLUGIN_INIT_RES);

		await initializePromise;
	};

	describe('page.subPath', () => {
		const initPayloadWithRoute = (route: string): Record<string, unknown> => ({
			pluginConfiguration: { pluginId: '3f2c1a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f' },
			tenant: TENANT_FIXTURE,
			user: USER_FIXTURE,
			page: { route },
			slot: {}
		});

		it('derives subPath from the host route and leaves route unchanged', async () => {
			const route = 'https://acme.identitynow.com/ui/plugin/my-plugin/settings/general?tab=2#top';
			const sourceWindow = new FakeSourceWindow();
			const targetWindow = new FakeTargetWindow();
			const sdk = new InternalSailPointPluginSDK({
				sourceWindow,
				targetWindow,
				targetOrigin: TRUSTED_ORIGIN,
				now: () => NOW
			});
			await completeInitialization(sdk, sourceWindow, targetWindow, 'cached-token', initPayloadWithRoute(route));

			const context = await sdk.getContext();

			expect(context.page).toEqual({ route, subPath: 'settings/general' });
		});

		it('round-trips through navigation.setRoute unchanged', async () => {
			const sourceWindow = new FakeSourceWindow();
			const targetWindow = new FakeTargetWindow();
			const sdk = new InternalSailPointPluginSDK({
				sourceWindow,
				targetWindow,
				targetOrigin: TRUSTED_ORIGIN,
				now: () => NOW
			});
			await completeInitialization(
				sdk,
				sourceWindow,
				targetWindow,
				'cached-token',
				initPayloadWithRoute('https://acme.identitynow.com/ui/plugin/my-plugin/a%20b/c')
			);

			await sdk.setRoute((await sdk.getContext()).page.subPath);

			const routeChange = findMessageByType<RuntimeEventEnvelope>(
				targetWindow,
				MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT
			);
			expect(routeChange.payload).toEqual({ subPath: 'a%20b/c' });
		});
	});

	describe('navigation.setRoute', () => {
		const createSdk = (
			overrides: Partial<ConstructorParameters<typeof InternalSailPointPluginSDK>[0]> = {}
		): {
			sdk: InternalSailPointPluginSDK;
			sourceWindow: FakeSourceWindow;
			targetWindow: FakeTargetWindow;
		} => {
			const sourceWindow = new FakeSourceWindow();
			const targetWindow = new FakeTargetWindow();
			const sdk = new InternalSailPointPluginSDK({
				sourceWindow,
				targetWindow,
				targetOrigin: TRUSTED_ORIGIN,
				now: () => NOW,
				...overrides
			});
			return { sdk, sourceWindow, targetWindow };
		};

		const routeEvents = (targetWindow: FakeTargetWindow): Array<{ message: unknown; targetOrigin: string }> =>
			targetWindow.sentMessages.filter(
				sent => (sent.message as { type?: unknown }).type === MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT
			);

		it('emits one SP_ROUTE_CHANGE_EVT with a COIP event envelope after the handshake', async () => {
			const { sdk, sourceWindow, targetWindow } = createSdk();
			await completeInitialization(sdk, sourceWindow, targetWindow);

			await sdk.setRoute('settings/general');

			const sent = routeEvents(targetWindow);
			expect(sent).toHaveLength(1);
			expect(sent[0].targetOrigin).toBe(TRUSTED_ORIGIN);
			expect(sent[0].message).toStrictEqual({
				type: MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT,
				protocolVersion: COIP_PROTOCOL_VERSION,
				timestamp: NOW_ISO,
				payload: { subPath: 'settings/general' }
			});
		});

		it('stamps a configured protocolVersion override', () => {
			/**
			 * Calls emitRouteChange directly: the fake host replies with the default
			 * protocol version, so a full handshake would reject the override.
			 */
			const { sdk, targetWindow } = createSdk({ protocolVersion: 'v9.9' });

			sdk.emitRouteChange({ subPath: 'x' });

			expect(routeEvents(targetWindow)[0].message).toMatchObject({ protocolVersion: 'v9.9' });
		});

		it('waits for the handshake before emitting when called early', async () => {
			const { sdk, sourceWindow, targetWindow } = createSdk();
			const postSpy = jest.spyOn(targetWindow, 'postMessage');

			const routePromise = sdk.setRoute('early');
			expect((postSpy.mock.calls[0][0] as { type: string }).type).toBe(MESSAGE_TYPES.SP_PLUGIN_READY_REQ);
			expect(routeEvents(targetWindow)).toHaveLength(0);

			await completeInitialization(sdk, sourceWindow, targetWindow);
			await routePromise;

			const sentTypes = postSpy.mock.calls.map(([message]) => (message as { type: string }).type);
			expect(sentTypes.indexOf(MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT)).toBeGreaterThan(
				sentTypes.indexOf(MESSAGE_TYPES.SP_PLUGIN_INIT_RES)
			);
		});

		it('shares one handshake across concurrent calls and emits in call order', async () => {
			const { sdk, sourceWindow, targetWindow } = createSdk();
			const postSpy = jest.spyOn(targetWindow, 'postMessage');

			const first = sdk.setRoute('a');
			const context = sdk.getContext();
			const second = sdk.setRoute('b');
			await completeInitialization(sdk, sourceWindow, targetWindow);
			await Promise.all([first, context, second]);

			const readyCount = postSpy.mock.calls.filter(
				([message]) => (message as { type: string }).type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ
			).length;
			expect(readyCount).toBe(1);
			expect(routeEvents(targetWindow).map(sent => (sent.message as RuntimeEventEnvelope).payload)).toEqual([
				{ subPath: 'a' },
				{ subPath: 'b' }
			]);
		});

		it('rejects and emits nothing when the handshake fails', async () => {
			const { sdk, targetWindow } = createSdk({ requestTimeoutMs: 5 });

			await expect(sdk.setRoute('never')).rejects.toMatchObject({
				details: { code: 'REQUEST_TIMEOUT' }
			});
			expect(routeEvents(targetWindow)).toHaveLength(0);
		});

		it('rejects a non-string subPath with TypeError without starting the handshake', async () => {
			const { sdk, targetWindow } = createSdk();

			await expect(sdk.setRoute(123)).rejects.toThrow(
				new TypeError('navigation.setRoute expects subPath to be a string.')
			);
			expect(targetWindow.sentMessages).toHaveLength(0);
		});

		it.each([
			['/settings', 'settings'],
			['/', ''],
			['', ''],
			['a?b=1#c', 'a?b=1#c'],
			['//x', '/x']
		])('normalizes %p to %p by stripping at most one leading slash', async (input, expected) => {
			const { sdk, sourceWindow, targetWindow } = createSdk();
			await completeInitialization(sdk, sourceWindow, targetWindow);

			await sdk.setRoute(input);

			expect((routeEvents(targetWindow)[0].message as RuntimeEventEnvelope).payload).toEqual({
				subPath: expected
			});
		});

		it('delegates the navigation convenience object to setRoute', async () => {
			const { sdk, sourceWindow, targetWindow } = createSdk();
			await completeInitialization(sdk, sourceWindow, targetWindow);

			await sdk.navigation.setRoute('via-namespace');

			expect((routeEvents(targetWindow)[0].message as RuntimeEventEnvelope).payload).toEqual({
				subPath: 'via-namespace'
			});
		});

		it('ignores an inbound SP_ROUTE_CHANGE_EVT from the host', async () => {
			const { sdk, sourceWindow, targetWindow } = createSdk();
			await completeInitialization(sdk, sourceWindow, targetWindow);
			const onViewportChange = jest.fn();
			sdk.events.onViewportChange(onViewportChange);
			const sentBefore = targetWindow.sentMessages.length;

			expect(() =>
				sourceWindow.emit({
					type: MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT,
					payload: { subPath: 'echo' },
					protocolVersion: COIP_PROTOCOL_VERSION,
					timestamp: NOW_ISO
				})
			).not.toThrow();
			sourceWindow.emit({
				type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
				payload: { width: 1, height: 2 },
				protocolVersion: COIP_PROTOCOL_VERSION,
				timestamp: NOW_ISO
			});

			expect(targetWindow.sentMessages).toHaveLength(sentBefore);
			expect(onViewportChange).toHaveBeenCalledWith({ width: 1, height: 2 });
		});
	});

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
				message: 'Auth token delivery payload must include a non-empty token or accessToken.'
			}
		});
		const errorResponse = shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES);
		expect(errorResponse.requestId).toBe('token-missing');
		expect(errorResponse.payload).toMatchObject({
			error: {
				code: 'HANDSHAKE_FAILED',
				message: 'Auth token delivery payload must include a non-empty token or accessToken.'
			}
		});
	});

	/**
	 * One case per field the post-PLTUI-16110 contract made required.
	 *
	 * Each mutates the otherwise-valid App Shell payload in exactly one way, so a
	 * passing case proves that specific validation branch rejects rather than that
	 * the payload is broken generally.
	 */
	describe('strict init payload validation', () => {
		const validPayload = (): Record<string, unknown> => ({
			pluginConfiguration: { pluginId: 'plugin-1' },
			tenantContext: { ...TENANT_FIXTURE },
			userContext: { ...USER_FIXTURE },
			pageContext: { route: 'https://plugins.sailpoint.test/page' },
			slotContext: {}
		});

		const withoutTenantField = (field: string): Record<string, unknown> => {
			const payload = validPayload();
			const tenant = { ...(payload.tenantContext as Record<string, unknown>) };
			delete tenant[field];
			payload.tenantContext = tenant;
			return payload;
		};

		const withCapabilities = (capabilities: unknown): Record<string, unknown> => {
			const payload = validPayload();
			payload.userContext = { ...USER_FIXTURE, capabilities };
			return payload;
		};

		const partialCapabilities = (): Record<string, unknown> => {
			const capabilities: Record<string, unknown> = { ...CAPABILITIES };
			delete capabilities.isCloudGovUser;
			return capabilities;
		};

		const rejectionCases: Array<[string, Record<string, unknown>]> = [
			['capabilities omitted entirely', withCapabilities(undefined)],
			['capabilities sent as the legacy string array', withCapabilities(['ORG_ADMIN'])],
			['capabilities missing one flag', withCapabilities(partialCapabilities())],
			['capabilities carrying a non-boolean flag', withCapabilities({ ...CAPABILITIES, isOrgAdmin: 'true' })],
			['tenant name missing', withoutTenantField('name')],
			['tenant pod missing', withoutTenantField('pod')],
			['tenant region missing', withoutTenantField('region')],
			['tenant apiUrl missing', withoutTenantField('apiUrl')],
			['tenant products missing', withoutTenantField('products')]
		];

		it.each(rejectionCases)('fails the handshake when %s', async (_label, payload) => {
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

			sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'init-strict', payload));
			await expect(initializePromise).rejects.toMatchObject({
				details: {
					code: 'HANDSHAKE_FAILED',
					message: 'Plugin init payload did not match expected context shape.'
				}
			});

			/**
			 * The rejection must be reported back to App Shell against the
			 * originating requestId, not just thrown locally.
			 */
			const errorResponse = shiftMessageByType<RuntimeResponseEnvelope>(targetWindow, MESSAGE_TYPES.SP_ERROR_RES);
			expect(errorResponse.requestId).toBe('init-strict');
			expect(errorResponse.payload).toMatchObject({
				error: {
					code: 'HANDSHAKE_FAILED'
				}
			});
		});

		it('fails the handshake when tenant apiUrl carries no idn string', async () => {
			const payload = validPayload();
			payload.tenantContext = { ...TENANT_FIXTURE, apiUrl: { idn: 42 } };

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

			sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'init-apiurl', payload));
			await expect(initializePromise).rejects.toMatchObject({
				details: {
					code: 'HANDSHAKE_FAILED'
				}
			});
		});

		it('fails the handshake when pluginConfiguration is absent', async () => {
			const payload = validPayload();
			delete payload.pluginConfiguration;

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

			sourceWindow.emit(makeRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, 'init-no-config', payload));
			await expect(initializePromise).rejects.toMatchObject({
				details: {
					code: 'HANDSHAKE_FAILED'
				}
			});
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

	it('throws rather than guessing an API host when tenant context is absent', async () => {
		/**
		 * There is no hostname-derivation fallback since CSTM-354, so an
		 * un-hydrated context must surface as an error instead of a request aimed
		 * at a guessed tenant subdomain.
		 */
		class BrokenContextSdk extends InternalSailPointPluginSDK {
			public override async initialize(): Promise<void> {
				return Promise.resolve();
			}
		}

		const fetchMock = jest.fn();
		const sdk = new BrokenContextSdk({
			sourceWindow: new FakeSourceWindow(),
			targetWindow: new FakeTargetWindow(),
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await expect(sdk.get('/v3/accounts')).rejects.toMatchObject({
			details: {
				code: 'INVALID_SEQUENCE',
				message: 'Tenant context is required to construct the API base URL.'
			}
		});
		expect(fetchMock).not.toHaveBeenCalled();
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
			timestamp: NOW_ISO
		});
		expect(onViewportChange).toHaveBeenCalledWith({ width: 900, height: 700 });
		unsubscribeViewport();
	});

	it('refreshes automatically when cached jwt token is expired', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});
		const expiredToken = createJwtWithExp(Math.floor(NOW / 1000) - 60);

		await completeInitialization(sdk, sourceWindow, targetWindow, expiredToken);

		const refreshPromise = sdk.getToken();
		await Promise.resolve();
		const refreshRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ
		);
		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, refreshRequest.requestId, {
				token: 'fresh-after-expiry'
			})
		);

		await expect(refreshPromise).resolves.toBe('fresh-after-expiry');
	});

	it('forces token refresh and deduplicates concurrent refresh calls', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		const firstRefresh = sdk.getToken(true);
		const secondRefresh = sdk.getToken(true);
		await Promise.resolve();

		const refreshRequests = targetWindow.sentMessages.filter(sent => {
			const envelope = sent.message as { type?: unknown };
			return envelope.type === MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ;
		});
		expect(refreshRequests).toHaveLength(1);

		const refreshRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ
		);
		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, refreshRequest.requestId, {
				token: 'fresh-token'
			})
		);

		await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toEqual(['fresh-token', 'fresh-token']);
		await expect(sdk.getToken()).resolves.toBe('fresh-token');
	});

	it('uses token update events to refresh the cached token value', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);
		const messageCountBeforeUpdate = targetWindow.sentMessages.length;

		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT,
			payload: { token: 'rotated-from-event' },
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW_ISO
		});

		await expect(sdk.getToken()).resolves.toBe('rotated-from-event');
		expect(targetWindow.sentMessages.length).toBe(messageCountBeforeUpdate);
	});

	it('ignores malformed token update events and preserves cached token', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);
		const messageCountBeforeUpdate = targetWindow.sentMessages.length;

		sourceWindow.emit({
			type: MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT,
			payload: { token: '' },
			protocolVersion: COIP_PROTOCOL_VERSION,
			timestamp: NOW_ISO
		});

		await expect(sdk.getToken()).resolves.toBe('cached-token');
		expect(targetWindow.sentMessages.length).toBe(messageCountBeforeUpdate);
	});

	it('adds bearer token for get/post wrappers and preserves provided headers', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest
			.fn()
			.mockResolvedValueOnce(jsonResponse(200, { id: 'account-1' }))
			.mockResolvedValueOnce(jsonResponse(200, { created: true }));
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		const getResult = await sdk.get<{ id: string }>('/v3/accounts/account-1');
		const postResult = await sdk.post<{ created: boolean }>('/v3/accounts', {
			name: 'sample'
		});
		expect(getResult).toEqual({ id: 'account-1' });
		expect(postResult).toEqual({ created: true });

		const getCall = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
		expect(getCall[0]).toBe('https://acme.api.identitynow.com/v3/accounts/account-1');
		expect(getCall[1].method).toBe('GET');
		const getHeaders = new Headers(getCall[1].headers);
		expect(getHeaders.get('Authorization')).toBe('Bearer cached-token');

		const postCall = fetchMock.mock.calls[1] as [RequestInfo | URL, RequestInit];
		expect(postCall[0]).toBe('https://acme.api.identitynow.com/v3/accounts');
		expect(postCall[1].method).toBe('POST');
		expect(postCall[1].body).toBe('{"name":"sample"}');
		const postHeaders = new Headers(postCall[1].headers);
		expect(postHeaders.get('Authorization')).toBe('Bearer cached-token');
		expect(postHeaders.get('Content-Type')).toBe('application/json');
	});

	it('throws ApiError with a parsed JSON body for non-OK api responses', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const responseBody = {
			messages: [{ text: 'The account name is required.' }]
		};
		const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(422, responseBody, 'Unprocessable Entity'));
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		let caughtError: unknown;
		try {
			await sdk.post(' /v3/accounts ', { name: '' });
		} catch (error) {
			caughtError = error;
		}

		expect(caughtError).toBeInstanceOf(ApiError);
		expect(caughtError).not.toBeInstanceOf(RuntimeEngineError);
		expect(caughtError).toMatchObject({
			name: 'ApiError',
			message: 'API request failed with status 422 Unprocessable Entity.',
			status: 422,
			statusText: 'Unprocessable Entity',
			path: '/v3/accounts',
			body: responseBody
		});
	});

	it('throws ApiError with a null body for an empty 5xx response', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(503, undefined, 'Service Unavailable'));
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		await expect(sdk.get('/v3/accounts')).rejects.toMatchObject({
			status: 503,
			statusText: 'Service Unavailable',
			path: '/v3/accounts',
			body: null
		});
	});

	it('retains a non-JSON API error body as raw text', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest
			.fn()
			.mockResolvedValueOnce(textResponse(502, 'upstream service unavailable', 'Bad Gateway'));
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		await expect(sdk.get('/v3/accounts')).rejects.toMatchObject({
			status: 502,
			statusText: 'Bad Gateway',
			path: '/v3/accounts',
			body: 'upstream service unavailable'
		});
	});

	it('still throws ApiError when the error response body cannot be read', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest.fn().mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			text: async () => {
				throw new Error('body stream failed');
			}
		} as Response);
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		await expect(sdk.get('/v3/accounts')).rejects.toMatchObject({
			status: 500,
			statusText: 'Internal Server Error',
			path: '/v3/accounts',
			body: null
		});
	});

	it('returns undefined for a successful 204 API response without reading a body', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const response = jsonResponse(204, undefined, 'No Content');
		const textSpy = jest.spyOn(response, 'text');
		const fetchMock = jest.fn().mockResolvedValueOnce(response);
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		await expect(sdk.get('/v3/accounts')).resolves.toBeUndefined();
		expect(textSpy).not.toHaveBeenCalled();
	});

	it('normalizes renderer context keys and uses tenant apiUrl.idn when provided', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(200, { ok: true }));
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow, 'cached-token', {
			pluginConfiguration: { pluginId: 'plugin-1' },
			tenantContext: {
				...TENANT_FIXTURE,
				pod: 'us-west-2',
				region: 'us',
				apiUrl: {
					idn: 'https://acme-fedramp.api.identitynow.com/'
				}
			},
			userContext: USER_FIXTURE,
			pageContext: {
				route: 'https://plugins.sailpoint.test/page'
			},
			slotContext: {
				id: 'slot-from-renderer'
			}
		});

		await expect(sdk.getContext()).resolves.toMatchObject({
			tenant: {
				apiUrl: {
					idn: 'https://acme-fedramp.api.identitynow.com/'
				}
			},
			slot: {
				id: 'slot-from-renderer'
			}
		});

		await expect(sdk.get<{ ok: boolean }>('/v3/identity')).resolves.toEqual({ ok: true });
		const getCall = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
		expect(getCall[0]).toBe('https://acme-fedramp.api.identitynow.com/v3/identity');
		expect(new Headers(getCall[1].headers).get('Authorization')).toBe('Bearer cached-token');
	});

	it('does not call fetch when token refresh response is invalid and allows retry', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		class ForceRefreshWrapperSdk extends InternalSailPointPluginSDK {
			public override async getToken(): Promise<string> {
				return super.getToken(true);
			}
		}
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { ok: true }));

		const sdk = new ForceRefreshWrapperSdk({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		const failedRequest = sdk.get('/failure-case');
		/**
		 * api.get now awaits initialize() before token refresh, so flush two
		 * microtasks before the forced-refresh request is posted.
		 */
		await Promise.resolve();
		await Promise.resolve();
		const invalidRefresh = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ
		);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, invalidRefresh.requestId, {}));

		await expect(failedRequest).rejects.toMatchObject({
			details: {
				code: 'INVALID_SEQUENCE',
				message: 'Current token response payload must include a non-empty token or accessToken.'
			}
		});
		expect(fetchMock).not.toHaveBeenCalled();

		const retryRefresh = sdk.getToken(true);
		await Promise.resolve();
		const retryRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ
		);
		sourceWindow.emit(
			makeResponse(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, retryRequest.requestId, {
				token: 'recovered-token'
			})
		);
		await expect(retryRefresh).resolves.toBe('recovered-token');
	});

	it('retries once with fresh token when api responds with 401', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest
			.fn()
			.mockResolvedValueOnce(jsonResponse(401, { error: 'expired' }))
			.mockResolvedValueOnce(jsonResponse(200, { recovered: true }));
		class RetryTokenSdk extends InternalSailPointPluginSDK {
			public tokenCalls: boolean[] = [];

			public override async getToken(forceRefresh = false): Promise<string> {
				this.tokenCalls.push(forceRefresh);
				return forceRefresh ? 'fresh-token-after-401' : 'cached-token';
			}
		}
		const sdk = new RetryTokenSdk({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);
		const requestPromise = sdk.get<{ recovered: boolean }>('/v3/identity');

		await expect(requestPromise).resolves.toEqual({ recovered: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(sdk.tokenCalls).toEqual([false, true]);

		const firstCall = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
		const secondCall = fetchMock.mock.calls[1] as [RequestInfo | URL, RequestInit];
		expect(new Headers(firstCall[1].headers).get('Authorization')).toBe('Bearer cached-token');
		expect(new Headers(secondCall[1].headers).get('Authorization')).toBe('Bearer fresh-token-after-401');
	});

	it('throws ApiError from the final response when the 401 retry also fails', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest
			.fn()
			.mockResolvedValueOnce(jsonResponse(401, { error: 'expired' }, 'Unauthorized'))
			.mockResolvedValueOnce(jsonResponse(403, { error: 'forbidden' }, 'Forbidden'));
		class RetryTokenSdk extends InternalSailPointPluginSDK {
			public tokenCalls: boolean[] = [];

			public override async getToken(forceRefresh = false): Promise<string> {
				this.tokenCalls.push(forceRefresh);
				return forceRefresh ? 'fresh-token-after-401' : 'cached-token';
			}
		}
		const sdk = new RetryTokenSdk({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		await expect(sdk.get('/v3/identity')).rejects.toMatchObject({
			status: 403,
			statusText: 'Forbidden',
			path: '/v3/identity',
			body: { error: 'forbidden' }
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(sdk.tokenCalls).toEqual([false, true]);
	});

	it('rejects absolute urls for api wrappers', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);

		await expect(sdk.get('https://external.example/api')).rejects.toMatchObject({
			details: {
				code: 'INVALID_SEQUENCE',
				message: 'api.get/api.post expect a path suffix, not an absolute URL.'
			}
		});
	});

	it('self-initializes api.get before any explicit getContext call', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { id: 'account-1' }));
		const countReadyRequests = (): number =>
			targetWindow.sentMessages.filter(sent => {
				const message = sent.message as { type?: string };
				return message.type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ;
			}).length;
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		const getPromise = sdk.get<{ id: string }>('/v3/accounts/account-1');
		await Promise.resolve();
		expect(countReadyRequests()).toBe(1);
		await completeInitialization(sdk, sourceWindow, targetWindow);

		await expect(getPromise).resolves.toEqual({ id: 'account-1' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const getCall = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
		expect(getCall[0]).toBe('https://acme.api.identitynow.com/v3/accounts/account-1');
	});

	it('shares one handshake across concurrent first callers', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		const countByType = (type: string): number =>
			targetWindow.sentMessages.filter(sent => {
				const message = sent.message as { type?: string };
				return message.type === type;
			}).length;
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			fetchApi: fetchMock as unknown as typeof fetch
		});

		const concurrent = Promise.all([sdk.getContext(), sdk.getToken(), sdk.get<{ ok: boolean }>('/v3/x')]);
		await Promise.resolve();
		expect(countByType(MESSAGE_TYPES.SP_PLUGIN_READY_REQ)).toBe(1);
		await completeInitialization(sdk, sourceWindow, targetWindow);

		const [context, token, apiResult] = await concurrent;
		expect(context.tenant.id).toBe('tenant-1');
		expect(token).toBe('cached-token');
		expect(apiResult).toEqual({ ok: true });
		/**
		 * completeInitialization shifts READY / token-delivery / init responses out of the
		 * outbound buffer; assert no duplicate READY was produced during the concurrent start.
		 */
		expect(countByType(MESSAGE_TYPES.SP_PLUGIN_READY_REQ)).toBe(0);
	});

	it('retries initialize after a failed handshake instead of caching rejection', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const countReadyRequests = (): number =>
			targetWindow.sentMessages.filter(sent => {
				const message = sent.message as { type?: string };
				return message.type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ;
			}).length;
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW,
			requestTimeoutMs: 20
		});

		const firstAttempt = sdk.initialize();
		await Promise.resolve();
		expect(countReadyRequests()).toBe(1);
		const readyRequest = shiftMessageByType<RuntimeRequestEnvelope>(
			targetWindow,
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ
		);
		sourceWindow.emit(makeResponse(MESSAGE_TYPES.SP_PLUGIN_READY_RES, readyRequest.requestId, { ready: true }));
		await expect(firstAttempt).rejects.toMatchObject({
			details: {
				code: 'REQUEST_TIMEOUT'
			}
		});

		const retryAttempt = sdk.initialize();
		await Promise.resolve();
		expect(countReadyRequests()).toBe(1);
		await completeInitialization(sdk, sourceWindow, targetWindow);
		await expect(retryAttempt).resolves.toBeUndefined();
		await expect(sdk.getContext()).resolves.toMatchObject({
			tenant: { id: 'tenant-1' }
		});
	});

	it('does not re-run handshake on repeated initialize after success', async () => {
		const sourceWindow = new FakeSourceWindow();
		const targetWindow = new FakeTargetWindow();
		const sdk = new InternalSailPointPluginSDK({
			sourceWindow,
			targetWindow,
			targetOrigin: TRUSTED_ORIGIN,
			now: () => NOW
		});

		await completeInitialization(sdk, sourceWindow, targetWindow);
		const messageCountAfterInit = targetWindow.sentMessages.length;
		const readyCountAfterInit = targetWindow.sentMessages.filter(sent => {
			const message = sent.message as { type?: string };
			return message.type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ;
		}).length;

		await expect(sdk.initialize()).resolves.toBeUndefined();
		await expect(sdk.getContext()).resolves.toMatchObject({ tenant: { id: 'tenant-1' } });
		expect(targetWindow.sentMessages.length).toBe(messageCountAfterInit);
		expect(
			targetWindow.sentMessages.filter(sent => {
				const message = sent.message as { type?: string };
				return message.type === MESSAGE_TYPES.SP_PLUGIN_READY_REQ;
			})
		).toHaveLength(readyCountAfterInit);
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

import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../protocol/constants';
import type { EventMessageType, MessageTarget, RequestMessageType, RuntimeRequestEnvelope } from '../protocol/types';
import type {
	PageContext,
	PluginContext,
	SailPointPluginSDKConfig,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserContext,
	ViewportUpdatePayload
} from '../public/types';
import { RuntimeEngine, RuntimeEngineError } from './engine';
import { isRecord } from './engine.utils';

interface CurrentTokenResponsePayload {
	token: string;
}
type InternalSailPointPluginSDKConfig = SailPointPluginSDKConfig;

const defaultParentWindow = (): MessageTarget => {
	if (typeof window === 'undefined' || !window.parent) {
		throw new Error('parentWindow is required when window.parent is unavailable.');
	}

	return window.parent as unknown as MessageTarget;
};

const hasStringField = (value: Record<string, unknown>, field: string): boolean => {
	return typeof value[field] === 'string';
};

const readToken = (payload: unknown): string => {
	if (typeof payload !== 'object' || payload === null) {
		throw new RuntimeEngineError({
			code: 'HANDSHAKE_FAILED',
			message: 'Auth token delivery payload must be an object.'
		});
	}

	const token = (payload as { token?: unknown }).token;
	if (typeof token !== 'string' || token.length === 0) {
		throw new RuntimeEngineError({
			code: 'HANDSHAKE_FAILED',
			message: 'Auth token delivery payload must include a non-empty token.'
		});
	}

	return token;
};

const isPluginContext = (payload: unknown): payload is PluginContext => {
	if (!isRecord(payload)) {
		return false;
	}

	const context = payload;
	if (!isRecord(context.tenant) || !isRecord(context.user) || !isRecord(context.page) || !isRecord(context.slot)) {
		return false;
	}

	return (
		hasStringField(context.tenant, 'id') &&
		hasStringField(context.tenant, 'scriptName') &&
		hasStringField(context.tenant, 'org') &&
		hasStringField(context.user, 'id') &&
		hasStringField(context.user, 'displayName') &&
		hasStringField(context.user, 'email') &&
		hasStringField(context.page, 'route')
	);
};

/**
 * Internal concrete SDK implementation.
 * The public package surface should expose a narrow interface + factory.
 */
export class InternalSailPointPluginSDK {
	private readonly engine: RuntimeEngine;
	private readonly requestTimeoutMs?: number;
	private readonly protocolVersion: string;
	private initialized = false;
	private currentToken: string | null = null;
	private pluginContext: PluginContext | null = null;
	private tokenSubscriptionCleanup: (() => void) | null = null;

	public readonly events = {
		onViewportChange: (callback: (dimensions: ViewportUpdatePayload) => void): (() => void) =>
			this.onViewportUpdate(callback),
		onTokenUpdate: (callback: (newToken: string) => void): (() => void) =>
			this.onTokenUpdate(payload => {
				callback(payload.token);
			})
	};

	public constructor(config: InternalSailPointPluginSDKConfig) {
		const targetWindow = config.parentWindow ?? config.targetWindow ?? defaultParentWindow();
		this.engine = new RuntimeEngine({
			...config,
			targetWindow
		});
		this.requestTimeoutMs = config.requestTimeoutMs;
		this.protocolVersion = config.protocolVersion ?? COIP_PROTOCOL_VERSION;
	}

	public start(): void {
		this.engine.start();
	}

	public stop(): void {
		this.engine.stop();
		if (this.tokenSubscriptionCleanup) {
			this.tokenSubscriptionCleanup();
			this.tokenSubscriptionCleanup = null;
		}
		this.initialized = false;
	}

	public async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		this.start();
		if (!this.tokenSubscriptionCleanup) {
			this.tokenSubscriptionCleanup = this.onTokenUpdate(payload => {
				this.currentToken = payload.token;
			});
		}

		const readyResponse = await this.engine.sendRequest(
			MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
			{
				protocolVersion: this.protocolVersion
			},
			this.withTimeout()
		);
		void readyResponse;

		const tokenDeliveryRequest = await this.engine.waitForRequest(
			MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ,
			this.withTimeout()
		);
		try {
			this.currentToken = readToken(tokenDeliveryRequest.payload);
			this.engine.respond(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES, tokenDeliveryRequest.requestId, {
				received: true
			});
		} catch (error: unknown) {
			throw this.respondWithError(tokenDeliveryRequest.requestId, error);
		}

		const initRequest = await this.engine.waitForRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, this.withTimeout());
		try {
			if (!isPluginContext(initRequest.payload)) {
				throw new RuntimeEngineError({
					code: 'HANDSHAKE_FAILED',
					message: 'Plugin init payload did not match expected context shape.'
				});
			}

			this.pluginContext = initRequest.payload;
			this.engine.respond(MESSAGE_TYPES.SP_PLUGIN_INIT_RES, initRequest.requestId, {
				initialized: true
			});
		} catch (error: unknown) {
			throw this.respondWithError(initRequest.requestId, error);
		}

		this.initialized = true;
	}

	public async getContext(): Promise<PluginContext> {
		await this.initialize();
		if (!this.pluginContext) {
			throw new RuntimeEngineError({
				code: 'HANDSHAKE_FAILED',
				message: 'Plugin context is not available after initialization.'
			});
		}

		return this.pluginContext;
	}

	public async getToken(forceRefresh = false): Promise<string> {
		await this.initialize();
		if (!forceRefresh && this.currentToken) {
			return this.currentToken;
		}

		const payload = await this.engine.sendRequest<Record<string, never>, CurrentTokenResponsePayload>(
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ,
			{}
		);
		this.currentToken = payload.token;
		return payload.token;
	}

	public async request<TRequestPayload = unknown, TResponsePayload = unknown>(
		type: RequestMessageType,
		payload: TRequestPayload
	): Promise<TResponsePayload> {
		return this.engine.sendRequest<TRequestPayload, TResponsePayload>(type, payload);
	}

	public onRequest(
		type: RequestMessageType,
		handler: (request: RuntimeRequestEnvelope) => Promise<unknown> | unknown
	): () => void {
		return this.engine.onRequest(type, handler);
	}

	public onEvent<TPayload = unknown>(type: EventMessageType, handler: (payload: TPayload) => void): () => void {
		return this.engine.onEvent(type, eventEnvelope => {
			handler(eventEnvelope.payload as TPayload);
		});
	}

	public onTokenUpdate(handler: (payload: TokenUpdatePayload) => void): () => void {
		return this.onEvent(MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT, handler);
	}

	public onViewportUpdate(handler: (payload: ViewportUpdatePayload) => void): () => void {
		return this.onEvent(MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT, handler);
	}

	public emitTokenUpdate(payload: TokenUpdatePayload): void {
		this.engine.emitEvent(MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT, payload);
	}

	public emitViewportUpdate(payload: ViewportUpdatePayload): void {
		this.engine.emitEvent(MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT, payload);
	}

	public async getCurrentToken(): Promise<string> {
		return this.getToken(true);
	}

	public async handshake(): Promise<void> {
		await this.initialize();
	}

	private withTimeout(): { timeoutMs?: number } {
		return {
			timeoutMs: this.requestTimeoutMs
		};
	}

	private respondWithError(requestId: string, error: unknown): RuntimeEngineError {
		const runtimeError = this.toRuntimeEngineError(error);
		this.engine.respond(MESSAGE_TYPES.SP_ERROR_RES, requestId, {
			error: runtimeError.details
		});
		return runtimeError;
	}

	private toRuntimeEngineError(error: unknown): RuntimeEngineError {
		if (error instanceof RuntimeEngineError) {
			return error;
		}

		if (error instanceof Error) {
			return new RuntimeEngineError({
				code: 'HANDSHAKE_FAILED',
				message: error.message
			});
		}

		return new RuntimeEngineError({
			code: 'HANDSHAKE_FAILED',
			message: 'Unknown handshake error.'
		});
	}
}

/**
 * Backwards-compatible alias while migrating to SailPointPluginSDK naming.
 */
export class PluginRuntimeClient extends InternalSailPointPluginSDK {}

type PluginRuntimeClientConfig = InternalSailPointPluginSDKConfig;

export type {
	CurrentTokenResponsePayload,
	PageContext,
	PluginContext,
	PluginContext as InitializationContext,
	InternalSailPointPluginSDKConfig,
	PluginRuntimeClientConfig,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserContext,
	ViewportUpdatePayload
};

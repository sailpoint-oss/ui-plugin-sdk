import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../protocol/constants';
import type { EventMessageType, MessageTarget, RequestMessageType, RuntimeRequestEnvelope } from '../protocol/types';
import { RuntimeEngine, RuntimeEngineError } from './engine';
import type { RuntimeEngineConfig } from './engine';

interface ViewportUpdatePayload {
	width: number;
	height: number;
}

interface TokenUpdatePayload {
	token: string;
}

interface CurrentTokenResponsePayload {
	token: string;
}

type TenantContext = Record<string, unknown>;
type UserContext = Record<string, unknown>;
type PageContext = Record<string, unknown>;
type SlotContext = Record<string, unknown>;

interface PluginContext {
	tenant: TenantContext;
	user: UserContext;
	page: PageContext;
	slot: SlotContext;
}

interface SailPointPluginSDKConfig extends Omit<RuntimeEngineConfig, 'targetWindow'> {
	parentWindow?: MessageTarget;
	targetWindow?: MessageTarget;
}

const defaultParentWindow = (): MessageTarget => {
	if (typeof window === 'undefined' || !window.parent) {
		throw new Error('parentWindow is required when window.parent is unavailable.');
	}

	return window.parent as unknown as MessageTarget;
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
	if (typeof payload !== 'object' || payload === null) {
		return false;
	}

	const context = payload as Record<string, unknown>;
	return (
		typeof context.tenant === 'object' &&
		context.tenant !== null &&
		typeof context.user === 'object' &&
		context.user !== null &&
		typeof context.page === 'object' &&
		context.page !== null &&
		typeof context.slot === 'object' &&
		context.slot !== null
	);
};

/**
 * Plugin-facing SDK facade.
 * Initialization handshake and token/context mechanics stay internal.
 */
export class SailPointPluginSDK {
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

	public constructor(config: SailPointPluginSDKConfig) {
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
		this.currentToken = readToken(tokenDeliveryRequest.payload);
		this.engine.respond(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES, tokenDeliveryRequest.requestId, {
			received: true
		});

		const initRequest = await this.engine.waitForRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, this.withTimeout());
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
}

/**
 * Backwards-compatible alias while migrating to SailPointPluginSDK naming.
 */
export class PluginRuntimeClient extends SailPointPluginSDK {}

type PluginRuntimeClientConfig = SailPointPluginSDKConfig;

export type {
	CurrentTokenResponsePayload,
	PageContext,
	PluginContext,
	PluginContext as InitializationContext,
	PluginRuntimeClientConfig,
	SailPointPluginSDKConfig,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserContext,
	ViewportUpdatePayload
};

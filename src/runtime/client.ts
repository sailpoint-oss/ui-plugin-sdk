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
	private readonly now: () => number;
	private readonly fetchApi?: typeof fetch;
	private initialized = false;
	private currentToken: string | null = null;
	private tokenRefreshInFlight: Promise<string> | null = null;
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
		this.now = config.now ?? (() => Date.now());
		this.fetchApi = config.fetchApi;
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
				try {
					this.currentToken = readToken(payload);
				} catch {
					/**
					 * Ignore malformed token update events and keep the previous token.
					 * Handshake token delivery and explicit refresh paths still enforce strict validation.
					 */
				}
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
		if (!forceRefresh && this.currentToken && !this.isTokenExpired(this.currentToken)) {
			return this.currentToken;
		}

		return this.refreshCurrentToken();
	}

	public async get<TResponse = unknown>(path: string): Promise<TResponse> {
		return this.requestJsonWithAuthorization<TResponse>(path, {
			method: 'GET'
		});
	}

	public async post<TResponse = unknown>(path: string, data: unknown): Promise<TResponse> {
		return this.requestJsonWithAuthorization<TResponse>(path, {
			method: 'POST'
		}, data);
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

	private async refreshCurrentToken(): Promise<string> {
		if (this.tokenRefreshInFlight) {
			return this.tokenRefreshInFlight;
		}

		this.tokenRefreshInFlight = this.engine
			.sendRequest<Record<string, never>, CurrentTokenResponsePayload>(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ, {})
			.then(payload => {
				const token = payload?.token;
				if (typeof token !== 'string' || token.length === 0) {
					throw new RuntimeEngineError({
						code: 'INVALID_SEQUENCE',
						message: 'Current token response payload must include a non-empty token.'
					});
				}

				this.currentToken = token;
				return token;
			})
			.finally(() => {
				this.tokenRefreshInFlight = null;
			});

		return this.tokenRefreshInFlight;
	}

	private async requestJsonWithAuthorization<TResponse>(
		path: string,
		init: RequestInit,
		data?: unknown
	): Promise<TResponse> {
		const apiUrl = this.buildApiUrl(path);
		const requestInit = this.buildRequestInit(init, data);
		let response = await this.fetchWithAuthorization(apiUrl, requestInit, false);

		/**
		 * Self-healing path: if the token is stale, force refresh once and retry.
		 */
		if (response.status === 401) {
			response = await this.fetchWithAuthorization(apiUrl, requestInit, true);
		}

		if (!response.ok) {
			throw new RuntimeEngineError({
				code: 'INVALID_SEQUENCE',
				message: `API request failed with status ${response.status}.`,
				details: {
					status: response.status
				}
			});
		}

		if (response.status === 204) {
			return undefined as TResponse;
		}

		return (await response.json()) as TResponse;
	}

	private async fetchWithAuthorization(apiUrl: string, init: RequestInit, forceRefresh: boolean): Promise<Response> {
		const token = await this.getToken(forceRefresh);
		const headers = new Headers(init.headers);
		headers.set('Authorization', `Bearer ${token}`);
		const fetchImpl = this.fetchApi ?? globalThis.fetch;
		if (typeof fetchImpl !== 'function') {
			throw new RuntimeEngineError({
				code: 'INVALID_SEQUENCE',
				message: 'Global fetch API is not available in this runtime.'
			});
		}

		return fetchImpl(apiUrl, {
			...init,
			headers
		});
	}

	private buildRequestInit(init: RequestInit, data?: unknown): RequestInit {
		const nextInit: RequestInit = {
			...init
		};

		if (data === undefined) {
			return nextInit;
		}

		nextInit.body = JSON.stringify(data);
		const headers = new Headers(nextInit.headers);
		if (!headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json');
		}
		nextInit.headers = headers;

		return nextInit;
	}

	private buildApiUrl(path: string): string {
		const normalizedPath = path.trim();
		if (normalizedPath.length === 0) {
			throw new RuntimeEngineError({
				code: 'INVALID_SEQUENCE',
				message: 'API path must be a non-empty string.'
			});
		}

		if (/^https?:\/\//i.test(normalizedPath)) {
			throw new RuntimeEngineError({
				code: 'INVALID_SEQUENCE',
				message: 'api.get/api.post expect a path suffix, not an absolute URL.'
			});
		}

		const tenant = this.pluginContext?.tenant;
		const tenantSubdomain =
			typeof tenant?.org === 'string' && tenant.org.length > 0
				? tenant.org
				: typeof tenant?.scriptName === 'string' && tenant.scriptName.length > 0
					? tenant.scriptName
					: null;

		if (!tenantSubdomain) {
			throw new RuntimeEngineError({
				code: 'INVALID_SEQUENCE',
				message: 'Tenant context is required to construct the default API base URL.'
			});
		}

		return `https://${tenantSubdomain}.api.cloud.sailpoint.com${
			normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
		}`;
	}

	private isTokenExpired(token: string): boolean {
		const sections = token.split('.');
		if (sections.length < 2) {
			return false;
		}

		const payload = this.parseJwtPayload(sections[1]);
		if (!payload) {
			return false;
		}

		const exp = payload.exp;
		if (typeof exp !== 'number' || !Number.isFinite(exp)) {
			return false;
		}

		return this.now() >= exp * 1000;
	}

	private parseJwtPayload(base64UrlPayload: string): Record<string, unknown> | null {
		const normalized = base64UrlPayload.replace(/-/g, '+').replace(/_/g, '/');
		const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
		const payload = normalized + padding;

		try {
			if (typeof atob === 'function') {
				const decoded = atob(payload);
				return JSON.parse(decoded) as Record<string, unknown>;
			}

			return null;
		} catch {
			return null;
		}
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

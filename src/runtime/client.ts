import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../protocol/constants';
import type { EventMessageType, MessageTarget, RequestMessageType, RuntimeRequestEnvelope } from '../protocol/types';
import { ApiError } from '../public/api.error';
import type {
	PageContext,
	PluginConfiguration,
	PluginContext,
	RouteChangePayload,
	SailPointPluginSDKConfig,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserCapabilities,
	UserContext,
	ViewportUpdatePayload
} from '../public/types';
import { RuntimeEngine, RuntimeEngineError } from './engine';
import { isRecord } from './engine.utils';
import { registerWindowSailpointConfig } from './window-config';

interface CoipTokenData {
	accessToken: string;
	refreshInterval?: number;
}

interface CurrentTokenResponsePayload {
	token: string | CoipTokenData;
}
type InternalSailPointPluginSDKConfig = SailPointPluginSDKConfig & {
	targetOrigin: string;
};

const defaultParentWindow = (): MessageTarget => {
	if (typeof window === 'undefined' || !window.parent) {
		throw new Error('parentWindow is required when window.parent is unavailable.');
	}

	return window.parent as unknown as MessageTarget;
};

const hasStringField = (value: Record<string, unknown>, field: string): boolean => {
	return typeof value[field] === 'string';
};

const readApiErrorBody = async (response: Response): Promise<unknown> => {
	let text: string;
	try {
		text = await response.text();
	} catch {
		return null;
	}

	if (text.trim().length === 0) {
		return null;
	}

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
};

/**
 * Every capability flag App Shell sends, as a runtime list.
 *
 * Declared literally rather than derived so each key is greppable, and
 * `satisfies` against {@link UserCapabilities} so the list and the interface
 * cannot drift apart when the host adds a capability.
 */
export const CAPABILITY_FLAG_KEYS = [
	'isOrgAdmin',
	'isHelpdesk',
	'isDashboard',
	'isCertAdmin',
	'isReportAdmin',
	'isSourceAdmin',
	'isSourceSubadmin',
	'isRoleAdmin',
	'isRoleSubadmin',
	'isCloudGovAdmin',
	'isCloudGovUser',
	'isSaasManagementAdmin',
	'isSaasManagementReader'
] as const satisfies readonly (keyof UserCapabilities)[];

/**
 * True when `value` carries all {@link CAPABILITY_FLAG_KEYS} as booleans.
 *
 * The host documents the map as exhaustive, so a partial map means the payload
 * did not come from a supported App Shell and the handshake must fail rather
 * than hand the plugin flags that read as `undefined`.
 */
const isCompleteCapabilityMap = (value: unknown): boolean => {
	if (!isRecord(value)) {
		return false;
	}

	return CAPABILITY_FLAG_KEYS.every(key => typeof value[key] === 'boolean');
};

const hasArrayField = (value: Record<string, unknown>, field: string): boolean => {
	return Array.isArray(value[field]);
};

/**
 * Validates the tenant slice of the init payload.
 *
 * `products` is checked for arrayness only. Its elements are not walked: the
 * host builds them from its own typed model, and rejecting the whole handshake
 * over one malformed product would be a worse failure than letting the plugin
 * see it.
 */
const isTenantContext = (value: unknown): value is TenantContext => {
	if (!isRecord(value)) {
		return false;
	}

	return (
		hasStringField(value, 'id') &&
		hasStringField(value, 'scriptName') &&
		hasStringField(value, 'org') &&
		hasStringField(value, 'name') &&
		hasStringField(value, 'pod') &&
		hasStringField(value, 'region') &&
		isRecord(value.apiUrl) &&
		hasStringField(value.apiUrl, 'idn') &&
		hasArrayField(value, 'products')
	);
};

const isUserContext = (value: unknown): value is UserContext => {
	if (!isRecord(value)) {
		return false;
	}

	return (
		hasStringField(value, 'id') &&
		hasStringField(value, 'displayName') &&
		hasStringField(value, 'email') &&
		isCompleteCapabilityMap(value.capabilities)
	);
};

const isPageContext = (value: unknown): value is PageContext => {
	return isRecord(value) && hasStringField(value, 'route');
};

/**
 * Validates the plugin-configuration slice.
 *
 * Both members are optional in the host contract, so presence of the object
 * itself is the only requirement.
 */
const isPluginConfiguration = (value: unknown): value is PluginConfiguration => {
	return isRecord(value);
};

const readTokenValue = (value: unknown): string | null => {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}

	if (isRecord(value) && typeof value.accessToken === 'string' && value.accessToken.length > 0) {
		return value.accessToken;
	}

	return null;
};

const readToken = (payload: unknown): string => {
	if (typeof payload !== 'object' || payload === null) {
		throw new RuntimeEngineError({
			code: 'HANDSHAKE_FAILED',
			message: 'Auth token delivery payload must be an object.'
		});
	}

	const token = readTokenValue((payload as { token?: unknown }).token);
	if (!token) {
		throw new RuntimeEngineError({
			code: 'HANDSHAKE_FAILED',
			message: 'Auth token delivery payload must include a non-empty token or accessToken.'
		});
	}

	return token;
};

const normalizePluginContext = (payload: unknown): PluginContext | null => {
	if (!isRecord(payload)) {
		return null;
	}

	const context = payload;
	const tenant = context.tenant ?? context.tenantContext;
	const user = context.user ?? context.userContext;
	const page = context.page ?? context.pageContext;
	const slot = isRecord(context.slot) ? context.slot : isRecord(context.slotContext) ? context.slotContext : {};

	if (
		!isTenantContext(tenant) ||
		!isUserContext(user) ||
		!isPageContext(page) ||
		!isPluginConfiguration(context.pluginConfiguration)
	) {
		return null;
	}

	return {
		tenant,
		user,
		page,
		slot: slot as SlotContext,
		pluginConfiguration: context.pluginConfiguration
	};
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
	private initPromise: Promise<void> | null = null;
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

	public readonly navigation = {
		setRoute: (subPath: string): Promise<void> => this.setRoute(subPath)
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
		this.initPromise = null;
	}

	public initialize(): Promise<void> {
		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this.runHandshake().catch((error: unknown) => {
			this.initPromise = null;
			this.initialized = false;
			throw error;
		});

		return this.initPromise;
	}

	private async runHandshake(): Promise<void> {
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
			const pluginContext = normalizePluginContext(initRequest.payload);
			if (!pluginContext) {
				throw new RuntimeEngineError({
					code: 'HANDSHAKE_FAILED',
					message: 'Plugin init payload did not match expected context shape.'
				});
			}

			this.pluginContext = pluginContext;
			this.engine.respond(MESSAGE_TYPES.SP_PLUGIN_INIT_RES, initRequest.requestId, {
				initialized: true
			});
		} catch (error: unknown) {
			throw this.respondWithError(initRequest.requestId, error);
		}

		this.initialized = true;
		registerWindowSailpointConfig(this);
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

	/**
	 * Reports the plugin's internal route to App Shell.
	 *
	 * The type check runs before the handshake so a bad call never starts one.
	 * Emitting only after the handshake matters: App Shell rejects route events
	 * received during its READY wait. One leading `/` is stripped because App
	 * Shell rejects absolute sub-paths, and router `location.pathname` values
	 * always carry one.
	 */
	public async setRoute(subPath: unknown): Promise<void> {
		if (typeof subPath !== 'string') {
			throw new TypeError('navigation.setRoute expects subPath to be a string.');
		}

		await this.initialize();
		this.emitRouteChange({
			subPath: subPath.startsWith('/') ? subPath.slice(1) : subPath
		});
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
		return this.requestJsonWithAuthorization<TResponse>(
			path,
			{
				method: 'POST'
			},
			data
		);
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
		return this.onEvent<unknown>(MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT, payload => {
			try {
				handler({
					token: readToken(payload)
				});
			} catch {
				/**
				 * Ignore malformed token-update events and retain the last valid token.
				 */
			}
		});
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

	public emitRouteChange(payload: RouteChangePayload): void {
		this.engine.emitEvent(MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT, payload);
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
				const token = readTokenValue(payload?.token);
				if (!token) {
					throw new RuntimeEngineError({
						code: 'INVALID_SEQUENCE',
						message: 'Current token response payload must include a non-empty token or accessToken.'
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
		await this.initialize();
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
			throw new ApiError({
				status: response.status,
				statusText: response.statusText || '',
				path: path.trim(),
				body: await readApiErrorBody(response)
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

		/**
		 * `tenant.apiUrl.idn` is validated at handshake time, so there is no
		 * hostname-derivation fallback here by design: a plugin that reached this
		 * point has a real base URL. Guessing one would silently target a
		 * different host, which is a worse failure than the thrown error below.
		 */
		const apiUrlFromContext = this.pluginContext?.tenant.apiUrl;
		if (!apiUrlFromContext) {
			throw new RuntimeEngineError({
				code: 'INVALID_SEQUENCE',
				message: 'Tenant context is required to construct the API base URL.'
			});
		}

		const baseUrl = apiUrlFromContext.idn.replace(/\/+$/g, '');

		return `${baseUrl}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;
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
	PluginConfiguration,
	PluginContext,
	PluginContext as InitializationContext,
	InternalSailPointPluginSDKConfig,
	PluginRuntimeClientConfig,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserCapabilities,
	UserContext,
	ViewportUpdatePayload
};

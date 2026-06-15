import { MESSAGE_TYPES } from '../protocol/constants';
import type { EventMessageType, RequestMessageType, RuntimeRequestEnvelope } from '../protocol/types';
import { RuntimeEngine } from './engine';
import type { RuntimeEngineConfig } from './engine';
import { RuntimeHandshake } from './handshake';

interface PluginRuntimeClientConfig extends RuntimeEngineConfig {
	getAuthToken: () => string | Promise<string>;
	getInitPayload?: () => Record<string, unknown> | Promise<Record<string, unknown>>;
}

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

/**
 * Plugin-facing facade that hides raw postMessage transport details.
 */
export class PluginRuntimeClient {
	private readonly engine: RuntimeEngine;
	private readonly handshakeOrchestrator: RuntimeHandshake;

	public constructor(config: PluginRuntimeClientConfig) {
		this.engine = new RuntimeEngine(config);
		this.handshakeOrchestrator = new RuntimeHandshake({
			engine: this.engine,
			getAuthToken: config.getAuthToken,
			getInitPayload: config.getInitPayload,
			requestTimeoutMs: config.requestTimeoutMs
		});
	}

	public start(): void {
		this.engine.start();
	}

	public stop(): void {
		this.engine.stop();
	}

	public async handshake(): Promise<void> {
		/**
		 * Runs the full READY -> token delivery -> init handshake sequence.
		 */
		await this.handshakeOrchestrator.perform();
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
		/**
		 * Exposes payload-only callbacks to keep plugin code transport-agnostic.
		 */
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
		const payload = await this.engine.sendRequest<Record<string, never>, CurrentTokenResponsePayload>(
			MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ,
			{}
		);

		return payload.token;
	}
}

export type { CurrentTokenResponsePayload, PluginRuntimeClientConfig, TokenUpdatePayload, ViewportUpdatePayload };

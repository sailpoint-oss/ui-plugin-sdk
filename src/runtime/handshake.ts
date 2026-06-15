import { MESSAGE_TYPES } from '../protocol/constants';
import type { RuntimeEngine } from './engine';

interface HandshakeConfig {
	engine: RuntimeEngine;
	getAuthToken: () => string | Promise<string>;
	getInitPayload?: () => Record<string, unknown> | Promise<Record<string, unknown>>;
	requestTimeoutMs?: number;
}

export class RuntimeHandshake {
	private readonly engine: RuntimeEngine;
	private readonly getAuthToken: () => string | Promise<string>;
	private readonly getInitPayload: () => Record<string, unknown> | Promise<Record<string, unknown>>;
	private readonly requestTimeoutMs?: number;
	private complete = false;

	public constructor(config: HandshakeConfig) {
		this.engine = config.engine;
		this.getAuthToken = config.getAuthToken;
		this.getInitPayload = config.getInitPayload ?? (() => ({}));
		this.requestTimeoutMs = config.requestTimeoutMs;
	}

	public async perform(): Promise<void> {
		if (this.complete) {
			return;
		}

		/**
		 * 1) Plugin announces readiness; runtime acknowledges it.
		 */
		const readyRequest = await this.engine.waitForRequest(MESSAGE_TYPES.SP_PLUGIN_READY_REQ, this.withTimeout());
		this.engine.respond(MESSAGE_TYPES.SP_PLUGIN_READY_RES, readyRequest.requestId, {
			ready: true
		});

		/**
		 * 2) Runtime delivers current auth token and waits for ack.
		 */
		const authToken = await this.getAuthToken();
		await this.engine.sendRequest(
			MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ,
			{
				token: authToken
			},
			this.withTimeout()
		);

		/**
		 * 3) Runtime sends initialization payload and waits for ack.
		 */
		const initPayload = await this.getInitPayload();
		await this.engine.sendRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, initPayload, this.withTimeout());

		this.complete = true;
	}

	private withTimeout(): { timeoutMs?: number } {
		return {
			timeoutMs: this.requestTimeoutMs
		};
	}
}

export type { HandshakeConfig };

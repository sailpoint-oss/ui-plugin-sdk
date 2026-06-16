import { MESSAGE_TYPES } from '../protocol/constants';
import type { RuntimeEngine } from './engine';

interface HandshakeConfig {
	engine: RuntimeEngine;
	requestTimeoutMs?: number;
}

interface HandshakeInputs {
	authToken: string;
	initPayload: Record<string, unknown>;
}

export class RuntimeHandshake {
	private readonly engine: RuntimeEngine;
	private readonly requestTimeoutMs?: number;
	private complete = false;

	public constructor(config: HandshakeConfig) {
		this.engine = config.engine;
		this.requestTimeoutMs = config.requestTimeoutMs;
	}

	public async perform(inputs: HandshakeInputs): Promise<void> {
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
		await this.engine.sendRequest(
			MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ,
			{
				token: inputs.authToken
			},
			this.withTimeout()
		);

		/**
		 * 3) Runtime sends initialization payload and waits for ack.
		 */
		await this.engine.sendRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, inputs.initPayload, this.withTimeout());

		this.complete = true;
	}

	private withTimeout(): { timeoutMs?: number } {
		return {
			timeoutMs: this.requestTimeoutMs
		};
	}
}

export type { HandshakeConfig, HandshakeInputs };

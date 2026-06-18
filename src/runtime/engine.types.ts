import type { MessageSource, MessageTarget, ResponseMessageType, RuntimeRequestEnvelope } from '../protocol/types';

/**
 * Construction-time configuration for the low-level runtime engine.
 */
export interface RuntimeEngineConfig {
	targetWindow: MessageTarget;
	targetOrigin: string;
	sourceWindow?: MessageSource;
	protocolVersion?: string;
	requestTimeoutMs?: number;
	maxClockSkewMs?: number;
	now?: () => number;
}

/**
 * Optional overrides for outbound request timeout behavior.
 */
export interface SendRequestOptions {
	timeoutMs?: number;
}

/**
 * Optional overrides for inbound request wait timeout behavior.
 */
export interface WaitForRequestOptions {
	timeoutMs?: number;
}

/**
 * Internal tracking record for in-flight outbound requests.
 */
export interface PendingRequest {
	expectedResponseType: ResponseMessageType;
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timeoutHandle: ReturnType<typeof setTimeout>;
}

/**
 * Internal waiter used by handshake-style flows awaiting specific requests.
 */
export interface PendingRequestWaiter {
	resolve: (value: RuntimeRequestEnvelope) => void;
	reject: (error: Error) => void;
	timeoutHandle: ReturnType<typeof setTimeout>;
}

/**
 * Callback shape for handling inbound request envelopes.
 */
export type RuntimeRequestHandler = (request: RuntimeRequestEnvelope) => Promise<unknown> | unknown;

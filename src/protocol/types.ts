import type { MessageType } from './constants';

/**
 * Derived type groups used to route envelopes by suffix.
 */
export type RequestMessageType = Extract<MessageType, `${string}_REQ`>;
export type ResponseMessageType = Extract<MessageType, `${string}_RES`>;
export type EventMessageType = Extract<MessageType, `${string}_EVT`>;

export type RuntimeErrorCode =
	| 'INVALID_ORIGIN'
	| 'INVALID_ENVELOPE'
	| 'INVALID_PROTOCOL_VERSION'
	| 'INVALID_TIMESTAMP'
	| 'INVALID_REQUEST_ID'
	| 'INVALID_SEQUENCE'
	| 'UNSUPPORTED_MESSAGE_TYPE'
	| 'REQUEST_TIMEOUT'
	| 'HANDSHAKE_FAILED';

export interface RuntimeErrorDetails {
	code: RuntimeErrorCode;
	message: string;
	details?: Record<string, unknown>;
}

/**
 * Shared envelope shape across requests, responses, and events.
 */
export interface EnvelopeBase<TType extends MessageType, TPayload> {
	type: TType;
	protocolVersion: string;
	timestamp: number;
	payload: TPayload;
}

/**
 * Requests and responses must include requestId for correlation.
 */
export interface RequestEnvelope<TPayload = unknown> extends EnvelopeBase<RequestMessageType, TPayload> {
	requestId: string;
}

export interface ResponseEnvelope<TPayload = unknown> extends EnvelopeBase<ResponseMessageType, TPayload> {
	requestId: string;
}

export type EventEnvelope<TPayload = unknown> = EnvelopeBase<EventMessageType, TPayload>;

export interface ErrorResponsePayload {
	error: RuntimeErrorDetails;
}

export type RuntimeEnvelope = RequestEnvelope | ResponseEnvelope | EventEnvelope;

export interface RuntimeMessageEvent {
	data: unknown;
	origin: string;
	source: unknown;
}

export interface MessageSource {
	addEventListener(eventName: 'message', listener: (event: RuntimeMessageEvent) => void): void;
	removeEventListener(eventName: 'message', listener: (event: RuntimeMessageEvent) => void): void;
}

export interface MessageTarget {
	postMessage(message: unknown, targetOrigin: string): void;
}

/**
 * Narrowed envelope variants for handler and subscriber signatures.
 */
export interface RuntimeRequestEnvelope<
	TType extends RequestMessageType = RequestMessageType,
	TPayload = unknown
> extends RequestEnvelope<TPayload> {
	type: TType;
}

export interface RuntimeResponseEnvelope<
	TType extends ResponseMessageType = ResponseMessageType,
	TPayload = unknown
> extends ResponseEnvelope<TPayload> {
	type: TType;
}

export interface RuntimeEventEnvelope<
	TType extends EventMessageType = EventMessageType,
	TPayload = unknown
> extends EventEnvelope<TPayload> {
	type: TType;
}

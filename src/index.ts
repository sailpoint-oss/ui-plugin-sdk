/**
 * Public package surface.
 * package.json maps the root export (".") to this entrypoint, so only symbols
 * re-exported from this file are part of the supported consumer API.
 */
export { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from './protocol/constants';
export type {
	ErrorResponsePayload,
	EventEnvelope,
	EventMessageType,
	MessageSource,
	MessageTarget,
	RequestEnvelope,
	RequestMessageType,
	ResponseEnvelope,
	ResponseMessageType,
	RuntimeEnvelope,
	RuntimeErrorCode,
	RuntimeErrorDetails,
	RuntimeEventEnvelope,
	RuntimeMessageEvent,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from './protocol/types';
export { PluginRuntimeClient } from './runtime/client';
export type {
	CurrentTokenResponsePayload,
	PluginRuntimeClientConfig,
	TokenUpdatePayload,
	ViewportUpdatePayload
} from './runtime/client';
export { RuntimeEngine, RuntimeEngineError } from './runtime/engine';
export type { RuntimeEngineConfig } from './runtime/engine';
export { RuntimeHandshake } from './runtime/handshake';
export type { HandshakeConfig } from './runtime/handshake';

export const VERSION = '0.0.0';

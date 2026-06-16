/**
 * Public package surface.
 * package.json maps the root export (".") to this entrypoint, so only symbols
 * re-exported from this file are part of the supported consumer API.
 * Keep implementation-specific runtime internals private to preserve
 * a plugin-facing abstraction boundary.
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
export { PluginRuntimeClient, SailPointPluginSDK } from './runtime/client';
export type {
	CurrentTokenResponsePayload,
	PageContext,
	PluginContext,
	PluginRuntimeClientConfig,
	SailPointPluginSDKConfig,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserContext,
	ViewportUpdatePayload
} from './runtime/client';

export const VERSION = '0.0.0';

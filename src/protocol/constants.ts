/**
 * Version identifier shared by host and plugin envelopes.
 */
export const COIP_PROTOCOL_VERSION = 'v1.0';

/**
 * Default transport safeguards used when callers do not provide overrides.
 * Values are aligned with App Shell plugin-page policy defaults.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 2_000;
export const DEFAULT_MAX_CLOCK_SKEW_MS = 60_000;

/**
 * Canonical COIP message names used by runtime engine and public client APIs.
 */
export const MESSAGE_TYPES = {
	SP_PLUGIN_READY_REQ: 'SP_PLUGIN_READY_REQ',
	SP_PLUGIN_READY_RES: 'SP_PLUGIN_READY_RES',
	SP_AUTH_TOKEN_DELIVERY_REQ: 'SP_AUTH_TOKEN_DELIVERY_REQ',
	SP_AUTH_TOKEN_DELIVERY_RES: 'SP_AUTH_TOKEN_DELIVERY_RES',
	SP_PLUGIN_INIT_REQ: 'SP_PLUGIN_INIT_REQ',
	SP_PLUGIN_INIT_RES: 'SP_PLUGIN_INIT_RES',
	SP_GET_CURRENT_TOKEN_REQ: 'SP_GET_CURRENT_TOKEN_REQ',
	SP_GET_CURRENT_TOKEN_RES: 'SP_GET_CURRENT_TOKEN_RES',
	SP_TOKEN_UPDATE_EVT: 'SP_TOKEN_UPDATE_EVT',
	SP_VIEWPORT_UPDATE_EVT: 'SP_VIEWPORT_UPDATE_EVT',
	SP_ROUTE_CHANGE_EVT: 'SP_ROUTE_CHANGE_EVT',
	SP_ERROR_RES: 'SP_ERROR_RES'
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

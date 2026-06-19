/**
 * Public package surface.
 * package.json maps the root export (".") to this entrypoint, so only symbols
 * re-exported from this file are part of the supported consumer API.
 * Keep implementation-specific runtime internals private to preserve
 * a plugin-facing abstraction boundary.
 */
export type {
	PluginContext,
	SailPointPluginSDK,
	SailPointPluginSDKConfig,
	TokenUpdatePayload,
	ViewportUpdatePayload
} from './public/types';
export { createSDK } from './public/create-sdk';

export const VERSION = '0.0.0';

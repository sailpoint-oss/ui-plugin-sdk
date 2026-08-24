/**
 * Public package surface.
 * package.json maps the root export (".") to this entrypoint, so only symbols
 * re-exported from this file are part of the supported consumer API.
 * Keep implementation-specific runtime internals private to preserve
 * a plugin-facing abstraction boundary.
 */
export type {
	CapabilityFlagKey,
	PageContext,
	PluginConfiguration,
	PluginContext,
	SailPointPluginSDK,
	SailPointPluginSDKConfig,
	SailPointWindowConfig,
	SlotConfiguration,
	SlotContext,
	TenantApiUrl,
	TenantContext,
	TenantProduct,
	TenantProductLicense,
	TokenUpdatePayload,
	UserCapabilities,
	UserContext,
	ViewportUpdatePayload
} from './public/types';
export { ApiError } from './public/api.error';
export { createSDK } from './public/create-sdk';

export const VERSION = '0.0.0';

import type {
	InternalSailPointPluginSDKConfig,
	PageContext,
	PluginContext,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserContext,
	ViewportUpdatePayload
} from '../runtime/client';

export interface SailPointPluginSDK {
	getContext(): Promise<PluginContext>;
	api: {
		getToken(forceRefresh?: boolean): Promise<string>;
	};
	events: {
		onViewportChange(callback: (dimensions: ViewportUpdatePayload) => void): () => void;
		onTokenUpdate(callback: (newToken: string) => void): () => void;
	};
}

export type SailPointPluginSDKConfig = InternalSailPointPluginSDKConfig;

export type {
	PageContext,
	PluginContext,
	SlotContext,
	TenantContext,
	TokenUpdatePayload,
	UserContext,
	ViewportUpdatePayload
};

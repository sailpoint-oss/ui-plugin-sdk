import type {
	InternalSailPointPluginSDKConfig,
	PluginContext,
	TokenUpdatePayload,
	ViewportUpdatePayload
} from '../runtime/client';

export interface SailPointPluginSDK {
	initialize(): Promise<void>;
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

export type { PluginContext, TokenUpdatePayload, ViewportUpdatePayload };

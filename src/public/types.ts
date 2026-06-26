import type { MessageSource, MessageTarget } from '../protocol/types';

export interface TenantContext {
	id: string;
	scriptName: string;
	org: string;
	pod?: string;
	[key: string]: unknown;
}

export interface UserContext {
	id: string;
	displayName: string;
	email: string;
	uid?: string;
	alias?: string;
	amsRights?: string[];
	capabilities?: string[];
	uiRights?: string[];
	lastLoginTimestamp?: number;
	federated?: boolean;
	mfeSessionHash?: string;
	[key: string]: unknown;
}

export interface PageContext {
	route: string;
	[key: string]: unknown;
}

export interface SlotContext {
	[key: string]: unknown;
}

export interface PluginContext {
	tenant: TenantContext;
	user: UserContext;
	page: PageContext;
	slot: SlotContext;
}

export interface TokenUpdatePayload {
	token: string;
}

export interface ViewportUpdatePayload {
	width: number;
	height: number;
}

export interface SailPointPluginSDKConfig {
	targetOrigin: string;
	parentWindow?: MessageTarget;
	targetWindow?: MessageTarget;
	sourceWindow?: MessageSource;
	protocolVersion?: string;
	requestTimeoutMs?: number;
	maxClockSkewMs?: number;
	now?: () => number;
}

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

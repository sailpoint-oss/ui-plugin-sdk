import type { MessageSource, MessageTarget } from '../protocol/types';

/**
 * Base URLs the tenant exposes to plugins.
 *
 * Mirrors the App Shell `SP_PLUGIN_INIT_REQ` payload exactly: `idn` is the only
 * key the host sends. Use it as the base for API calls rather than deriving a
 * hostname from the tenant name.
 */
export interface TenantApiUrl {
	idn: string;
}

/**
 * A license held against a tenant product.
 *
 * Together with {@link TenantProduct} this is the documented primitive for
 * gating plugin features on what the *tenant* has bought. Gate on the *user's*
 * permissions with {@link UserCapabilities} instead.
 */
export interface TenantProductLicense {
	licenseId: string;
	legacyFeatureName: string;
}

/**
 * A product entitled to the current tenant.
 *
 * Note: App Shell currently sends an empty string for `status` and
 * `dateCreated`. They are typed `string` to mirror the payload, but carry no
 * meaningful data today — do not branch on them.
 *
 * Per-product *user* access is deliberately not represented. Product rights and
 * user capabilities live in disjoint namespaces on the host, so no correct
 * per-product boolean can be derived. Gate tenant features on `licenses`.
 */
export interface TenantProduct {
	productName: string;
	url: string;
	productTenantId: string;
	productRegion: string;
	apiUrl: string;
	licenses: TenantProductLicense[];
	zone: string;
	status: string;
	dateCreated: string;
}

export interface TenantContext {
	id: string;
	scriptName: string;
	org: string;
	name: string;
	pod: string;
	region: string;
	products: TenantProduct[];
	apiUrl: TenantApiUrl;
}

/**
 * Public SailPoint capabilities held by the current user, as booleans.
 *
 * Plugins receive derived capability flags instead of fine-grain AMS rights.
 * Rights (`productRight`, `uiRights`) are never published externally, so plugin
 * authors cannot interpret them; the publicly-documented capabilities are the
 * supported gating primitive. Per-product user access is not expressed at all —
 * gate tenant features on {@link TenantContext.products} `licenses` instead.
 *
 * Flags are exhaustive: every key is always present, `false` meaning the user
 * does not hold that capability. Plugins can therefore read any flag directly
 * without checking for its presence.
 */
export interface UserCapabilities {
	isOrgAdmin: boolean;
	isHelpdesk: boolean;
	isDashboard: boolean;
	isCertAdmin: boolean;
	isReportAdmin: boolean;
	isSourceAdmin: boolean;
	isSourceSubadmin: boolean;
	isRoleAdmin: boolean;
	isRoleSubadmin: boolean;
	isCloudGovAdmin: boolean;
	isCloudGovUser: boolean;
	isSaasManagementAdmin: boolean;
	isSaasManagementReader: boolean;
}

/**
 * Union of {@link UserCapabilities} flag names, for plugins that build their own
 * capability-keyed lookups.
 */
export type CapabilityFlagKey = keyof UserCapabilities;

export interface UserContext {
	id: string;
	displayName: string;
	email: string;
	capabilities: UserCapabilities;
}

export interface PageContext {
	/**
	 * The host page's full `window.location.href`, not a bare route path.
	 *
	 * The key mirrors the App Shell payload, whose name predates the value it
	 * carries. Parse it with `new URL(...)` rather than matching it as a path.
	 */
	route: string;
}

export interface SlotContext {
	[key: string]: unknown;
}

/**
 * Height bounds and slot identity the host assigned to this plugin instance.
 */
export interface SlotConfiguration {
	slot?: string;
	minimumHeight?: number;
	maximumHeight?: number;
}

/**
 * How the host mounted this plugin instance.
 *
 * Both members are optional because App Shell omits them for mount paths that
 * have no slot or no instance id.
 */
export interface PluginConfiguration {
	slotConfiguration?: SlotConfiguration;
	/** Full-page plugin instance id from the host URL path (UUID). */
	pluginId?: string;
}

export interface PluginContext {
	tenant: TenantContext;
	user: UserContext;
	page: PageContext;
	slot: SlotContext;
	pluginConfiguration: PluginConfiguration;
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
	fetchApi?: typeof fetch;
	protocolVersion?: string;
	requestTimeoutMs?: number;
	maxClockSkewMs?: number;
	now?: () => number;
}

export interface SailPointPluginSDK {
	getContext(): Promise<PluginContext>;
	api: {
		getToken(forceRefresh?: boolean): Promise<string>;
		get<T>(path: string): Promise<T>;
		post<T>(path: string, data: unknown): Promise<T>;
	};
	events: {
		onViewportChange(callback: (dimensions: ViewportUpdatePayload) => void): () => void;
		onTokenUpdate(callback: (newToken: string) => void): () => void;
	};
}

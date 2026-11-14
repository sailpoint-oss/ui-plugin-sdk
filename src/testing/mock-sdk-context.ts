import { COIP_PROTOCOL_VERSION, MESSAGE_TYPES } from '../protocol/constants.js';
import type {
	MessageTarget,
	RuntimeEnvelope,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from '../protocol/types.js';
import type {
	ColorScheme,
	PageContext,
	PluginContext,
	RouteChangePayload,
	UserCapabilities,
	ViewportUpdatePayload
} from '../public/types.js';
import { extractSubPath } from '../runtime/page-route.js';
import { DARK_COLOR_SCHEME_QUERY } from '../runtime/theme.js';

const DEFAULT_TARGET_ORIGIN = 'https://mock-app-shell.sailpoint.test';
const DEFAULT_TOKEN = 'mock-sdk-token';

/**
 * Capability flags for the default mock user.
 *
 * All `false` deliberately: the mock is what plugin authors copy, so the default
 * should model a least-privileged user and force an explicit opt-in to any
 * capability the plugin's happy path depends on.
 */
const DEFAULT_CAPABILITIES: UserCapabilities = {
	isOrgAdmin: false,
	isHelpdesk: false,
	isDashboard: false,
	isCertAdmin: false,
	isReportAdmin: false,
	isSourceAdmin: false,
	isSourceSubadmin: false,
	isRoleAdmin: false,
	isRoleSubadmin: false,
	isCloudGovAdmin: false,
	isCloudGovUser: false,
	isSaasManagementAdmin: false,
	isSaasManagementReader: false
};

const DEFAULT_CONTEXT: MockPluginContext = {
	tenant: {
		id: 'mock-tenant',
		scriptName: 'mock-tenant',
		org: 'mock-tenant',
		name: 'Mock Tenant',
		pod: 'mock-pod',
		region: 'mock-region',
		apiUrl: {
			idn: 'https://mock-tenant.api.identitynow.test'
		},
		products: []
	},
	user: {
		id: 'mock-user',
		displayName: 'Mock User',
		email: 'mock.user@example.com',
		capabilities: DEFAULT_CAPABILITIES
	},
	page: {
		/**
		 * Mirrors the App Shell full-page shape `/ui/plugin/{alias}/{subPath}`
		 * (saas-sp-renderer `plugin-route-sync.ts`), so a default mock exercises
		 * the sub-path parser the way production does.
		 */
		route: 'https://mock-app-shell.sailpoint.test/ui/plugin/mock-plugin/settings'
	},
	slot: {},
	pluginConfiguration: {
		pluginId: 'mock-plugin',
		slotConfiguration: {
			slot: 'mock-slot',
			minimumHeight: 400,
			maximumHeight: 2000
		}
	}
};

/**
 * Plugin context as a test supplies it. `page.subPath` is optional because the
 * SDK derives it from `page.route`; a supplied value is ignored, so the
 * handle's `context` always matches what `sdk.getContext()` resolves to.
 */
export type MockPluginContext = Omit<PluginContext, 'page'> & {
	page: Omit<PageContext, 'subPath'> & Partial<Pick<PageContext, 'subPath'>>;
};

interface MockSourceWindow {
	dispatchEvent(event: Event): boolean;
}

export interface MockSdkContextOptions {
	context?: MockPluginContext;
	token?: string;
	targetOrigin?: string;
	protocolVersion?: string;
	now?: () => number;
	parentWindow?: MessageTarget;
	sourceWindow?: MockSourceWindow;
	/** Host color scheme the frame's `prefers-color-scheme` reports. Defaults to `'light'`. */
	colorScheme?: ColorScheme;
}

export interface MockOutboundMessage {
	message: unknown;
	targetOrigin: string;
}

export interface MockSdkContextHandle {
	readonly context: PluginContext;
	readonly messages: readonly MockOutboundMessage[];
	readonly targetOrigin: string;
	/** `subPath` values the SDK sent via `navigation.setRoute`, in order, after SDK normalization. */
	readonly routeChanges: readonly string[];
	emitTokenUpdate(token: string): void;
	emitViewportChange(dimensions: ViewportUpdatePayload): void;
	/** Switches the host theme. Like a browser, fires `change` only when the scheme flips. */
	emitThemeChange(colorScheme: ColorScheme): void;
	restore(): void;
}

/**
 * Media query list whose match the mock host controls.
 */
class MockMediaQueryList extends EventTarget {
	public readonly media: string;
	private currentMatches: boolean;

	public constructor(media: string, matches: boolean) {
		super();
		this.media = media;
		this.currentMatches = matches;
	}

	public get matches(): boolean {
		return this.currentMatches;
	}

	public setMatches(matches: boolean): void {
		if (matches === this.currentMatches) {
			return;
		}

		this.currentMatches = matches;
		this.dispatchEvent(Object.assign(new Event('change'), { matches, media: this.media }));
	}
}

const getBrowserWindow = (): Window => {
	if (typeof window === 'undefined') {
		throw new Error('mockSdkContext requires a browser-like window or explicit window mocks.');
	}

	return window;
};

/**
 * Answers the dark color-scheme query from `darkSchemeQuery` and passes other
 * queries to the original `matchMedia`, or never matches them when there is
 * none (jsdom). Returns a function that puts the original back.
 */
const installMatchMedia = (browserWindow: Window, darkSchemeQuery: MockMediaQueryList): (() => void) => {
	const hadOwnMatchMedia = Object.prototype.hasOwnProperty.call(browserWindow, 'matchMedia');
	const originalMatchMedia: Window['matchMedia'] | undefined = browserWindow.matchMedia;

	browserWindow.matchMedia = (query: string): MediaQueryList => {
		if (query === DARK_COLOR_SCHEME_QUERY) {
			return darkSchemeQuery as unknown as MediaQueryList;
		}

		return typeof originalMatchMedia === 'function'
			? originalMatchMedia.call(browserWindow, query)
			: (new MockMediaQueryList(query, false) as unknown as MediaQueryList);
	};

	return () => {
		if (hadOwnMatchMedia) {
			browserWindow.matchMedia = originalMatchMedia as Window['matchMedia'];
		} else {
			Reflect.deleteProperty(browserWindow, 'matchMedia');
		}
	};
};

const isEnvelope = (value: unknown): value is RuntimeEnvelope => {
	return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
};

/**
 * Installs a lightweight App Shell mock around the SDK's parent-window transport.
 * The returned handle can emit host events and must be restored after each test.
 */
export const mockSdkContext = (options: MockSdkContextOptions = {}): MockSdkContextHandle => {
	const browserWindow = options.parentWindow && options.sourceWindow ? null : getBrowserWindow();
	const parentWindow = options.parentWindow ?? (browserWindow?.parent as unknown as MessageTarget);
	const sourceWindow = options.sourceWindow ?? (browserWindow as unknown as MockSourceWindow);
	const targetOrigin = options.targetOrigin ?? DEFAULT_TARGET_ORIGIN;
	const protocolVersion = options.protocolVersion ?? COIP_PROTOCOL_VERSION;
	const now = options.now ?? (() => Date.now());
	const timestamp = (): string => new Date(now()).toISOString();
	const suppliedContext = options.context ?? DEFAULT_CONTEXT;
	const context: PluginContext = {
		...suppliedContext,
		page: {
			...suppliedContext.page,
			subPath: extractSubPath(suppliedContext.page.route)
		}
	};
	const messages: MockOutboundMessage[] = [];
	const originalPostMessage = parentWindow.postMessage;
	const darkSchemeQuery = new MockMediaQueryList(DARK_COLOR_SCHEME_QUERY, options.colorScheme === 'dark');
	/**
	 * Patches the global window even when explicit window mocks are supplied,
	 * because the SDK reads the theme from the global `matchMedia`.
	 */
	const restoreMatchMedia =
		typeof window === 'undefined' ? () => undefined : installMatchMedia(window, darkSchemeQuery);
	let currentToken = options.token ?? DEFAULT_TOKEN;
	let requestSequence = 0;
	let restored = false;

	const nextRequestId = (): string => {
		requestSequence += 1;
		return `mock-sdk-${requestSequence}`;
	};

	const dispatchIncoming = (message: RuntimeEnvelope): void => {
		sourceWindow.dispatchEvent(
			new MessageEvent('message', {
				data: message,
				origin: targetOrigin
			})
		);
	};

	const dispatchRequest = (type: RuntimeRequestEnvelope['type'], payload: unknown): void => {
		dispatchIncoming({
			type,
			requestId: nextRequestId(),
			timestamp: timestamp(),
			payload
		});
	};

	const dispatchResponse = (type: RuntimeResponseEnvelope['type'], requestId: string, payload: unknown): void => {
		dispatchIncoming({
			type,
			requestId,
			timestamp: timestamp(),
			payload
		});
	};

	const enqueue = (callback: () => void): void => {
		if (typeof queueMicrotask === 'function') {
			queueMicrotask(callback);
			return;
		}

		void Promise.resolve().then(callback);
	};

	const handleOutboundMessage = (message: unknown, outboundOrigin: string): void => {
		messages.push({
			message,
			targetOrigin: outboundOrigin
		});

		if (restored || outboundOrigin !== targetOrigin || !isEnvelope(message)) {
			return;
		}

		switch (message.type) {
			case MESSAGE_TYPES.SP_PLUGIN_READY_REQ:
				enqueue(() => {
					dispatchResponse(MESSAGE_TYPES.SP_PLUGIN_READY_RES, message.requestId, {
						protocolVersion
					});
					enqueue(() => {
						dispatchRequest(MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_REQ, {
							token: {
								accessToken: currentToken,
								refreshInterval: 300
							}
						});
					});
				});
				break;
			case MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES:
				enqueue(() => {
					dispatchRequest(MESSAGE_TYPES.SP_PLUGIN_INIT_REQ, suppliedContext);
				});
				break;
			case MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ:
				enqueue(() => {
					dispatchResponse(MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_RES, message.requestId, {
						token: {
							accessToken: currentToken,
							refreshInterval: 300
						}
					});
				});
				break;
		}
	};

	parentWindow.postMessage = handleOutboundMessage;

	return {
		context,
		get messages(): readonly MockOutboundMessage[] {
			return [...messages];
		},
		targetOrigin,
		get routeChanges(): readonly string[] {
			return messages
				.filter(entry => entry.targetOrigin === targetOrigin)
				.map(entry => entry.message)
				.filter(isEnvelope)
				.filter(message => message.type === MESSAGE_TYPES.SP_ROUTE_CHANGE_EVT)
				.map(message => (message.payload as RouteChangePayload).subPath);
		},
		emitTokenUpdate(token: string): void {
			currentToken = token;
			dispatchIncoming({
				type: MESSAGE_TYPES.SP_TOKEN_UPDATE_EVT,
				timestamp: timestamp(),
				payload: {
					token: {
						accessToken: token,
						refreshInterval: 300
					}
				}
			});
		},
		emitViewportChange(dimensions: ViewportUpdatePayload): void {
			dispatchIncoming({
				type: MESSAGE_TYPES.SP_VIEWPORT_UPDATE_EVT,
				timestamp: timestamp(),
				payload: dimensions
			});
		},
		emitThemeChange(colorScheme: ColorScheme): void {
			darkSchemeQuery.setMatches(colorScheme === 'dark');
		},
		restore(): void {
			if (restored) {
				return;
			}

			parentWindow.postMessage = originalPostMessage;
			restoreMatchMedia();
			restored = true;
		}
	};
};

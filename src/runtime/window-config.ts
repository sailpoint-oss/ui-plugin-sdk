import type { PluginContext, SailPointWindowConfig } from '../public/types';

export interface WindowSailpointConfigSource {
	getContext(): Promise<PluginContext>;
	getToken(forceRefresh?: boolean): Promise<string>;
}

const stripTrailingSlashes = (url: string): string => url.replace(/\/+$/g, '');

/**
 * Registers {@link Window.sailpointConfig} on the global object after COIP handshake.
 * Each call replaces any prior registration so the latest SDK instance wins.
 */
export const registerWindowSailpointConfig = (source: WindowSailpointConfigSource): void => {
	if (typeof globalThis === 'undefined') {
		return;
	}

	const globalWindow = globalThis as typeof globalThis & Window;
	globalWindow.sailpointConfig = async (): Promise<SailPointWindowConfig> => {
		const context = await source.getContext();

		return {
			baseurl: stripTrailingSlashes(context.tenant.apiUrl.idn),
			accessToken: await source.getToken(true)
		};
	};
};

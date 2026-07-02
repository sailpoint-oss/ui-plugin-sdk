import { InternalSailPointPluginSDK } from '../runtime/client';
import type { SailPointPluginSDK, SailPointPluginSDKConfig } from './types';

export const createSDK = (config: SailPointPluginSDKConfig): SailPointPluginSDK => {
	const internalSDK = new InternalSailPointPluginSDK(config);

	return {
		getContext: () => internalSDK.getContext(),
		api: {
			getToken: (forceRefresh?: boolean) => internalSDK.getToken(forceRefresh),
			get: (input: RequestInfo | URL, init?: RequestInit) => internalSDK.get(input, init),
			post: (input: RequestInfo | URL, body?: BodyInit | null, init?: RequestInit) =>
				internalSDK.post(input, body, init)
		},
		events: {
			onViewportChange: callback => internalSDK.onViewportUpdate(callback),
			onTokenUpdate: callback =>
				internalSDK.onTokenUpdate(payload => {
					callback(payload.token);
				})
		}
	};
};

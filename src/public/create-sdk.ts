import { InternalSailPointPluginSDK } from '../runtime/client';
import type { SailPointPluginSDK, SailPointPluginSDKConfig } from './types';

export const createSDK = (config: SailPointPluginSDKConfig): SailPointPluginSDK => {
	const internalSDK = new InternalSailPointPluginSDK(config);

	return {
		initialize: () => internalSDK.initialize(),
		getContext: () => internalSDK.getContext(),
		api: {
			getToken: (forceRefresh?: boolean) => internalSDK.getToken(forceRefresh)
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

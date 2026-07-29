import { InternalSailPointPluginSDK } from '../runtime/client';
import { resolveTargetOrigin } from '../runtime/target-origin';
import type { SailPointPluginSDK, SailPointPluginSDKConfig } from './types';

export const createSDK = (config: SailPointPluginSDKConfig = {}): SailPointPluginSDK => {
	const internalSDK = new InternalSailPointPluginSDK({
		...config,
		targetOrigin: resolveTargetOrigin(config.targetOrigin)
	});

	return {
		getContext: () => internalSDK.getContext(),
		api: {
			getToken: (forceRefresh?: boolean) => internalSDK.getToken(forceRefresh),
			get: <T>(path: string) => internalSDK.get<T>(path),
			post: <T>(path: string, data: unknown) => internalSDK.post<T>(path, data)
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

import type { PluginBrand } from '../public/types';
import { isRecord } from './engine.utils';

const PLUGIN_BRAND_FIELDS = [
	'actionButtonColor',
	'darkActionButtonColor',
	'activeLinkColor',
	'darkActiveLinkColor',
	'navigationColor',
	'darkNavigationColor',
	'productName',
	'logoUrl',
	'darkLogoUrl'
] as const satisfies readonly (keyof PluginBrand)[];

/**
 * Projects the public brand allowlist from an untrusted App Shell payload.
 */
export const projectPluginBrand = (value: unknown): PluginBrand | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const brand: PluginBrand = {};
	for (const field of PLUGIN_BRAND_FIELDS) {
		const fieldValue = value[field];
		if (typeof fieldValue === 'string') {
			brand[field] = fieldValue;
		}
	}

	return brand;
};

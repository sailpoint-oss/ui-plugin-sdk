/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import type { SpdsColorScheme } from '../color-scheme';
import type { SpdsBrandFamily } from './branding.model';

/**
 * Compact SPDS branding defaults retained while the standalone theme package is unavailable.
 *
 * Values are normalized opaque hex colors so branding resolution does not need the full generated preset at runtime.
 */
export const SPDS_BRANDING_DEFAULTS: Readonly<Record<SpdsBrandFamily, Readonly<Record<SpdsColorScheme, string>>>> = {
	actionButton: {
		light: '#1d5ade',
		dark: '#00aaff'
	},
	activeLink: {
		light: '#1d5ade',
		dark: '#66cfff'
	},
	navigation: {
		light: '#0033a1',
		dark: '#66cfff'
	}
};

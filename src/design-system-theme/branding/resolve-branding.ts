/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
/**
 * Resolves a partial brand into complete light and dark color scales.
 *
 * A valid base is kept and both stops are derived from it. A missing or invalid base uses that scheme's SPDS default.
 * A missing dark base does not reuse the light base. An empty brand resolves entirely from the defaults.
 */
import { getAdjustedColor, isValidHex } from '../color/color';
import { SPDS_BRANDING_DEFAULTS } from './branding-defaults';
import type {
	ResolvedSpdsBranding,
	SpdsBrandFamily,
	SpdsBrandingConfig,
	SpdsColorScale,
	SpdsFamilyColors
} from './branding.model';

const ADJUST_PERCENT = 10;

const BRAND_COLOR_FIELDS: Record<SpdsBrandFamily, { light: keyof SpdsBrandingConfig; dark: keyof SpdsBrandingConfig }> =
	{
		actionButton: { light: 'actionButtonColor', dark: 'darkActionButtonColor' },
		activeLink: { light: 'activeLinkColor', dark: 'darkActiveLinkColor' },
		navigation: { light: 'navigationColor', dark: 'darkNavigationColor' }
	};

/**
 * Expands three hex digits by doubling each one, then lowercases six digits.
 * @param digits Hex digits without a leading hash.
 * @returns Lowercase `#RRGGBB`.
 */
function toOpaqueHex(digits: string): string {
	const expanded = digits.length === 3 ? [...digits].map(digit => `${digit}${digit}`).join('') : digits;

	return `#${expanded.toLowerCase()}`;
}

/**
 * Expands a caller `#RGB` or `#RRGGBB` value to lowercase `#RRGGBB`.
 * @param hex Caller color already accepted by `isValidHex`.
 * @returns Lowercase six-digit hex.
 */
function normalizeCallerHex(hex: string): string {
	return toOpaqueHex(hex.slice(1));
}

/**
 * Keeps a valid caller base, or uses the SPDS default for this scheme, then derives both stops.
 * @param callerColor Caller value for this scheme, when present.
 * @param fallback Default base for this family and scheme.
 * @returns Base and derived lighter and darker stops.
 */
function resolveScale(callerColor: string | undefined, fallback: string): SpdsColorScale {
	const base = callerColor !== undefined && isValidHex(callerColor) ? normalizeCallerHex(callerColor) : fallback;

	return {
		base,
		lighter: getAdjustedColor(base, ADJUST_PERCENT, true) ?? base,
		darker: getAdjustedColor(base, ADJUST_PERCENT, false) ?? base
	};
}

/**
 * Resolves both schemes for one family.
 * @param input Caller brand. Missing fields are omitted.
 * @param family Family to resolve.
 * @returns Light and dark scales for `family`.
 */
function resolveFamily(input: SpdsBrandingConfig, family: SpdsBrandFamily): SpdsFamilyColors {
	const fields = BRAND_COLOR_FIELDS[family];
	const defaults = SPDS_BRANDING_DEFAULTS[family];

	return {
		light: resolveScale(input[fields.light], defaults.light),
		dark: resolveScale(input[fields.dark], defaults.dark)
	};
}

/**
 * Turns a partial brand into a complete color matrix.
 *
 * `null` and `undefined` are treated as an empty brand. One invalid field does not fail the other scheme or the other
 * families.
 * @param brand Optional partial brand.
 * @returns Every family in light and dark, each with a base and derived lighter and darker stops.
 */
export function resolveSpdsBranding(brand?: SpdsBrandingConfig | null): ResolvedSpdsBranding {
	const input = brand ?? {};

	return {
		colors: {
			actionButton: resolveFamily(input, 'actionButton'),
			activeLink: resolveFamily(input, 'activeLink'),
			navigation: resolveFamily(input, 'navigation')
		}
	};
}

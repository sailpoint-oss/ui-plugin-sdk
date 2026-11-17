/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */

/**
 * Colors an application can apply to SPDS.
 *
 * SPDS brands three color families: action button, active link, and navigation. Each family takes a light base and a
 * dark base. Every field is optional. A partial brand is valid and expected. Omitted values resolve from SPDS
 * defaults. A missing dark base uses the dark default and does not reuse the light value. Lighter and darker
 * stops are derived from the base color for the same scheme.
 *
 * Each color must be an opaque hex color, `#RGB` or `#RRGGBB`.
 */
export interface SpdsBrandingConfig {
	/**
	 * Action button color.
	 */
	actionButtonColor?: string;

	/**
	 * Action button color for the dark color scheme.
	 */
	darkActionButtonColor?: string;

	/**
	 * Active link color.
	 */
	activeLinkColor?: string;

	/**
	 * Active link color for the dark color scheme.
	 */
	darkActiveLinkColor?: string;

	/**
	 * Navigation color.
	 */
	navigationColor?: string;

	/**
	 * Navigation color for the dark color scheme.
	 */
	darkNavigationColor?: string;
}

/** A brandable color family. */
export type SpdsBrandFamily = 'actionButton' | 'activeLink' | 'navigation';

/**
 * One scheme's base color and the lighter and darker stops derived from it.
 */
export interface SpdsColorScale {
	/** Opaque `#RRGGBB` base color. */
	base: string;

	/** Lighter stop derived from `base`. */
	lighter: string;

	/** Darker stop derived from `base`. */
	darker: string;
}

/**
 * Light and dark scales for one family.
 */
export interface SpdsFamilyColors {
	/** Light color scheme. */
	light: SpdsColorScale;

	/** Dark color scheme. */
	dark: SpdsColorScale;
}

/**
 * Complete branding matrix. Every family and both schemes are present.
 */
export interface ResolvedSpdsBranding {
	/** Resolved scales keyed by family. */
	colors: Record<SpdsBrandFamily, SpdsFamilyColors>;
}

/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */

/**
 * Opaque `#RGB` and `#RRGGBB` only.
 */
const VALID_OPAQUE_HEX_REG_EXP = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Whether a string is an opaque `#RGB` or `#RRGGBB` hex color.
 *
 * The value must match in full. Missing hashes, whitespace, extra digits, named colors, CSS functions, and trailing
 * characters are rejected without trimming or coercion.
 * @param hex The hex string to test.
 * @returns Whether the hex string is a valid opaque color.
 */
export function isValidHex(hex: string): boolean {
	return VALID_OPAQUE_HEX_REG_EXP.test(hex);
}

/**
 * Parses an opaque hex color into RGB channels.
 *
 * A missing `#` is prepended before validation. {@link isValidHex} itself still requires the hash.
 * @param hex The hex string to parse.
 * @returns RGB channels, or undefined when the value is not an opaque 3- or 6-digit hex color.
 */
function parseOpaqueHexColor(hex: string): { r: number; g: number; b: number } | undefined {
	const hexValue = hex.includes('#') ? hex : `#${hex}`;

	if (!isValidHex(hexValue)) {
		return undefined;
	}

	const chunkSize = Math.floor((hexValue.length - 1) / 3);
	const hexChannels = hexValue
		.slice(1)
		.match(new RegExp(`.{${chunkSize}}`, 'g'))
		?.map(hexString => parseInt(hexString.repeat(2 / hexString.length), 16));

	if (!hexChannels) {
		return undefined;
	}

	const [r, g, b] = hexChannels;

	return { r, g, b };
}

function rgbToHsl(red: number, green: number, blue: number): number[] {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;

	const max = Math.max(r, g) === r ? Math.max(r, b) : Math.max(g, b);
	const min = Math.min(r, g) === r ? Math.min(r, b) : Math.min(g, b);
	let hue = 0;
	let saturation = 0;
	const lightness = (max + min) / 2;

	if (max !== min) {
		const delta = max - min;
		saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

		if (max === r) {
			hue = (g - b) / delta + (g < b ? 6 : 0);
		} else if (max === g) {
			hue = (b - r) / delta + 2;
		} else {
			hue = (r - g) / delta + 4;
		}

		hue = hue / 6;
	}

	return [+hue.toFixed(8), +saturation.toFixed(8), +lightness.toFixed(8)];
}

function hueToRgb(p: number, q: number, t: number): number {
	if (t < 0) {
		t += 1;
	}

	if (t > 1) {
		t -= 1;
	}

	if (t < 1 / 6) {
		return p + (q - p) * 6 * t;
	}

	if (t < 1 / 2) {
		return q;
	}

	if (t < 2 / 3) {
		return p + (q - p) * (2 / 3 - t) * 6;
	}

	return p;
}

function hslToRgb(h: number, s: number, l: number): number[] {
	let r: number;
	let g: number;
	let b: number;

	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hueToRgb(p, q, h + 1 / 3);
		g = hueToRgb(p, q, h);
		b = hueToRgb(p, q, h - 1 / 3);
	}

	return [Math.trunc(r * 255), Math.trunc(g * 255), Math.trunc(b * 255)];
}

function hslToHex(hue: number, saturation: number, brightness: number): string {
	const rgb = hslToRgb(hue, saturation, brightness);

	// eslint-disable-next-line no-bitwise
	return `#${((1 << 24) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16).slice(1)}`;
}

/**
 * Retrieves a lighter or darker color from a hex value.
 *
 * @param hex Hex color to adjust. A missing `#` is added before validation.
 * @param percent Percent by which the color should be adjusted.
 * @param lighter Whether to make the color lighter or darker.
 * @returns Adjusted lowercase six-digit hex color, or null when input cannot be parsed.
 */
export function getAdjustedColor(hex: string | undefined, percent: number, lighter: boolean): string | null {
	if (hex == null) {
		return null;
	}

	const color = parseOpaqueHexColor(hex);

	if (!color) {
		return null;
	}

	const hsl = rgbToHsl(color.r, color.g, color.b);

	if (hsl.length === 3) {
		if (lighter) {
			hsl[2] = hsl[2] + percent / 100.0 > 1 ? 1 : hsl[2] + percent / 100.0;
		} else {
			hsl[2] = hsl[2] - percent / 100.0 < 0 ? 0 : hsl[2] - percent / 100.0;
		}
	}

	return hslToHex(hsl[0], hsl[1], hsl[2]);
}

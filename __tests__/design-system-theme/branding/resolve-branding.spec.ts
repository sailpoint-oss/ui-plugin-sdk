/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { SpdsBrandFamily } from '../../../src/design-system-theme/branding/branding.model';
import { resolveSpdsBranding } from '../../../src/design-system-theme/branding/resolve-branding';
import type { SpdsColorScheme } from '../../../src/design-system-theme/color-scheme';
import { getAdjustedColor } from '../../../src/design-system-theme/color/color';

const EXPECTED_DEFAULT_BASES: ReadonlyArray<{
	family: SpdsBrandFamily;
	scheme: SpdsColorScheme;
	base: string;
}> = [
	{ family: 'actionButton', scheme: 'light', base: '#1d5ade' },
	{ family: 'actionButton', scheme: 'dark', base: '#00aaff' },
	{ family: 'activeLink', scheme: 'light', base: '#1d5ade' },
	{ family: 'activeLink', scheme: 'dark', base: '#66cfff' },
	{ family: 'navigation', scheme: 'light', base: '#0033a1' },
	{ family: 'navigation', scheme: 'dark', base: '#66cfff' }
];

describe('resolveSpdsBranding()', () => {
	describe('empty brand', () => {
		it('should treat a missing argument, an empty object, and null as the same matrix', () => {
			const missing = resolveSpdsBranding();
			const empty = resolveSpdsBranding({});
			const absent = resolveSpdsBranding(null);

			expect(missing).toEqual(empty);
			expect(empty).toEqual(absent);
		});

		it('should fill every base from the compact SPDS defaults and derive both stops', () => {
			const resolved = resolveSpdsBranding();

			for (const { family, scheme, base } of EXPECTED_DEFAULT_BASES) {
				const scale = resolved.colors[family][scheme];

				expect(scale.base).toBe(base);
				expect(scale.lighter).toBe(getAdjustedColor(base, 10, true));
				expect(scale.darker).toBe(getAdjustedColor(base, 10, false));
			}
		});
	});

	describe('caller colors', () => {
		it('should keep a valid navigation base and leave the dark scheme on its default', () => {
			const defaults = resolveSpdsBranding();
			const resolved = resolveSpdsBranding({ navigationColor: '#112233' });

			expect(resolved.colors.navigation.light.base).toBe('#112233');
			expect(resolved.colors.navigation.light.lighter).toBe(getAdjustedColor('#112233', 10, true));
			expect(resolved.colors.navigation.light.darker).toBe(getAdjustedColor('#112233', 10, false));
			expect(resolved.colors.navigation.dark.base).toBe('#66cfff');
			expect(resolved.colors.navigation.dark.lighter).toBe(getAdjustedColor('#66cfff', 10, true));
			expect(resolved.colors.navigation.dark.darker).toBe(getAdjustedColor('#66cfff', 10, false));
			expect(resolved.colors.actionButton).toEqual(defaults.colors.actionButton);
			expect(resolved.colors.activeLink).toEqual(defaults.colors.activeLink);
		});

		it('should expand a three-digit action button color and keep the dark default base', () => {
			const resolved = resolveSpdsBranding({ actionButtonColor: '#abc' });

			expect(resolved.colors.actionButton.light.base).toBe('#aabbcc');
			expect(resolved.colors.actionButton.light.lighter).toBe(getAdjustedColor('#aabbcc', 10, true));
			expect(resolved.colors.actionButton.light.darker).toBe(getAdjustedColor('#aabbcc', 10, false));
			expect(resolved.colors.actionButton.dark.base).toBe('#00aaff');
		});

		it('should lowercase a mixed-case base before deriving stops', () => {
			const threeDigit = resolveSpdsBranding({ actionButtonColor: '#AbC' });
			const sixDigit = resolveSpdsBranding({ navigationColor: '#1122AA' });

			expect(threeDigit.colors.actionButton.light.base).toBe('#aabbcc');
			expect(threeDigit.colors.actionButton.light.lighter).toBe(getAdjustedColor('#aabbcc', 10, true));
			expect(sixDigit.colors.navigation.light.base).toBe('#1122aa');
			expect(sixDigit.colors.navigation.light.lighter).toBe(getAdjustedColor('#1122aa', 10, true));
		});

		it('should not copy a light active link base into the dark scheme', () => {
			const resolved = resolveSpdsBranding({ activeLinkColor: '#123456' });

			expect(resolved.colors.activeLink.light.base).toBe('#123456');
			expect(resolved.colors.activeLink.dark.base).toBe('#66cfff');
			expect(resolved.colors.activeLink.dark.base).not.toBe('#123456');
			expect(resolved.colors.activeLink.dark.base).not.toBe('#1d5ade');
			expect(resolved.colors.activeLink.dark.lighter).toBe(getAdjustedColor('#66cfff', 10, true));
			expect(resolved.colors.activeLink.dark.darker).toBe(getAdjustedColor('#66cfff', 10, false));
		});

		it.each([
			['a missing hash', '1D5ADE'],
			['an empty string', ''],
			['leading whitespace', ' #112233'],
			['trailing whitespace', '#112233 '],
			['a named color', 'red'],
			['a CSS function', 'rgb(1, 2, 3)'],
			['an eight-digit hex', '#112233ff'],
			['a four-digit hex', '#1122']
		])('should fall back when the light action button color is %s', (_label: string, actionButtonColor: string) => {
			const resolved = resolveSpdsBranding({
				actionButtonColor,
				darkActionButtonColor: '#123456'
			});

			expect(resolved.colors.actionButton.light.base).toBe('#1d5ade');
			expect(resolved.colors.actionButton.light.lighter).toBe(getAdjustedColor('#1d5ade', 10, true));
			expect(resolved.colors.actionButton.light.darker).toBe(getAdjustedColor('#1d5ade', 10, false));
			expect(resolved.colors.actionButton.dark.base).toBe('#123456');
			expect(resolved.colors.actionButton.dark.lighter).toBe(getAdjustedColor('#123456', 10, true));
			expect(resolved.colors.actionButton.dark.darker).toBe(getAdjustedColor('#123456', 10, false));
		});
	});

	describe('resolve-branding.ts', () => {
		it('should contain no color literal, preset import, design-token helper, or framework import', () => {
			const source = readFileSync(
				join(__dirname, '../../../src/design-system-theme/branding/resolve-branding.ts'),
				'utf8'
			);

			expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
			expect(source).not.toMatch(/spds-preset|token-resolver/);
			expect(source).not.toMatch(/\$dt\(/);
			expect(source).not.toMatch(/@angular/);
			expect(source).not.toMatch(/rxjs/);
		});
	});
});

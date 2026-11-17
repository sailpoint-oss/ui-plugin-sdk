/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import {
	SPDS_BRANDING_OVERRIDES,
	buildSpdsBrandingCss,
	buildSpdsOverrideCss
} from '../../../src/design-system-theme/branding/branding-css';
import type { SpdsBrandFamily, SpdsColorScale } from '../../../src/design-system-theme/branding/branding.model';
import { resolveSpdsBranding } from '../../../src/design-system-theme/branding/resolve-branding';

const ACTION_BUTTON_COLOR = '--spds-branding-action-button-color';
const ACTION_BUTTON_HOVER_COLOR = '--spds-branding-action-button-hover-color';
const ACTIVE_LINK_COLOR = '--spds-branding-active-link-color';
const ACTIVE_LINK_HOVER_COLOR = '--spds-branding-active-link-hover-color';
const NAVIGATION_COLOR = '--spds-branding-navigation-color';

const EXPECTED_BRANDING_OVERRIDES: readonly (readonly [string, string])[] = [
	['button.primary.background', ACTION_BUTTON_COLOR],
	['button.primary.border.color', ACTION_BUTTON_COLOR],
	['button.primary.hover.background', ACTION_BUTTON_HOVER_COLOR],
	['button.primary.hover.border.color', ACTION_BUTTON_HOVER_COLOR],
	['button.primary.active.background', ACTION_BUTTON_HOVER_COLOR],
	['button.primary.active.border.color', ACTION_BUTTON_HOVER_COLOR],
	['button.secondary.color', ACTION_BUTTON_COLOR],
	['button.secondary.border.color', ACTION_BUTTON_COLOR],
	['button.secondary.hover.color', ACTION_BUTTON_HOVER_COLOR],
	['button.secondary.hover.border.color', ACTION_BUTTON_HOVER_COLOR],
	['button.secondary.active.color', ACTION_BUTTON_HOVER_COLOR],
	['button.secondary.active.border.color', ACTION_BUTTON_HOVER_COLOR],
	['button.text.primary.color', ACTION_BUTTON_COLOR],
	['button.outlined.primary.color', ACTION_BUTTON_COLOR],
	['button.outlined.primary.border.color', ACTION_BUTTON_COLOR],
	['button.link.color', ACTIVE_LINK_COLOR],
	['button.link.hover.color', ACTIVE_LINK_HOVER_COLOR],
	['button.link.active.color', ACTIVE_LINK_HOVER_COLOR],
	['togglebutton.content.checked.background', ACTION_BUTTON_COLOR],
	['tabs.active.bar.background', ACTIVE_LINK_COLOR],
	['tabs.tab.active.color', ACTIVE_LINK_COLOR],
	['tabs.tab.active.border.color', ACTIVE_LINK_COLOR],
	['tabs.tab.hover.color', ACTIVE_LINK_HOVER_COLOR],
	['tabs.tab.hover.border.color', ACTIVE_LINK_HOVER_COLOR],
	['panelmenu.item.focus.color', ACTIVE_LINK_COLOR],
	['panelmenu.item.icon.focus.color', ACTIVE_LINK_COLOR],
	['panelmenu.submenu.icon.focus.color', ACTIVE_LINK_COLOR],
	['breadcrumb.item.color', ACTIVE_LINK_COLOR],
	['breadcrumb.item.hover.color', ACTIVE_LINK_HOVER_COLOR],
	['breadcrumb.item.icon.color', ACTIVE_LINK_COLOR],
	['breadcrumb.item.icon.hover.color', ACTIVE_LINK_HOVER_COLOR],
	['stepper.step.number.active.color', ACTIVE_LINK_COLOR],
	['stepper.step.title.active.color', ACTIVE_LINK_COLOR],
	['stepper.separator.active.background', ACTIVE_LINK_COLOR],
	['menubar.item.focus.color', NAVIGATION_COLOR],
	['menubar.item.active.color', NAVIGATION_COLOR],
	['menubar.item.icon.focus.color', NAVIGATION_COLOR],
	['menubar.item.icon.active.color', NAVIGATION_COLOR],
	['menubar.submenu.icon.focus.color', NAVIGATION_COLOR]
];

const STATUS_NAMES = ['danger', 'help', 'warn', 'info', 'success', 'contrast', 'severity'];

const FAMILIES: readonly { family: SpdsBrandFamily; slug: string }[] = [
	{ family: 'actionButton', slug: 'action-button' },
	{ family: 'activeLink', slug: 'active-link' },
	{ family: 'navigation', slug: 'navigation' }
];

const STOPS: readonly { suffix: string; stop: keyof SpdsColorScale }[] = [
	{ suffix: 'color', stop: 'base' },
	{ suffix: 'lighter-color', stop: 'lighter' },
	{ suffix: 'darker-color', stop: 'darker' }
];

describe('SPDS branding CSS', () => {
	describe('branded component token list', () => {
		it('matches the 39-entry list in order', () => {
			expect(SPDS_BRANDING_OVERRIDES).toHaveLength(39);
			expect(SPDS_BRANDING_OVERRIDES).toEqual(EXPECTED_BRANDING_OVERRIDES);
		});

		it('keeps status and severity tokens out of every mapped path', () => {
			for (const [path] of SPDS_BRANDING_OVERRIDES) {
				for (const statusName of STATUS_NAMES) {
					expect(path).not.toContain(statusName);
				}
			}
		});

		it('emits each override as an important branding-variable reference', () => {
			const css = buildSpdsOverrideCss();
			const declarations = SPDS_BRANDING_OVERRIDES.map(
				([path, brandingVariable]) => `--spds-${path.split('.').join('-')}:var(${brandingVariable}) !important;`
			);

			expect(css).toBe(`:root, :host{${declarations.join('')}}`);
			expect(
				css.startsWith(
					':root, :host{--spds-button-primary-background:var(--spds-branding-action-button-color) !important;'
				)
			).toBe(true);

			for (const declaration of declarations) {
				expect(declaration).toContain(' !important');
			}
		});
	});

	describe('semantic variables', () => {
		it('points hover at the darker light stop and the lighter dark stop', () => {
			const css = buildSpdsBrandingCss(resolveSpdsBranding());

			for (const slug of ['action-button', 'active-link', 'navigation']) {
				expect(css).toContain(
					`--spds-branding-${slug}-hover-color:light-dark(var(--spds-branding-light-${slug}-darker-color), var(--spds-branding-dark-${slug}-lighter-color));`
				);
				expect(css).toContain(
					`--spds-branding-${slug}-color:light-dark(var(--spds-branding-light-${slug}-color), var(--spds-branding-dark-${slug}-color));`
				);
			}
		});
	});

	describe('direct values', () => {
		it('writes an empty brand from the resolver, in mode then family then stop order', () => {
			const resolved = resolveSpdsBranding();
			const declarations: string[] = [];

			for (const mode of ['light', 'dark'] as const) {
				for (const { family, slug } of FAMILIES) {
					for (const { suffix, stop } of STOPS) {
						declarations.push(
							`--spds-branding-${mode}-${slug}-${suffix}:${resolved.colors[family][mode][stop]};`
						);
					}
				}
			}

			const css = buildSpdsBrandingCss(resolved);

			expect(css.startsWith(`:root, :host{${declarations.join('')}`)).toBe(true);
		});

		it('drops caller strings that are not valid hex and keeps the SPDS fallback', () => {
			const injected = '#fff; color: red';
			const braces = 'pre{{post';
			const fallback = resolveSpdsBranding();
			const css = buildSpdsBrandingCss(
				resolveSpdsBranding({
					actionButtonColor: injected,
					activeLinkColor: braces
				})
			);

			expect(css).not.toContain(injected);
			expect(css).not.toContain('{{');
			expect(css).toContain(fallback.colors.actionButton.light.base);
			expect(css).toContain(fallback.colors.activeLink.light.base);
		});
	});
});

/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import { SPDS_PREFIX } from '../constants';
import type { ResolvedSpdsBranding, SpdsBrandFamily, SpdsColorScale } from './branding.model';

const SELECTOR = ':root, :host';

const MODES = ['light', 'dark'] as const;

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

const ACTION_BUTTON_COLOR = '--spds-branding-action-button-color';
const ACTION_BUTTON_HOVER_COLOR = '--spds-branding-action-button-hover-color';
const ACTIVE_LINK_COLOR = '--spds-branding-active-link-color';
const ACTIVE_LINK_HOVER_COLOR = '--spds-branding-active-link-hover-color';
const NAVIGATION_COLOR = '--spds-branding-navigation-color';

/**
 * Branded component token list. Each entry redirects one component token to a branding variable.
 * `!important` lets the brand win without editing each component theme rule.
 * Status and severity tokens stay on the base theme.
 */
export const SPDS_BRANDING_OVERRIDES: readonly (readonly [string, string])[] = [
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

/**
 * Derives the SPDS CSS custom property name for a dotted component token.
 * @param tokenName Dotted token name.
 * @returns The matching `--spds-*` custom property name.
 */
function getSpdsCssVariableName(tokenName: string): string {
	return `--${SPDS_PREFIX}-${tokenName.replaceAll('.', '-')}`;
}

/**
 * Builds the direct light and dark stops in mode, family, then stop order.
 * @param resolved Complete brand matrix.
 * @returns Property and value pairs for the 18 direct branding variables.
 */
function getDirectDeclarations(resolved: ResolvedSpdsBranding): Array<readonly [string, string]> {
	const declarations: Array<readonly [string, string]> = [];

	for (const mode of MODES) {
		for (const { family, slug } of FAMILIES) {
			for (const { suffix, stop } of STOPS) {
				declarations.push([`--spds-branding-${mode}-${slug}-${suffix}`, resolved.colors[family][mode][stop]]);
			}
		}
	}

	return declarations;
}

/**
 * Wraps a light and dark value in a CSS `light-dark()` function.
 * @param lightValue Value used in light mode.
 * @param darkValue Value used in dark mode.
 * @returns A `light-dark()` CSS function call.
 */
function lightDark(lightValue: string, darkValue: string): string {
	return `light-dark(${lightValue}, ${darkValue})`;
}

/**
 * Builds the semantic color and hover variables. Hover uses the darker stop in light mode and the lighter stop in
 * dark mode.
 * @returns Property and value pairs for the six semantic branding variables.
 */
function getSemanticDeclarations(): Array<readonly [string, string]> {
	const declarations: Array<readonly [string, string]> = [];

	for (const { slug } of FAMILIES) {
		declarations.push([
			`--spds-branding-${slug}-color`,
			lightDark(`var(--spds-branding-light-${slug}-color)`, `var(--spds-branding-dark-${slug}-color)`)
		]);
		declarations.push([
			`--spds-branding-${slug}-hover-color`,
			lightDark(
				`var(--spds-branding-light-${slug}-darker-color)`,
				`var(--spds-branding-dark-${slug}-lighter-color)`
			)
		]);
	}

	return declarations;
}

/**
 * Renders one minified selector block.
 * @param declarations Property and value pairs, in emit order.
 * @returns A single CSS rule with no extra whitespace.
 */
function renderRule(declarations: ReadonlyArray<readonly [string, string]>): string {
	const body = declarations.map(([property, value]) => `${property}:${value};`).join('');

	return `${SELECTOR}{${body}}`;
}

/**
 * Renders the direct branding stops and the dark-aware semantic variables as one minified rule.
 * @param resolved Complete brand matrix. Color values are written as given.
 * @returns CSS text for the `:root, :host` branding variables.
 */
export function buildSpdsBrandingCss(resolved: ResolvedSpdsBranding): string {
	return renderRule([...getDirectDeclarations(resolved), ...getSemanticDeclarations()]);
}

/**
 * Renders the branded component token list as one minified rule.
 * Each declaration points at a branding variable so a later brand change flows through those variables.
 * @returns CSS text for the `:root, :host` override block.
 */
export function buildSpdsOverrideCss(): string {
	const declarations = SPDS_BRANDING_OVERRIDES.map(([token, brandingVariable]): readonly [string, string] => [
		getSpdsCssVariableName(token),
		`var(${brandingVariable}) !important`
	]);

	return renderRule(declarations);
}

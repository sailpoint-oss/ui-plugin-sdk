/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import { applySpdsBranding } from '../../../src/design-system-theme/branding/apply-branding';
import { resolveSpdsBranding } from '../../../src/design-system-theme/branding/resolve-branding';

const STYLE_ID = 'spds-branding';

describe('applySpdsBranding()', () => {
	beforeEach(() => {
		for (const style of document.head.querySelectorAll('style')) {
			style.remove();
		}
	});

	it('appends one identified style element whose text contains the branding and override rules', () => {
		expect(() => applySpdsBranding()).not.toThrow();

		const styles = [...document.head.querySelectorAll('style')];

		expect(styles).toHaveLength(1);
		expect(styles[0].id).toBe(STYLE_ID);

		const text = styles[0].textContent ?? '';

		expect(text).toContain('--spds-branding-action-button-color');
		expect(text).toContain('--spds-button-primary-background');
		expect(text).toContain('!important');
		expect(text.split(':root, :host')).toHaveLength(3);
		expect(text).toContain('}:root, :host{');
	});

	it('replaces the previous element even when the brand is unchanged', () => {
		applySpdsBranding();
		const first = document.getElementById(STYLE_ID);

		applySpdsBranding();

		const styles = [...document.head.querySelectorAll('style')];

		expect(styles).toHaveLength(1);
		expect(styles[0]).not.toBe(first);
		expect(first?.isConnected).toBe(false);
	});

	it('replaces an existing branding element this call did not create', () => {
		const existing = document.createElement('style');
		existing.id = STYLE_ID;
		existing.textContent = ':root{--stale:1;}';
		document.head.appendChild(existing);

		applySpdsBranding();

		const styles = [...document.head.querySelectorAll('style')];

		expect(styles).toHaveLength(1);
		expect(styles[0]).not.toBe(existing);
		expect(styles[0].textContent).not.toContain('--stale');
	});

	it('lets the first disposer remove only its own element', () => {
		const removeFirst = applySpdsBranding();
		const removeSecond = applySpdsBranding();
		const current = document.getElementById(STYLE_ID);

		removeFirst();

		expect(document.getElementById(STYLE_ID)).toBe(current);

		removeSecond();

		expect(document.getElementById(STYLE_ID)).toBeNull();
	});

	it('removes the element on the first dispose and does nothing on the second', () => {
		const removeStyle = applySpdsBranding();

		expect(() => removeStyle()).not.toThrow();
		expect(document.getElementById(STYLE_ID)).toBeNull();

		expect(() => removeStyle()).not.toThrow();
		expect(document.getElementById(STYLE_ID)).toBeNull();
	});

	it('writes a custom action-button color and leaves the other families on the empty brand', () => {
		const brand = { actionButtonColor: '#112233' };
		const custom = resolveSpdsBranding(brand);
		const defaults = resolveSpdsBranding();

		applySpdsBranding(brand);

		const text = document.getElementById(STYLE_ID)?.textContent ?? '';
		const actionButton = custom.colors.actionButton;

		expect(text).toContain(`--spds-branding-light-action-button-color:${actionButton.light.base};`);
		expect(text).toContain(`--spds-branding-light-action-button-lighter-color:${actionButton.light.lighter};`);
		expect(text).toContain(`--spds-branding-light-action-button-darker-color:${actionButton.light.darker};`);
		expect(text).toContain(`--spds-branding-dark-action-button-color:${actionButton.dark.base};`);
		expect(text).toContain(`--spds-branding-dark-action-button-lighter-color:${actionButton.dark.lighter};`);
		expect(text).toContain(`--spds-branding-dark-action-button-darker-color:${actionButton.dark.darker};`);
		expect(actionButton.light.base).toBe('#112233');

		for (const family of ['activeLink', 'navigation'] as const) {
			for (const mode of ['light', 'dark'] as const) {
				const scale = defaults.colors[family][mode];
				const slug = family === 'activeLink' ? 'active-link' : 'navigation';

				expect(text).toContain(`--spds-branding-${mode}-${slug}-color:${scale.base};`);
				expect(text).toContain(`--spds-branding-${mode}-${slug}-lighter-color:${scale.lighter};`);
				expect(text).toContain(`--spds-branding-${mode}-${slug}-darker-color:${scale.darker};`);
			}
		}
	});

	it('returns a no-op when document.head is missing', () => {
		const head = document.head;
		head.remove();

		try {
			let removeStyle: () => void = () => undefined;

			expect(() => {
				removeStyle = applySpdsBranding();
			}).not.toThrow();
			expect(() => removeStyle()).not.toThrow();
			expect(document.querySelector('style')).toBeNull();
		} finally {
			document.documentElement.appendChild(head);
		}
	});
});

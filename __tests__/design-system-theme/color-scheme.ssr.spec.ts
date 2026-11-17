/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 *
 * @jest-environment node
 */
import { applySpdsColorScheme, listenToColorSchemeChange } from '../../src/design-system-theme/public-api';

describe('SPDS color scheme without a browser', () => {
	it('runs where window is undefined', () => {
		expect(typeof window).toBe('undefined');
	});

	it('does not throw when applying light or dark', () => {
		expect(() => applySpdsColorScheme('dark')).not.toThrow();
		expect(() => applySpdsColorScheme('light')).not.toThrow();
	});

	it('returns a disposer that does not throw', () => {
		const dispose = listenToColorSchemeChange();

		expect(typeof dispose).toBe('function');
		expect(() => dispose()).not.toThrow();
	});
});

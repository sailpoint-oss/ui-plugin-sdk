/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import {
	SPDS_DARK_MODE_CLASS_NAME,
	SPDS_DARK_MODE_SELECTOR,
	SPDS_PREFIX,
	type SpdsColorScheme,
	applySpdsColorScheme,
	listenToColorSchemeChange
} from '../../src/design-system-theme/public-api';

interface MutableMediaQueryList {
	matches: boolean;
	addEventListener: (type: string, listener: EventListener) => void;
	removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * Installs a `matchMedia` fake whose `matches` flag can change and whose `change` listeners can be invoked.
 * @param matches Initial `prefers-color-scheme: dark` match.
 * @returns A helper that updates `matches` and then invokes the stored listeners.
 */
function installMatchMedia(matches: boolean): { setMatchesAndNotify: (matches: boolean) => void } {
	const listeners = new Set<EventListener>();
	const query: MutableMediaQueryList = {
		matches,
		addEventListener: (type, listener) => {
			if (type === 'change') {
				listeners.add(listener);
			}
		},
		removeEventListener: (type, listener) => {
			if (type === 'change') {
				listeners.delete(listener);
			}
		}
	};

	window.matchMedia = ((media: string) => {
		if (media !== '(prefers-color-scheme: dark)') {
			throw new Error(`Unexpected media query: ${media}`);
		}

		return query as unknown as MediaQueryList;
	}) as typeof window.matchMedia;

	return {
		setMatchesAndNotify: (next: boolean) => {
			query.matches = next;
			for (const listener of [...listeners]) {
				listener(new Event('change'));
			}
		}
	};
}

describe('SPDS color scheme', () => {
	beforeEach(() => {
		document.documentElement.className = '';
	});

	afterEach(() => {
		Reflect.deleteProperty(window, 'matchMedia');
	});

	describe('constants', () => {
		it('exports the prefix, class name, and a selector derived from the class name', () => {
			expect(SPDS_PREFIX).toBe('spds');
			expect(SPDS_DARK_MODE_CLASS_NAME).toBe('spds-dark');
			expect(SPDS_DARK_MODE_SELECTOR).toBe(`.${SPDS_DARK_MODE_CLASS_NAME}`);
		});
	});

	describe('applySpdsColorScheme', () => {
		it('adds the dark class for dark and removes it for light', () => {
			applySpdsColorScheme('dark');

			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(true);

			applySpdsColorScheme('light');

			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(false);
		});

		it('leaves unrelated classes in place', () => {
			document.documentElement.className = 'other';

			applySpdsColorScheme('dark');

			expect(document.documentElement.classList.contains('other')).toBe(true);
			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(true);

			applySpdsColorScheme('light');

			expect(document.documentElement.className).toBe('other');
		});

		it('leaves className unchanged when the same value is applied twice', () => {
			document.documentElement.className = 'other';

			applySpdsColorScheme('dark');
			const afterDark = document.documentElement.className;
			applySpdsColorScheme('dark');

			expect(document.documentElement.className).toBe(afterDark);

			applySpdsColorScheme('light');
			const afterLight = document.documentElement.className;
			applySpdsColorScheme('light');

			expect(document.documentElement.className).toBe(afterLight);
			expect(afterLight).toBe('other');
		});

		it('toggles only the dark class when dark and light alternate', () => {
			document.documentElement.className = 'other';

			applySpdsColorScheme('dark');
			expect(document.documentElement.className).toBe(`other ${SPDS_DARK_MODE_CLASS_NAME}`);

			applySpdsColorScheme('light');
			expect(document.documentElement.className).toBe('other');

			applySpdsColorScheme('dark');
			expect(document.documentElement.className).toBe(`other ${SPDS_DARK_MODE_CLASS_NAME}`);
		});

		it('ignores a value other than light or dark', () => {
			document.documentElement.className = 'other';
			const before = document.documentElement.className;

			expect(() => applySpdsColorScheme('auto' as SpdsColorScheme)).not.toThrow();
			expect(document.documentElement.className).toBe(before);
		});

		it('does not read matchMedia', () => {
			const matchMedia = jest.fn();
			window.matchMedia = matchMedia as typeof window.matchMedia;

			applySpdsColorScheme('dark');

			expect(matchMedia).not.toHaveBeenCalled();
			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(true);
		});
	});

	describe('listenToColorSchemeChange', () => {
		it('reports the effective scheme to a caller-owned callback without changing the class', () => {
			const media = installMatchMedia(true);
			const callback = jest.fn();

			listenToColorSchemeChange(callback);

			expect(callback).toHaveBeenCalledWith('dark');
			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(false);

			media.setMatchesAndNotify(false);

			expect(callback).toHaveBeenLastCalledWith('light');
			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(false);
		});

		it('adds the dark class immediately when the query matches', () => {
			installMatchMedia(true);

			listenToColorSchemeChange();

			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(true);
		});

		it('removes a dark class that was already present when the query does not match', () => {
			document.documentElement.classList.add(SPDS_DARK_MODE_CLASS_NAME);
			installMatchMedia(false);

			listenToColorSchemeChange();

			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(false);
		});

		it('flips the class when the query change event fires', () => {
			const media = installMatchMedia(false);

			listenToColorSchemeChange();
			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(false);

			media.setMatchesAndNotify(true);

			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(true);
		});

		it('stops flipping the class after the disposer runs', () => {
			const media = installMatchMedia(false);
			const dispose = listenToColorSchemeChange();

			dispose();
			media.setMatchesAndNotify(true);

			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(false);
		});

		it('does not throw when the disposer runs twice', () => {
			installMatchMedia(true);
			const dispose = listenToColorSchemeChange();

			expect(() => {
				dispose();
				dispose();
			}).not.toThrow();
		});

		it('keeps a second listener after the first disposer runs', () => {
			const media = installMatchMedia(false);
			const disposeFirst = listenToColorSchemeChange();
			listenToColorSchemeChange();

			disposeFirst();
			media.setMatchesAndNotify(true);

			expect(document.documentElement.classList.contains(SPDS_DARK_MODE_CLASS_NAME)).toBe(true);
		});

		it('returns a no-op disposer when matchMedia is missing', () => {
			document.documentElement.className = `other ${SPDS_DARK_MODE_CLASS_NAME}`;
			Reflect.deleteProperty(window, 'matchMedia');

			const dispose = listenToColorSchemeChange();

			expect(typeof dispose).toBe('function');
			expect(document.documentElement.className).toBe(`other ${SPDS_DARK_MODE_CLASS_NAME}`);
			expect(() => dispose()).not.toThrow();
			expect(document.documentElement.className).toBe(`other ${SPDS_DARK_MODE_CLASS_NAME}`);
		});
	});
});

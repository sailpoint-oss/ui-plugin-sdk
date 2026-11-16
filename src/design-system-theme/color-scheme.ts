/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import { SPDS_DARK_MODE_CLASS_NAME } from './constants';

/**
 * `'dark'` adds the dark class. `'light'` removes it.
 */
export type SpdsColorScheme = 'light' | 'dark';

const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Returns true when both `window` and `document` exist.
 */
function hasBrowserGlobals(): boolean {
	return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Adds or removes the dark class on `document.documentElement`. Repeated calls with the same value do not change the
 * class list. Other classes on the element are left in place. Does nothing when `window` or `document` is missing,
 * and does nothing for a value other than `'light'` or `'dark'`. Does not read or write storage.
 *
 * Pass an explicit scheme to force light or dark. To follow `prefers-color-scheme`, call `listenToColorSchemeChange`
 * and do not also call this function. If both run, the later call wins.
 *
 * PrimeNG emits `color-scheme: light` on the light root block and `color-scheme: dark` under the configured dark
 * selector. This function does not write a `color-scheme` rule.
 * @param colorScheme `'dark'` adds the dark class. `'light'` removes it. Any other runtime value is ignored.
 */
export function applySpdsColorScheme(colorScheme: SpdsColorScheme): void {
	if (!hasBrowserGlobals() || document.documentElement == null) {
		return;
	}

	const scheme: string = colorScheme;

	if (scheme === 'dark') {
		document.documentElement.classList.add(SPDS_DARK_MODE_CLASS_NAME);
		return;
	}

	if (scheme === 'light') {
		document.documentElement.classList.remove(SPDS_DARK_MODE_CLASS_NAME);
	}
}

/**
 * Reads `prefers-color-scheme` and reports the effective scheme. Reports the current match immediately, then
 * subscribes to `change`. By default it keeps the SPDS dark class in sync; callers can provide a callback when they
 * own the DOM effects. Returns a function that removes that subscription. Calling the returned function more than
 * once is safe. Each call adds its own listener.
 *
 * Inside an embedded document, the query follows the embedding page's used `color-scheme` in Firefox 105+,
 * Chromium 129+ (Chrome, Edge, Opera, and current Samsung Internet), and Safari 27 and later. Confirm Safari 27 on a
 * shipping build; do not treat the WebKit patch or the Safari 27 release notes as proof that a shipping build updates
 * live. In other browsers, including Safari 26 and earlier, the query follows the operating-system preference.
 *
 * Callers that need the embedding page's scheme in every supported browser should receive that scheme from the
 * embedding page and pass it to `applySpdsColorScheme`.
 *
 * Does nothing and returns a no-op disposer when `window`, `document`, or `matchMedia` is missing. Does not read or
 * write storage.
 * @param onChange Receives the current scheme and later changes. Defaults to applying the SPDS dark class.
 * @returns A function that removes this call's listener. A second call does nothing.
 */
export function listenToColorSchemeChange(
	onChange: (colorScheme: SpdsColorScheme) => void = applySpdsColorScheme
): () => void {
	if (!hasBrowserGlobals() || document.documentElement == null || typeof window.matchMedia !== 'function') {
		return () => undefined;
	}

	const query = window.matchMedia(PREFERS_DARK_QUERY);
	const apply = (): void => {
		onChange(query.matches ? 'dark' : 'light');
	};

	apply();
	query.addEventListener('change', apply);

	return () => {
		query.removeEventListener('change', apply);
	};
}

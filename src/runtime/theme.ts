import type { ApplyThemeOptions, ColorScheme, ThemeContext } from '../public/types';

/**
 * The plugin frame cannot read the host DOM, but Chrome resolves an embedded
 * document's `prefers-color-scheme` from the `color-scheme` the iframe element
 * inherits. App Shell sets `color-scheme` on its root per theme, so this query
 * tracks the ISC theme live, including `change` events.
 */
export const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * SailPoint Design System class that switches its tokens to dark values.
 */
export const DEFAULT_DARK_CLASS = 'spds-dark';

interface ThemeTarget {
	root: HTMLElement;
	darkClass: string;
}

const readDarkSchemeQuery = (): MediaQueryList | null => {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return null;
	}

	return window.matchMedia(DARK_COLOR_SCHEME_QUERY);
};

const resolveThemeTarget = (applyTheme: false | ApplyThemeOptions): ThemeTarget | null => {
	if (applyTheme === false) {
		return null;
	}

	const root = applyTheme.root ?? (typeof document === 'undefined' ? undefined : document.documentElement);
	if (!root) {
		return null;
	}

	return {
		root,
		darkClass: applyTheme.darkClass ?? DEFAULT_DARK_CLASS
	};
};

/**
 * Tracks the host color scheme and mirrors it onto the plugin document.
 *
 * Reading and change notification run whether or not the scheme is applied, so
 * plugins that opt out of `applyTheme` can still style themselves from it.
 */
export class ThemeSync {
	private readonly query: MediaQueryList | null;
	private readonly target: ThemeTarget | null;
	private readonly listeners = new Set<(theme: ThemeContext) => void>();
	private colorScheme: ColorScheme;
	private started = false;
	private changeHandler = (): void => {
		this.sync();
	};

	public constructor(applyTheme: false | ApplyThemeOptions = {}) {
		this.query = readDarkSchemeQuery();
		this.target = resolveThemeTarget(applyTheme);
		this.colorScheme = this.readColorScheme();
	}

	/**
	 * Applies the current scheme and follows changes; repeated calls are no-ops.
	 */
	public start(): void {
		if (this.started) {
			return;
		}

		this.query?.addEventListener('change', this.changeHandler);
		this.started = true;
		this.sync();
	}

	public stop(): void {
		if (!this.started) {
			return;
		}

		this.query?.removeEventListener('change', this.changeHandler);
		this.started = false;
	}

	public getColorScheme(): ColorScheme {
		return this.colorScheme;
	}

	public onChange(listener: (theme: ThemeContext) => void): () => void {
		this.listeners.add(listener);

		return () => {
			this.listeners.delete(listener);
		};
	}

	private readColorScheme(): ColorScheme {
		return this.query?.matches ? 'dark' : 'light';
	}

	/**
	 * Re-reads the query instead of trusting the event payload, and notifies
	 * only when the scheme actually changed.
	 */
	private sync(): void {
		const nextColorScheme = this.readColorScheme();
		const changed = nextColorScheme !== this.colorScheme;
		this.colorScheme = nextColorScheme;
		this.apply();

		if (!changed) {
			return;
		}

		for (const listener of this.listeners) {
			listener({ colorScheme: nextColorScheme });
		}
	}

	private apply(): void {
		if (!this.target) {
			return;
		}

		this.target.root.classList.toggle(this.target.darkClass, this.colorScheme === 'dark');
		/**
		 * A CSSOM write, unlike a `style` attribute, is allowed under a
		 * `style-src` CSP without `'unsafe-inline'`.
		 */
		this.target.root.style.colorScheme = this.colorScheme;
	}
}

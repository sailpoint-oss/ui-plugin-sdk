import { applySpdsBranding, applySpdsColorScheme, listenToColorSchemeChange } from '../design-system-theme/public-api';
import type { SpdsBrandingConfig } from '../design-system-theme/public-api';
import type { ColorScheme, PluginBrand, ThemeContext } from '../public/types';

const isColorScheme = (value: unknown): value is ColorScheme => value === 'light' || value === 'dark';

const toSpdsBrandingConfig = (brand: PluginBrand | undefined): SpdsBrandingConfig | undefined => {
	if (!brand) {
		return undefined;
	}

	return {
		actionButtonColor: brand.actionButtonColor,
		darkActionButtonColor: brand.darkActionButtonColor,
		activeLinkColor: brand.activeLinkColor,
		darkActiveLinkColor: brand.darkActiveLinkColor,
		navigationColor: brand.navigationColor,
		darkNavigationColor: brand.darkNavigationColor
	};
};

/**
 * Coordinates effective appearance state, App Shell authority, and optional SPDS DOM effects for one SDK instance.
 */
export class AppearanceCoordinator {
	private readonly useSpds: boolean;
	private readonly syncColorScheme: boolean;
	private readonly themeCallbacks = new Set<(theme: ThemeContext) => void>();
	private colorScheme: ColorScheme | undefined;
	private fallbackDisposer: (() => void) | undefined;
	private appShellHasAuthority = false;

	public constructor(useSpds = false, syncColorScheme = true) {
		this.useSpds = useSpds;
		this.syncColorScheme = syncColorScheme;
		this.fallbackDisposer = listenToColorSchemeChange(colorScheme => {
			if (!this.appShellHasAuthority) {
				this.applyColorScheme(colorScheme);
			}
		});
	}

	/**
	 * Returns the effective scheme from the parent/OS fallback or App Shell.
	 */
	public getColorScheme(): ColorScheme | undefined {
		return this.colorScheme;
	}

	/**
	 * Applies a valid App Shell scheme and permanently transfers authority from the fallback listener.
	 */
	public applyHostColorScheme(value: unknown): boolean {
		if (!isColorScheme(value)) {
			return false;
		}

		if (!this.appShellHasAuthority) {
			this.disposeFallbackListener();
			this.appShellHasAuthority = true;
		}

		this.applyColorScheme(value);

		return true;
	}

	/**
	 * Applies initialization-only branding, using SPDS defaults when no brand is available.
	 */
	public applyBranding(brand: PluginBrand | undefined): void {
		if (!this.useSpds) {
			return;
		}

		applySpdsBranding(toSpdsBrandingConfig(brand));
	}

	/**
	 * Subscribes to effective scheme changes and returns an idempotent unsubscriber.
	 */
	public onThemeChange(callback: (theme: ThemeContext) => void): () => void {
		this.themeCallbacks.add(callback);
		let subscribed = true;

		return () => {
			if (!subscribed) {
				return;
			}

			subscribed = false;
			this.themeCallbacks.delete(callback);
		};
	}

	private applyColorScheme(colorScheme: ColorScheme): void {
		const changed = this.colorScheme !== colorScheme;
		this.colorScheme = colorScheme;
		if (this.syncColorScheme) {
			this.applyRootColorScheme(colorScheme);
		}

		if (this.useSpds) {
			applySpdsColorScheme(colorScheme);
		}

		if (changed) {
			for (const callback of this.themeCallbacks) {
				callback({ colorScheme });
			}
		}
	}

	private applyRootColorScheme(colorScheme: ColorScheme): void {
		if (typeof document === 'undefined' || document.documentElement == null) {
			return;
		}

		document.documentElement.style.colorScheme = colorScheme;
	}

	private disposeFallbackListener(): void {
		this.fallbackDisposer?.();
		this.fallbackDisposer = undefined;
	}
}

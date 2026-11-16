import { createSDK } from '../src';
import type { PluginBrand } from '../src';
import { AppearanceCoordinator } from '../src/runtime/appearance';
import { projectPluginBrand } from '../src/runtime/plugin-brand';
import { mockSdkContext } from '../src/testing';

describe('plugin brand projection', () => {
	it('keeps only correctly typed public fields', () => {
		const input = {
			actionButtonColor: '#123456',
			darkActionButtonColor: 123,
			productName: 'Acme',
			logoUrl: 'https://cdn.example/light.svg',
			darkLogoUrl: 'https://cdn.example/dark.svg',
			identity: '<style>unsafe</style>',
			unknown: 'ignored'
		};
		const brand = projectPluginBrand(input);

		expect(brand).toEqual({
			actionButtonColor: '#123456',
			productName: 'Acme',
			logoUrl: 'https://cdn.example/light.svg',
			darkLogoUrl: 'https://cdn.example/dark.svg'
		});
		expect(projectPluginBrand(null)).toBeUndefined();
	});
});

describe('AppearanceCoordinator', () => {
	afterEach(() => {
		document.documentElement.classList.remove('spds-dark');
		document.documentElement.style.removeProperty('color-scheme');
		document.getElementById('spds-branding')?.remove();
	});

	it('applies valid host state and suppresses duplicate notifications', () => {
		const coordinator = new AppearanceCoordinator(false);
		const callback = jest.fn();
		const unsubscribe = coordinator.onThemeChange(callback);

		expect(coordinator.applyHostColorScheme('invalid')).toBe(false);
		expect(coordinator.getColorScheme()).toBeUndefined();
		expect(coordinator.applyHostColorScheme('dark')).toBe(true);
		expect(document.documentElement.style.colorScheme).toBe('dark');
		expect(callback).toHaveBeenCalledWith({ colorScheme: 'dark' });

		coordinator.applyHostColorScheme('dark');
		expect(callback).toHaveBeenCalledTimes(1);
		expect(coordinator.applyHostColorScheme({ colorScheme: 'light' })).toBe(false);
		expect(coordinator.getColorScheme()).toBe('dark');
		expect(callback).toHaveBeenCalledTimes(1);

		unsubscribe();
		unsubscribe();
		coordinator.applyHostColorScheme('light');
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe('SDK appearance lifecycle', () => {
	afterEach(() => {
		document.documentElement.classList.remove('spds-dark');
		document.documentElement.style.removeProperty('color-scheme');
		document.getElementById('spds-branding')?.remove();
	});

	it('can preserve the document color-scheme while retaining theme state and SPDS synchronization', async () => {
		document.documentElement.style.colorScheme = 'light';
		const appShell = mockSdkContext({
			osColorScheme: 'dark',
			appShellColorScheme: 'light'
		});
		const sdk = createSDK({
			targetOrigin: appShell.targetOrigin,
			syncColorScheme: false,
			useSpds: true
		});
		const callback = jest.fn();
		sdk.events.onThemeChange(callback);

		try {
			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);

			await sdk.getContext();
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(false);

			appShell.emitThemeChange('dark');
			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);
			expect(callback).toHaveBeenLastCalledWith({ colorScheme: 'dark' });
		} finally {
			appShell.restore();
		}
	});

	it('follows the parent or OS before App Shell takeover and remains host-controlled afterward', async () => {
		const appShell = mockSdkContext({
			osColorScheme: 'dark',
			brand: {
				logoUrl: 'https://cdn.example/light.svg',
				darkLogoUrl: 'https://cdn.example/dark.svg'
			}
		});
		const sdk = createSDK({ targetOrigin: appShell.targetOrigin, useSpds: true });

		try {
			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('dark');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);

			appShell.emitOsColorSchemeChange('light');
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(false);

			const context = await sdk.getContext();
			expect(context.brand).toEqual({
				logoUrl: 'https://cdn.example/light.svg',
				darkLogoUrl: 'https://cdn.example/dark.svg'
			});
			const styleText = document.getElementById('spds-branding')?.textContent ?? '';
			expect(styleText).toContain('--spds-branding-light-action-button-color:#1d5ade;');
			expect(styleText).toContain('--spds-branding-dark-action-button-color:#00aaff;');
			expect(styleText).toContain(
				'--spds-button-primary-background:var(--spds-branding-action-button-color) !important;'
			);
			expect(sdk.theme.getColorScheme()).toBe('light');

			const callback = jest.fn();
			const unsubscribe = sdk.events.onThemeChange(callback);
			appShell.emitThemeChange('dark');

			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('dark');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);
			expect(callback).toHaveBeenCalledWith({ colorScheme: 'dark' });

			appShell.emitThemeChange('dark');
			appShell.emitOsColorSchemeChange('light');
			expect(callback).toHaveBeenCalledTimes(1);
			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);

			unsubscribe();
			appShell.emitThemeChange('light');
			expect(callback).toHaveBeenCalledTimes(1);
		} finally {
			appShell.restore();
		}
	});

	it('syncs host appearance and exposes raw brand context without enabling SPDS effects', async () => {
		document.documentElement.classList.add('spds-dark');
		const appShell = mockSdkContext({
			osColorScheme: 'dark',
			appShellColorScheme: 'light',
			brand: {
				actionButtonColor: '#123456',
				logoUrl: 'light.svg',
				darkLogoUrl: 'dark.svg'
			}
		});
		const sdk = createSDK({ targetOrigin: appShell.targetOrigin });
		const callback = jest.fn();
		sdk.events.onThemeChange(callback);

		try {
			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('dark');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);

			appShell.emitOsColorSchemeChange('light');
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);
			expect(callback).toHaveBeenCalledWith({ colorScheme: 'light' });

			await expect(sdk.getContext()).resolves.toMatchObject({
				brand: {
					actionButtonColor: '#123456',
					logoUrl: 'light.svg',
					darkLogoUrl: 'dark.svg'
				}
			});
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);
			expect(document.getElementById('spds-branding')).toBeNull();

			appShell.emitOsColorSchemeChange('dark');
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);
			expect(callback).toHaveBeenCalledTimes(1);

			appShell.emitThemeChange('dark');

			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('dark');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);
			expect(document.getElementById('spds-branding')).toBeNull();
			expect(callback).toHaveBeenCalledWith({ colorScheme: 'dark' });
		} finally {
			appShell.restore();
		}
	});

	it('consumes appearance through eager initialization without a dependent SDK call', async () => {
		const appShell = mockSdkContext({ appShellColorScheme: 'dark' });
		const sdk = createSDK({ targetOrigin: appShell.targetOrigin });

		try {
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.style.colorScheme).toBe('light');

			for (let index = 0; index < 10 && sdk.theme.getColorScheme() !== 'dark'; index++) {
				await Promise.resolve();
			}

			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('dark');
			expect(
				appShell.messages.some(({ message }) => (message as { type?: string }).type === 'SP_PLUGIN_INIT_RES')
			).toBe(true);
			await expect(sdk.getContext()).resolves.not.toHaveProperty('brand');
		} finally {
			appShell.restore();
		}
	});

	it('applies valid host messages in arrival order when an update precedes initialization', async () => {
		const appShell = mockSdkContext({ appShellColorScheme: 'light' });
		const sdk = createSDK({ targetOrigin: appShell.targetOrigin });
		const callback = jest.fn();
		sdk.events.onThemeChange(callback);

		try {
			appShell.emitThemeChange('dark');
			expect(sdk.theme.getColorScheme()).toBe('dark');

			await sdk.getContext();
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(callback.mock.calls).toEqual([[{ colorScheme: 'dark' }], [{ colorScheme: 'light' }]]);
		} finally {
			appShell.restore();
		}
	});

	it('projects unknown brand fields away and keeps identity values out of generated CSS', async () => {
		const unsafeBrand = {
			actionButtonColor: '#123456',
			productName: '</style><style>unsafe-product</style>',
			logoUrl: 'javascript:unsafe-logo',
			identity: 'unsafe-identity',
			unknownColor: '#abcdef'
		} as PluginBrand;
		const appShell = mockSdkContext({ brand: unsafeBrand });
		const sdk = createSDK({ targetOrigin: appShell.targetOrigin, useSpds: true });

		try {
			const context = await sdk.getContext();
			expect(context.brand).toEqual({
				actionButtonColor: '#123456',
				productName: '</style><style>unsafe-product</style>',
				logoUrl: 'javascript:unsafe-logo'
			});
			expect(context.brand).not.toHaveProperty('identity');
			expect(context.brand).not.toHaveProperty('unknownColor');

			const styleText = document.getElementById('spds-branding')?.textContent ?? '';
			expect(styleText).not.toContain('unsafe-product');
			expect(styleText).not.toContain('unsafe-logo');
			expect(styleText).not.toContain('unsafe-identity');
		} finally {
			appShell.restore();
		}
	});
});

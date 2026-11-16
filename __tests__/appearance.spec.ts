import { createSDK } from '../src';
import { AppearanceCoordinator } from '../src/runtime/appearance';
import { mockSdkContext } from '../src/testing';

describe('AppearanceCoordinator', () => {
	afterEach(() => {
		document.documentElement.classList.remove('spds-dark');
		document.documentElement.style.removeProperty('color-scheme');
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
		const appShell = mockSdkContext({ osColorScheme: 'dark' });
		const sdk = createSDK({ targetOrigin: appShell.targetOrigin, useSpds: true });

		try {
			expect(sdk.theme.getColorScheme()).toBe('dark');
			expect(document.documentElement.style.colorScheme).toBe('dark');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(true);

			appShell.emitOsColorSchemeChange('light');
			expect(sdk.theme.getColorScheme()).toBe('light');
			expect(document.documentElement.style.colorScheme).toBe('light');
			expect(document.documentElement.classList.contains('spds-dark')).toBe(false);

			await sdk.getContext();
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
			await expect(sdk.getContext()).resolves.toMatchObject({ tenant: { id: 'mock-tenant' } });
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
});

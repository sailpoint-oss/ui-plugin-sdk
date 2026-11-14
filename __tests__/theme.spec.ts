import { createSDK } from '../src';
import type { SailPointPluginSDK, SailPointPluginSDKConfig } from '../src';
import type { MessageTarget } from '../src/protocol/types';
import { InternalSailPointPluginSDK } from '../src/runtime/client';

const TRUSTED_ORIGIN = 'https://plugins.sailpoint.test';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Stand-in for the frame's `(prefers-color-scheme: dark)` media query.
 *
 * Unlike a browser, `emit` fires `change` even when `matches` is unchanged, so
 * tests can prove the SDK ignores events that are not a real theme switch.
 */
class FakeMediaQueryList {
	public readonly media = DARK_QUERY;
	public matches: boolean;
	private readonly listeners = new Set<() => void>();

	public constructor(matches: boolean) {
		this.matches = matches;
	}

	public get listenerCount(): number {
		return this.listeners.size;
	}

	public addEventListener(eventName: 'change', listener: () => void): void {
		if (eventName === 'change') {
			this.listeners.add(listener);
		}
	}

	public removeEventListener(eventName: 'change', listener: () => void): void {
		if (eventName === 'change') {
			this.listeners.delete(listener);
		}
	}

	public emit(matches: boolean): void {
		this.matches = matches;
		for (const listener of this.listeners) {
			listener();
		}
	}
}

class FakeTargetWindow implements MessageTarget {
	public readonly sentMessages: Array<{ message: unknown; targetOrigin: string }> = [];

	public postMessage(message: unknown, targetOrigin: string): void {
		this.sentMessages.push({ message, targetOrigin });
	}
}

const NOOP_SOURCE_WINDOW = {
	addEventListener: () => undefined,
	removeEventListener: () => undefined
};

const installMatchMedia = (query: FakeMediaQueryList): jest.Mock => {
	const matchMedia = jest.fn(() => query);
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		writable: true,
		value: matchMedia
	});
	return matchMedia;
};

const createTestSdk = (
	config: SailPointPluginSDKConfig = {}
): { sdk: SailPointPluginSDK; targetWindow: FakeTargetWindow } => {
	const targetWindow = new FakeTargetWindow();
	const sdk = createSDK({
		targetOrigin: TRUSTED_ORIGIN,
		targetWindow,
		sourceWindow: NOOP_SOURCE_WINDOW,
		...config
	});
	return { sdk, targetWindow };
};

const root = document.documentElement;

describe('theme sync', () => {
	afterEach(() => {
		Reflect.deleteProperty(window, 'matchMedia');
		root.className = '';
		root.style.colorScheme = '';
	});

	it('applies the dark theme to the document root in createSDK, before any handshake', () => {
		const matchMedia = installMatchMedia(new FakeMediaQueryList(true));

		const { sdk, targetWindow } = createTestSdk();

		expect(matchMedia).toHaveBeenCalledWith(DARK_QUERY);
		expect(root.classList.contains('spds-dark')).toBe(true);
		expect(root.style.colorScheme).toBe('dark');
		expect(sdk.theme.getColorScheme()).toBe('dark');
		expect(targetWindow.sentMessages).toHaveLength(0);
	});

	it('applies the light theme by removing the dark class', () => {
		installMatchMedia(new FakeMediaQueryList(false));
		root.classList.add('spds-dark', 'plugin-owned');

		const { sdk } = createTestSdk();

		expect(root.classList.contains('spds-dark')).toBe(false);
		expect(root.classList.contains('plugin-owned')).toBe(true);
		expect(root.style.colorScheme).toBe('light');
		expect(sdk.theme.getColorScheme()).toBe('light');
	});

	it('follows live theme switches and notifies onThemeChange subscribers', () => {
		const query = new FakeMediaQueryList(false);
		installMatchMedia(query);
		const { sdk } = createTestSdk();
		const onThemeChange = jest.fn();
		sdk.events.onThemeChange(onThemeChange);

		query.emit(true);

		expect(onThemeChange).toHaveBeenCalledTimes(1);
		expect(onThemeChange).toHaveBeenLastCalledWith({ colorScheme: 'dark' });
		expect(sdk.theme.getColorScheme()).toBe('dark');
		expect(root.classList.contains('spds-dark')).toBe(true);
		expect(root.style.colorScheme).toBe('dark');

		query.emit(false);

		expect(onThemeChange).toHaveBeenCalledTimes(2);
		expect(onThemeChange).toHaveBeenLastCalledWith({ colorScheme: 'light' });
		expect(root.classList.contains('spds-dark')).toBe(false);
		expect(root.style.colorScheme).toBe('light');
	});

	it('does not notify on subscribe or for change events that keep the same scheme', () => {
		const query = new FakeMediaQueryList(true);
		installMatchMedia(query);
		const { sdk } = createTestSdk();
		const onThemeChange = jest.fn();

		sdk.events.onThemeChange(onThemeChange);
		query.emit(true);

		expect(onThemeChange).not.toHaveBeenCalled();
	});

	it('stops notifying a subscriber after it unsubscribes', () => {
		const query = new FakeMediaQueryList(false);
		installMatchMedia(query);
		const { sdk } = createTestSdk();
		const unsubscribed = jest.fn();
		const subscribed = jest.fn();

		const unsubscribe = sdk.events.onThemeChange(unsubscribed);
		sdk.events.onThemeChange(subscribed);
		unsubscribe();
		query.emit(true);

		expect(unsubscribed).not.toHaveBeenCalled();
		expect(subscribed).toHaveBeenCalledWith({ colorScheme: 'dark' });
	});

	it('leaves the document untouched with applyTheme: false but still reports and notifies', () => {
		const query = new FakeMediaQueryList(true);
		installMatchMedia(query);
		const { sdk } = createTestSdk({ applyTheme: false });
		const onThemeChange = jest.fn();
		sdk.events.onThemeChange(onThemeChange);

		expect(root.classList.contains('spds-dark')).toBe(false);
		expect(root.style.colorScheme).toBe('');
		expect(sdk.theme.getColorScheme()).toBe('dark');

		query.emit(false);

		expect(onThemeChange).toHaveBeenCalledWith({ colorScheme: 'light' });
		expect(root.style.colorScheme).toBe('');
	});

	it('applies a custom darkClass to a custom root only', () => {
		const query = new FakeMediaQueryList(true);
		installMatchMedia(query);
		const pluginRoot = document.createElement('div');

		createTestSdk({ applyTheme: { darkClass: 'acme-dark', root: pluginRoot } });

		expect(pluginRoot.classList.contains('acme-dark')).toBe(true);
		expect(pluginRoot.style.colorScheme).toBe('dark');
		expect(root.className).toBe('');
		expect(root.style.colorScheme).toBe('');

		query.emit(false);

		expect(pluginRoot.classList.contains('acme-dark')).toBe(false);
		expect(pluginRoot.style.colorScheme).toBe('light');
	});

	it('defaults to light without throwing when window.matchMedia is unavailable', () => {
		expect('matchMedia' in window).toBe(false);

		const { sdk } = createTestSdk();

		expect(sdk.theme.getColorScheme()).toBe('light');
		expect(root.style.colorScheme).toBe('light');
		expect(root.classList.contains('spds-dark')).toBe(false);
		expect(typeof sdk.events.onThemeChange(jest.fn())).toBe('function');
	});

	it('defaults to light and skips the document outside a browser', () => {
		const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
		const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined
		});
		Object.defineProperty(globalThis, 'document', {
			configurable: true,
			value: undefined
		});

		try {
			const { sdk } = createTestSdk();

			expect(sdk.theme.getColorScheme()).toBe('light');
		} finally {
			if (windowDescriptor) {
				Object.defineProperty(globalThis, 'window', windowDescriptor);
			}
			if (documentDescriptor) {
				Object.defineProperty(globalThis, 'document', documentDescriptor);
			}
		}

		expect(root.style.colorScheme).toBe('');
	});

	it('detaches from the media query on stop and catches up on the next start', () => {
		const query = new FakeMediaQueryList(false);
		installMatchMedia(query);
		const sdk = new InternalSailPointPluginSDK({
			targetOrigin: TRUSTED_ORIGIN,
			targetWindow: new FakeTargetWindow(),
			sourceWindow: NOOP_SOURCE_WINDOW
		});
		const onThemeChange = jest.fn();
		sdk.events.onThemeChange(onThemeChange);
		expect(query.listenerCount).toBe(1);

		sdk.stop();
		sdk.stop();
		expect(query.listenerCount).toBe(0);
		query.matches = true;

		sdk.start();
		sdk.start();

		expect(query.listenerCount).toBe(1);
		expect(sdk.theme.getColorScheme()).toBe('dark');
		expect(onThemeChange).toHaveBeenCalledTimes(1);
		expect(onThemeChange).toHaveBeenCalledWith({ colorScheme: 'dark' });
		expect(root.classList.contains('spds-dark')).toBe(true);
		sdk.stop();
	});
});

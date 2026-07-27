import { createSDK } from '../src';
import { MESSAGE_TYPES } from '../src/protocol/constants';
import type { PluginContext } from '../src/public/types';
import { mockSdkContext } from '../src/testing';

const NOW = 1_717_600_000_000;
const NOW_ISO = new Date(NOW).toISOString();
const CONTEXT: PluginContext = {
	tenant: {
		id: 'tenant-1',
		scriptName: 'acme',
		org: 'acme'
	},
	user: {
		id: 'user-1',
		displayName: 'Test User',
		email: 'test@sailpoint.com'
	},
	page: {
		route: '/plugins/accounts'
	},
	slot: {
		id: 'slot-1'
	}
};

describe('mockSdkContext', () => {
	it('intercepts parent messages and completes the SDK handshake', async () => {
		const appShell = mockSdkContext({
			context: CONTEXT,
			now: () => NOW
		});

		try {
			const sdk = createSDK({
				targetOrigin: appShell.targetOrigin,
				now: () => NOW
			});

			await expect(sdk.getContext()).resolves.toEqual(CONTEXT);
			expect(appShell.messages.map(({ message }) => (message as { type: string }).type)).toEqual([
				MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
				MESSAGE_TYPES.SP_AUTH_TOKEN_DELIVERY_RES,
				MESSAGE_TYPES.SP_PLUGIN_INIT_RES
			]);
			expect(appShell.messages.every(({ targetOrigin }) => targetOrigin === appShell.targetOrigin)).toBe(true);
		} finally {
			appShell.restore();
		}
	});

	it('supports token refreshes and inbound token and viewport events', async () => {
		const appShell = mockSdkContext({
			context: CONTEXT,
			token: 'initial-token',
			now: () => NOW
		});

		try {
			const sdk = createSDK({
				targetOrigin: appShell.targetOrigin,
				now: () => NOW
			});
			await sdk.getContext();

			await expect(sdk.api.getToken(true)).resolves.toBe('initial-token');

			const onTokenUpdate = jest.fn();
			const onViewportChange = jest.fn();
			sdk.events.onTokenUpdate(onTokenUpdate);
			sdk.events.onViewportChange(onViewportChange);

			appShell.emitTokenUpdate('updated-token');
			appShell.emitViewportChange({
				width: 1280,
				height: 720
			});

			expect(onTokenUpdate).toHaveBeenCalledWith('updated-token');
			expect(onViewportChange).toHaveBeenCalledWith({
				width: 1280,
				height: 720
			});
			await expect(sdk.api.getToken()).resolves.toBe('updated-token');
			expect(
				appShell.messages.some(
					({ message }) => (message as { type?: string }).type === MESSAGE_TYPES.SP_GET_CURRENT_TOKEN_REQ
				)
			).toBe(true);
		} finally {
			appShell.restore();
		}
	});

	it('records mismatched target origins without simulating a host response', async () => {
		const appShell = mockSdkContext({
			now: () => NOW
		});

		try {
			window.parent.postMessage(
				{
					type: MESSAGE_TYPES.SP_PLUGIN_READY_REQ,
					requestId: 'wrong-origin',
					protocolVersion: 'v1.0',
					timestamp: NOW_ISO,
					payload: {}
				},
				'https://unexpected.example'
			);
			await Promise.resolve();

			expect(appShell.messages).toEqual([
				{
					message: expect.objectContaining({
						requestId: 'wrong-origin'
					}),
					targetOrigin: 'https://unexpected.example'
				}
			]);
		} finally {
			appShell.restore();
		}
	});

	it('restores the original parent postMessage implementation idempotently', () => {
		const originalPostMessage = window.parent.postMessage;
		const appShell = mockSdkContext();

		expect(window.parent.postMessage).not.toBe(originalPostMessage);

		appShell.restore();
		appShell.restore();

		expect(window.parent.postMessage).toBe(originalPostMessage);
	});
});

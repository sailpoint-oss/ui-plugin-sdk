import type { MessageSource, RequestMessageType, ResponseMessageType, RuntimeMessageEvent } from '../protocol/types';

/**
 * Converts request message names into expected response message names.
 */
export const toResponseType = (requestType: RequestMessageType): ResponseMessageType =>
	requestType.replace(/_REQ$/, '_RES') as ResponseMessageType;

export const defaultSourceWindow = (): MessageSource => {
	if (typeof window === 'undefined') {
		throw new Error('sourceWindow is required when window is unavailable.');
	}

	return window as unknown as MessageSource;
};

/**
 * Creates a compact correlation id for request/response mapping.
 * Example: "lxa9m2f3-k3p8t2qw"
 */
export const createRequestId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const asMessageEvent = (event: RuntimeMessageEvent): RuntimeMessageEvent => ({
	data: event.data,
	origin: event.origin,
	source: event.source
});

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

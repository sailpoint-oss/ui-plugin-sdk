import type { EventMessageType, RequestMessageType, ResponseMessageType } from '../protocol/types';
import type { RuntimeEnvelope, RuntimeErrorCode, RuntimeErrorDetails } from '../protocol/types';

interface ValidationOptions {
	expectedProtocolVersion: string;
	maxClockSkewMs: number;
	now: () => number;
}

interface ValidationSuccess {
	ok: true;
	envelope: RuntimeEnvelope;
}

interface ValidationFailure {
	ok: false;
	error: RuntimeErrorDetails;
	requestId?: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const hasSuffix = (value: string, suffix: string): boolean => value.endsWith(suffix);

const createError = (
	code: RuntimeErrorCode,
	message: string,
	details?: Record<string, unknown>
): RuntimeErrorDetails => ({
	code,
	message,
	details
});

const asRuntimeEnvelope = (value: Record<string, unknown>): RuntimeEnvelope => {
	return value as unknown as RuntimeEnvelope;
};

export const validateOrigin = (origin: string, allowedOrigin: string): RuntimeErrorDetails | null => {
	/**
	 * Allows wildcard only for controlled test/local scenarios.
	 */
	if (allowedOrigin === '*') {
		return null;
	}

	if (origin !== allowedOrigin) {
		return createError('INVALID_ORIGIN', 'Message origin does not match the trusted origin.', {
			origin,
			allowedOrigin
		});
	}

	return null;
};

export const validateEnvelope = (rawEnvelope: unknown, options: ValidationOptions): ValidationResult => {
	/**
	 * Validates raw inbound message data in strict order:
	 * 1) envelope shape, 2) routing metadata, 3) temporal checks, 4) payload/request correlation.
	 * This keeps runtime routing deterministic and returns protocol-friendly errors early.
	 */
	if (!isRecord(rawEnvelope)) {
		return {
			ok: false,
			error: createError('INVALID_ENVELOPE', 'Envelope must be an object.')
		};
	}

	const type = rawEnvelope.type;
	/**
	 * `type` drives message routing (_REQ / _RES / _EVT), so validate it first.
	 */
	if (typeof type !== 'string') {
		return {
			ok: false,
			error: createError('INVALID_ENVELOPE', 'Envelope type is required and must be a string.'),
			requestId: typeof rawEnvelope.requestId === 'string' ? rawEnvelope.requestId : undefined
		};
	}

	const protocolVersion = rawEnvelope.protocolVersion;
	/**
	 * Protocol version must be present and exactly match runtime expectations.
	 */
	if (typeof protocolVersion !== 'string') {
		return {
			ok: false,
			error: createError('INVALID_PROTOCOL_VERSION', 'Envelope protocolVersion must be a string.'),
			requestId: typeof rawEnvelope.requestId === 'string' ? rawEnvelope.requestId : undefined
		};
	}

	if (protocolVersion !== options.expectedProtocolVersion) {
		return {
			ok: false,
			error: createError('INVALID_PROTOCOL_VERSION', 'Unsupported protocol version.', {
				received: protocolVersion,
				expected: options.expectedProtocolVersion
			}),
			requestId: typeof rawEnvelope.requestId === 'string' ? rawEnvelope.requestId : undefined
		};
	}

	const timestamp = rawEnvelope.timestamp;
	/**
	 * Timestamp guards against stale/future envelopes outside the allowed skew window.
	 */
	if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
		return {
			ok: false,
			error: createError('INVALID_TIMESTAMP', 'Envelope timestamp must be a finite number.'),
			requestId: typeof rawEnvelope.requestId === 'string' ? rawEnvelope.requestId : undefined
		};
	}

	const now = options.now();
	if (Math.abs(now - timestamp) > options.maxClockSkewMs) {
		return {
			ok: false,
			error: createError('INVALID_TIMESTAMP', 'Envelope timestamp is outside the allowed skew.', {
				timestamp,
				now,
				maxClockSkewMs: options.maxClockSkewMs
			}),
			requestId: typeof rawEnvelope.requestId === 'string' ? rawEnvelope.requestId : undefined
		};
	}

	if (!Object.prototype.hasOwnProperty.call(rawEnvelope, 'payload')) {
		/**
		 * Payload is required even when empty object is intentional.
		 */
		return {
			ok: false,
			error: createError('INVALID_ENVELOPE', 'Envelope payload is required.'),
			requestId: typeof rawEnvelope.requestId === 'string' ? rawEnvelope.requestId : undefined
		};
	}

	if (hasSuffix(type, '_REQ') || hasSuffix(type, '_RES')) {
		/**
		 * Correlation is mandatory for request/response pairs.
		 */
		if (typeof rawEnvelope.requestId !== 'string' || rawEnvelope.requestId.length === 0) {
			return {
				ok: false,
				error: createError(
					'INVALID_REQUEST_ID',
					'Envelope requestId is required for request/response messages.'
				)
			};
		}
	}

	if (!hasSuffix(type, '_REQ') && !hasSuffix(type, '_RES') && !hasSuffix(type, '_EVT')) {
		/**
		 * Unknown suffixes are rejected before routing to request/response/event handlers.
		 */
		return {
			ok: false,
			error: createError('UNSUPPORTED_MESSAGE_TYPE', 'Message type must end with _REQ, _RES, or _EVT.'),
			requestId: typeof rawEnvelope.requestId === 'string' ? rawEnvelope.requestId : undefined
		};
	}

	return {
		/**
		 * Safe to cast: all required envelope invariants were validated above.
		 */
		ok: true,
		envelope: asRuntimeEnvelope(rawEnvelope)
	};
};

export const isRequestType = (type: string): type is RequestMessageType => hasSuffix(type, '_REQ');

export const isResponseType = (type: string): type is ResponseMessageType => hasSuffix(type, '_RES');

export const isEventType = (type: string): type is EventMessageType => hasSuffix(type, '_EVT');

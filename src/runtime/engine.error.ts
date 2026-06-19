import type { RuntimeErrorDetails } from '../protocol/types';

export class RuntimeEngineError extends Error {
	public readonly details: RuntimeErrorDetails;

	public constructor(details: RuntimeErrorDetails) {
		super(details.message);
		this.name = 'RuntimeEngineError';
		this.details = details;
	}
}

export const normalizeRuntimeError = (error: unknown): RuntimeErrorDetails => {
	if (error instanceof RuntimeEngineError) {
		return error.details;
	}

	if (error instanceof Error) {
		return {
			code: 'HANDSHAKE_FAILED',
			message: error.message
		};
	}

	return {
		code: 'HANDSHAKE_FAILED',
		message: 'Unknown runtime engine error.'
	};
};

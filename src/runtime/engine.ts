import {
	COIP_PROTOCOL_VERSION,
	DEFAULT_MAX_CLOCK_SKEW_MS,
	DEFAULT_REQUEST_TIMEOUT_MS,
	MESSAGE_TYPES
} from '../protocol/constants';
import type {
	ErrorResponsePayload,
	EventMessageType,
	MessageSource,
	MessageTarget,
	RequestMessageType,
	ResponseMessageType,
	RuntimeEventEnvelope,
	RuntimeRequestEnvelope,
	RuntimeResponseEnvelope
} from '../protocol/types';
import type { RuntimeErrorDetails } from '../protocol/types';
import type { RuntimeMessageEvent } from '../protocol/types';
import { RuntimeEngineError, normalizeRuntimeError } from './engine.error';
import type {
	PendingRequest,
	PendingRequestWaiter,
	RuntimeEngineConfig,
	RuntimeRequestHandler,
	SendRequestOptions,
	WaitForRequestOptions
} from './engine.types';
import { asMessageEvent, createRequestId, defaultSourceWindow, toResponseType } from './engine.utils';
import { isEventType, isRequestType, isResponseType, validateEnvelope, validateOrigin } from './validator';

/**
 * Low-level COIP transport runtime.
 * Owns listener lifecycle, request correlation, and event fan-out.
 */
export class RuntimeEngine {
	private readonly targetWindow: MessageTarget;
	private readonly targetOrigin: string;
	private readonly sourceWindow: MessageSource;
	private readonly protocolVersion: string;
	private readonly requestTimeoutMs: number;
	private readonly maxClockSkewMs: number;
	private readonly now: () => number;

	private readonly pendingRequests = new Map<string, PendingRequest>();
	private readonly requestWaiters = new Map<RequestMessageType, PendingRequestWaiter[]>();
	private readonly requestHandlers = new Map<RequestMessageType, RuntimeRequestHandler>();
	private readonly eventSubscribers = new Map<EventMessageType, Set<(event: RuntimeEventEnvelope) => void>>();

	private started = false;
	private messageHandler = (event: RuntimeMessageEvent): void => {
		this.handleIncomingMessage(asMessageEvent(event));
	};

	public constructor(config: RuntimeEngineConfig) {
		this.targetWindow = config.targetWindow;
		this.targetOrigin = config.targetOrigin;
		this.sourceWindow = config.sourceWindow ?? defaultSourceWindow();
		this.protocolVersion = config.protocolVersion ?? COIP_PROTOCOL_VERSION;
		this.requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
		this.maxClockSkewMs = config.maxClockSkewMs ?? DEFAULT_MAX_CLOCK_SKEW_MS;
		this.now = config.now ?? (() => Date.now());
	}

	/**
	 * Attaches the message listener once; repeated calls are no-ops.
	 */
	public start(): void {
		if (this.started) {
			return;
		}

		this.sourceWindow.addEventListener('message', this.messageHandler);
		this.started = true;
	}

	/**
	 * Detaches listeners and rejects all in-flight request promises.
	 */
	public stop(): void {
		if (!this.started) {
			return;
		}

		this.sourceWindow.removeEventListener('message', this.messageHandler);
		this.started = false;

		for (const [requestId, pendingRequest] of this.pendingRequests.entries()) {
			clearTimeout(pendingRequest.timeoutHandle);
			pendingRequest.reject(
				new RuntimeEngineError({
					code: 'HANDSHAKE_FAILED',
					message: `Runtime engine stopped before request ${requestId} completed.`
				})
			);
		}
		this.pendingRequests.clear();

		for (const [, waiters] of this.requestWaiters.entries()) {
			for (const waiter of waiters) {
				clearTimeout(waiter.timeoutHandle);
				waiter.reject(
					new RuntimeEngineError({
						code: 'HANDSHAKE_FAILED',
						message: 'Runtime engine stopped before request waiter completed.'
					})
				);
			}
		}
		this.requestWaiters.clear();
	}

	/**
	 * Sends a typed request envelope and resolves when matching response arrives.
	 */
	public sendRequest<TRequestPayload = unknown, TResponsePayload = unknown>(
		type: RequestMessageType,
		payload: TRequestPayload,
		options?: SendRequestOptions
	): Promise<TResponsePayload> {
		const requestId = createRequestId();
		const timeoutMs = options?.timeoutMs ?? this.requestTimeoutMs;
		const expectedResponseType = toResponseType(type);

		const envelope: RuntimeRequestEnvelope = {
			type,
			requestId,
			protocolVersion: this.protocolVersion,
			timestamp: new Date(this.now()).toISOString(),
			payload
		};

		return new Promise<TResponsePayload>((resolve, reject) => {
			/**
			 * Per-request timeout ensures unresolved requests fail deterministically.
			 */
			const timeoutHandle = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(
					new RuntimeEngineError({
						code: 'REQUEST_TIMEOUT',
						message: `Request ${requestId} timed out waiting for ${expectedResponseType}.`,
						details: {
							requestId,
							expectedResponseType
						}
					})
				);
			}, timeoutMs);

			this.pendingRequests.set(requestId, {
				expectedResponseType,
				resolve: value => {
					resolve(value as TResponsePayload);
				},
				reject,
				timeoutHandle
			});

			this.postEnvelope(envelope);
		});
	}

	/**
	 * Emits a typed response envelope for a known requestId.
	 */
	public respond<TPayload = unknown>(responseType: ResponseMessageType, requestId: string, payload: TPayload): void {
		const envelope: RuntimeResponseEnvelope = {
			type: responseType,
			requestId,
			protocolVersion: this.protocolVersion,
			timestamp: new Date(this.now()).toISOString(),
			payload
		};

		this.postEnvelope(envelope);
	}

	/**
	 * Emits an unsolicited event envelope to plugin listeners.
	 */
	public emitEvent<TPayload = unknown>(eventType: EventMessageType, payload: TPayload): void {
		const envelope: RuntimeEventEnvelope = {
			type: eventType,
			protocolVersion: this.protocolVersion,
			timestamp: new Date(this.now()).toISOString(),
			payload
		};

		this.postEnvelope(envelope);
	}

	/**
	 * Registers a request handler and returns an unsubscribe function.
	 */
	public onRequest(
		requestType: RequestMessageType,
		handler: (request: RuntimeRequestEnvelope) => Promise<unknown> | unknown
	): () => void {
		this.requestHandlers.set(requestType, handler);

		return () => {
			this.requestHandlers.delete(requestType);
		};
	}

	/**
	 * Waits for the next inbound request of a specific type.
	 */
	public waitForRequest(
		requestType: RequestMessageType,
		options?: WaitForRequestOptions
	): Promise<RuntimeRequestEnvelope> {
		const timeoutMs = options?.timeoutMs ?? this.requestTimeoutMs;

		return new Promise<RuntimeRequestEnvelope>((resolve, reject) => {
			/**
			 * Handshake waits on specific inbound requests (for example READY).
			 */
			const timeoutHandle = setTimeout(() => {
				const waiters = this.requestWaiters.get(requestType);
				if (!waiters) {
					return;
				}

				this.requestWaiters.set(
					requestType,
					waiters.filter(waiter => waiter.timeoutHandle !== timeoutHandle)
				);
				reject(
					new RuntimeEngineError({
						code: 'REQUEST_TIMEOUT',
						message: `Timed out waiting for ${requestType}.`
					})
				);
			}, timeoutMs);

			const existingWaiters = this.requestWaiters.get(requestType) ?? [];
			existingWaiters.push({
				resolve,
				reject,
				timeoutHandle
			});
			this.requestWaiters.set(requestType, existingWaiters);
		});
	}

	/**
	 * Registers an event subscriber and returns an unsubscribe function.
	 */
	public onEvent(eventType: EventMessageType, handler: (event: RuntimeEventEnvelope) => void): () => void {
		const subscribers = this.eventSubscribers.get(eventType) ?? new Set();
		subscribers.add(handler);
		this.eventSubscribers.set(eventType, subscribers);

		return () => {
			const currentSubscribers = this.eventSubscribers.get(eventType);
			if (!currentSubscribers) {
				return;
			}

			currentSubscribers.delete(handler);
			if (currentSubscribers.size === 0) {
				this.eventSubscribers.delete(eventType);
			}
		};
	}

	/**
	 * Centralizes outbound postMessage calls with the trusted target origin.
	 */
	private postEnvelope(envelope: RuntimeRequestEnvelope | RuntimeResponseEnvelope | RuntimeEventEnvelope): void {
		this.targetWindow.postMessage(envelope, this.targetOrigin);
	}

	private handleIncomingMessage(event: RuntimeMessageEvent): void {
		/**
		 * Security gate: reject events that do not come from the trusted origin.
		 */
		const originError = validateOrigin(event.origin, this.targetOrigin);
		if (originError) {
			this.sendError(originError, this.tryExtractRequestId(event.data));
			return;
		}

		const envelopeValidation = validateEnvelope(event.data, {
			expectedProtocolVersion: this.protocolVersion,
			maxClockSkewMs: this.maxClockSkewMs,
			now: this.now
		});

		if (!envelopeValidation.ok) {
			this.sendError(envelopeValidation.error, envelopeValidation.requestId);
			return;
		}

		const envelope = envelopeValidation.envelope;
		/**
		 * Route message by suffix after envelope validation succeeds.
		 */
		if (isRequestType(envelope.type)) {
			void this.handleRequest(envelope as RuntimeRequestEnvelope);
			return;
		}

		if (isResponseType(envelope.type)) {
			this.handleResponse(envelope as RuntimeResponseEnvelope);
			return;
		}

		if (isEventType(envelope.type)) {
			this.handleEvent(envelope as RuntimeEventEnvelope);
			return;
		}

		this.sendError(
			{
				code: 'UNSUPPORTED_MESSAGE_TYPE',
				message: `Unsupported message type: ${String(envelope.type)}`
			},
			this.tryExtractRequestId(envelope)
		);
	}

	private async handleRequest(requestEnvelope: RuntimeRequestEnvelope): Promise<void> {
		const requestType = requestEnvelope.type;
		const waiters = this.requestWaiters.get(requestType);
		if (waiters && waiters.length > 0) {
			/**
			 * Give priority to explicit waiters (used by handshake orchestration).
			 */
			const [waiter, ...remainingWaiters] = waiters;
			clearTimeout(waiter.timeoutHandle);
			waiter.resolve(requestEnvelope);

			if (remainingWaiters.length === 0) {
				this.requestWaiters.delete(requestType);
			} else {
				this.requestWaiters.set(requestType, remainingWaiters);
			}
			return;
		}

		const requestHandler = this.requestHandlers.get(requestType);
		if (!requestHandler) {
			/**
			 * Unsolicited requests without handlers are treated as invalid sequence.
			 */
			this.sendError(
				{
					code: 'INVALID_SEQUENCE',
					message: `No handler registered for ${requestType}.`
				},
				requestEnvelope.requestId
			);
			return;
		}

		try {
			const payload = await requestHandler(requestEnvelope);
			this.respond(toResponseType(requestType), requestEnvelope.requestId, payload);
		} catch (error: unknown) {
			this.sendError(normalizeRuntimeError(error), requestEnvelope.requestId);
		}
	}

	/**
	 * Resolves/rejects pending request promises based on inbound response envelopes.
	 */
	private handleResponse(responseEnvelope: RuntimeResponseEnvelope): void {
		const errorPayload =
			responseEnvelope.type === MESSAGE_TYPES.SP_ERROR_RES
				? (responseEnvelope.payload as ErrorResponsePayload)
				: undefined;
		const correlatedRequestId =
			errorPayload && typeof errorPayload.requestId === 'string'
				? errorPayload.requestId
				: responseEnvelope.requestId;
		const pendingRequest = this.pendingRequests.get(correlatedRequestId);
		if (!pendingRequest) {
			if (responseEnvelope.type !== MESSAGE_TYPES.SP_ERROR_RES) {
				this.sendError(
					{
						code: 'INVALID_SEQUENCE',
						message: `Received response ${responseEnvelope.type} without a matching request.`,
						details: {
							requestId: responseEnvelope.requestId
						}
					},
					responseEnvelope.requestId
				);
			}
			return;
		}

		clearTimeout(pendingRequest.timeoutHandle);
		this.pendingRequests.delete(correlatedRequestId);

		if (responseEnvelope.type === MESSAGE_TYPES.SP_ERROR_RES) {
			/**
			 * Host can explicitly fail a pending request through SP_ERROR_RES.
			 */
			const hostErrorCode = errorPayload?.type;
			const errorDetails =
				errorPayload?.error ??
				(typeof hostErrorCode === 'string'
					? {
							code: 'HANDSHAKE_FAILED' as const,
							message: errorPayload?.message ?? `App Shell rejected request with ${hostErrorCode}.`,
							details: {
								hostErrorCode
							}
						}
					: {
							code: 'HANDSHAKE_FAILED' as const,
							message: 'Received SP_ERROR_RES without an error payload.'
						});
			pendingRequest.reject(new RuntimeEngineError(errorDetails));
			return;
		}

		if (responseEnvelope.type !== pendingRequest.expectedResponseType) {
			pendingRequest.reject(
				new RuntimeEngineError({
					code: 'INVALID_SEQUENCE',
					message: `Expected ${pendingRequest.expectedResponseType} but received ${responseEnvelope.type}.`,
					details: {
						requestId: responseEnvelope.requestId
					}
				})
			);
			this.sendError(
				{
					code: 'INVALID_SEQUENCE',
					message: `Unexpected response type ${responseEnvelope.type}.`,
					details: {
						expectedType: pendingRequest.expectedResponseType,
						receivedType: responseEnvelope.type
					}
				},
				responseEnvelope.requestId
			);
			return;
		}

		pendingRequest.resolve(responseEnvelope.payload);
	}

	/**
	 * Broadcasts inbound events to all registered subscribers for the event type.
	 */
	private handleEvent(eventEnvelope: RuntimeEventEnvelope): void {
		const subscribers = this.eventSubscribers.get(eventEnvelope.type);
		if (!subscribers || subscribers.size === 0) {
			return;
		}

		for (const subscriber of subscribers) {
			subscriber(eventEnvelope);
		}
	}

	/**
	 * Emits normalized SP_ERROR_RES envelopes for protocol/runtime failures.
	 */
	private sendError(errorDetails: RuntimeErrorDetails, requestId?: string): void {
		const envelope: RuntimeResponseEnvelope<typeof MESSAGE_TYPES.SP_ERROR_RES, ErrorResponsePayload> = {
			type: MESSAGE_TYPES.SP_ERROR_RES,
			requestId: requestId ?? createRequestId(),
			protocolVersion: this.protocolVersion,
			timestamp: new Date(this.now()).toISOString(),
			payload: {
				error: errorDetails
			}
		};

		this.postEnvelope(envelope);
	}

	/**
	 * Best-effort requestId extraction for malformed payload error responses.
	 */
	private tryExtractRequestId(value: unknown): string | undefined {
		if (typeof value !== 'object' || value === null) {
			return undefined;
		}

		const maybeRequestId = (value as { requestId?: unknown }).requestId;
		return typeof maybeRequestId === 'string' && maybeRequestId.length > 0 ? maybeRequestId : undefined;
	}
}

export { RuntimeEngineError } from './engine.error';
export type { RuntimeEngineConfig };

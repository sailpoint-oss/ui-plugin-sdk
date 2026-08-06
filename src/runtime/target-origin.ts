const PARENT_ORIGIN_PARAM = 'parentOrigin';
const BASE64_PREFIX = 'b64-';

const invalidOriginError = (source: string): Error =>
	new Error(`Unable to resolve App Shell origin: ${source} must contain a valid HTTP(S) URL.`);

const toHttpOrigin = (value: string, source: string): string => {
	try {
		const url = new URL(value);
		if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin === 'null') {
			throw invalidOriginError(source);
		}

		return url.origin;
	} catch (error: unknown) {
		if (error instanceof Error && error.message.startsWith('Unable to resolve App Shell origin:')) {
			throw error;
		}

		throw invalidOriginError(source);
	}
};

const readQueryOrigin = (): string | null => {
	const encodedOrigin = new URLSearchParams(window.location.search).get(PARENT_ORIGIN_PARAM);
	if (!encodedOrigin) {
		return null;
	}

	if (!encodedOrigin.startsWith(BASE64_PREFIX)) {
		return toHttpOrigin(encodedOrigin, `the "${PARENT_ORIGIN_PARAM}" query parameter`);
	}

	try {
		return toHttpOrigin(
			atob(encodedOrigin.slice(BASE64_PREFIX.length)),
			`the "${PARENT_ORIGIN_PARAM}" query parameter`
		);
	} catch {
		throw invalidOriginError(`the "${PARENT_ORIGIN_PARAM}" query parameter`);
	}
};

const readAncestorOrigin = (): string | null => {
	const ancestorOrigins = window.location.ancestorOrigins;
	if (!ancestorOrigins || ancestorOrigins.length === 0) {
		return null;
	}

	return toHttpOrigin(ancestorOrigins[0], 'window.location.ancestorOrigins[0]');
};

export const resolveTargetOrigin = (explicitTargetOrigin?: string): string => {
	if (explicitTargetOrigin !== undefined) {
		return explicitTargetOrigin;
	}

	if (typeof window === 'undefined' || typeof document === 'undefined') {
		throw new Error('Unable to resolve App Shell origin outside a browser. Pass config.targetOrigin explicitly.');
	}

	const queryOrigin = readQueryOrigin();
	const ancestorOrigin = readAncestorOrigin();

	if (queryOrigin && ancestorOrigin && queryOrigin !== ancestorOrigin) {
		throw new Error(
			'Unable to resolve App Shell origin: the "parentOrigin" query parameter does not match the browser ancestor origin.'
		);
	}

	if (ancestorOrigin) {
		return ancestorOrigin;
	}

	if (queryOrigin) {
		return queryOrigin;
	}

	if (document.referrer) {
		return toHttpOrigin(document.referrer, 'document.referrer');
	}

	throw new Error(
		'Unable to resolve App Shell origin. Open the plugin inside ISC via ?spPluginDev=<alias> or pass config.targetOrigin explicitly.'
	);
};

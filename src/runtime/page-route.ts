/**
 * Path segment App Shell mounts full-page plugins under:
 * `/{appShellPath}/plugin/{alias-or-pluginId}/{subPath}`.
 */
const PLUGIN_ROUTE_SEGMENT = 'plugin';

/**
 * Derives the plugin-relative route from the host `window.location.href`.
 *
 * Anchors on the first `plugin` path segment, as App Shell's own route parser
 * does; the segment after it is the route key (alias, or the plugin instance id
 * before the host canonicalizes it). `pluginConfiguration.pluginId` is not used
 * as a cross-check because the host rewrites id-shaped routes to the alias, so
 * the two routinely differ.
 *
 * Returns path segments only, still percent-encoded, so the value can be passed
 * back to `navigation.setRoute` unchanged. Query and hash are excluded: the host
 * mixes its own reserved parameters into the search string. Malformed and
 * plugin-less routes yield `''` rather than throwing.
 */
export const extractSubPath = (route: string): string => {
	let pathname: string;
	try {
		pathname = new URL(route).pathname;
	} catch {
		return '';
	}

	const segments = pathname.split('/').filter(Boolean);
	const pluginIndex = segments.indexOf(PLUGIN_ROUTE_SEGMENT);
	if (pluginIndex === -1) {
		return '';
	}

	return segments.slice(pluginIndex + 2).join('/');
};

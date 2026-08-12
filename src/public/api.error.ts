/**
 * Represents a non-OK HTTP response returned by `api.get` or `api.post`.
 *
 * The `body` property contains untrusted API data as parsed JSON, raw text, or
 * `null` when the response body is empty or unreadable. Validate it before
 * rendering, logging, or otherwise using its contents.
 */
export class ApiError extends Error {
	public readonly status: number;
	public readonly statusText: string;
	public readonly path: string;
	public readonly body: unknown;

	public constructor({
		status,
		statusText,
		path,
		body
	}: {
		status: number;
		statusText: string;
		path: string;
		body: unknown;
	}) {
		const statusDescription = statusText.trim();
		super(`API request failed with status ${status}${statusDescription ? ` ${statusDescription}` : ''}.`);
		this.name = 'ApiError';
		this.status = status;
		this.statusText = statusText;
		this.path = path;
		this.body = body;
	}
}

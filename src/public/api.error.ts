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

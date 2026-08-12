---
'@sailpoint/ui-plugin-sdk': minor
---

Add a public `ApiError` for non-OK `api.get` and `api.post` responses.

The error exposes the HTTP status, status text, request path, and parsed JSON or
raw-text response body. Empty or unreadable bodies are reported as `null`.
HTTP-status failures no longer reuse the runtime protocol's `INVALID_SEQUENCE`
error, while the existing one-time 401 token-refresh retry remains unchanged.

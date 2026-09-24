# @sailpoint/ui-plugin-sdk

Browser runtime library for SailPoint ISC UI plugins — COIP/iframe handshake and plugin integration.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) 10 (`corepack enable`)

### Setup

```bash
pnpm install
```

### Usage

When the plugin is mounted inside ISC, the SDK resolves the App Shell origin from
the iframe context:

```typescript
import { createSDK } from '@sailpoint/ui-plugin-sdk';

const sdk = createSDK();
const context = await sdk.getContext();
```

The SDK reconciles the App Shell-provided `parentOrigin` query parameter with
the browser ancestor origin when available, then falls back to the document
referrer. It throws if no trusted origin can be resolved or if the query and
browser ancestor origins disagree.

This resolution is defense-in-depth for consistent postMessage targeting and
inbound origin validation. A plugin's `frame-ancestors` CSP remains the primary
control that prevents untrusted pages from embedding it.

Pass `targetOrigin` explicitly for tests, mocks, or non-standard embeddings:

```typescript
const sdk = createSDK({ targetOrigin: 'https://app-shell.example.com' });
```

### Handling API Errors

Non-OK responses from `api.get` and `api.post` throw `ApiError`, which exposes the
HTTP status, status text, request path, and response body. JSON bodies are parsed;
non-JSON bodies remain strings, and empty or unreadable bodies are `null`.

```typescript
import { ApiError, createSDK } from '@sailpoint/ui-plugin-sdk';

const sdk = createSDK();

try {
	await sdk.api.get('/v3/accounts/missing');
} catch (error) {
	if (error instanceof ApiError) {
		handleRequestFailure(error.status, error.body);
	} else {
		throw error;
	}
}
```

Treat `body` as untrusted API data and avoid logging it without reviewing it for
sensitive content.

### Syncing Routes with App Shell

Full-page plugins with internal routing can report their current route so the
App Shell URL reflects it. Deep links, reloads, and shared URLs then land on the
same plugin sub-page. Call `navigation.setRoute` whenever the plugin's router
navigates:

```typescript
import { createSDK } from '@sailpoint/ui-plugin-sdk';

const sdk = createSDK();

router.afterEach(to => {
	void sdk.navigation.setRoute(to.fullPath);
});
```

- `subPath` is relative to `/plugin/{alias}/`. One leading `/` is stripped, so
  router paths such as `location.pathname` work as-is. `''` or `'/'` is the
  plugin home.
- Query and hash in `subPath` replace the plugin's previous ones. App Shell
  preserves its own host-owned query parameters.
- App Shell updates its URL with `history.replaceState`, so no browser history
  entry is added.
- The promise resolves once the event is sent. It waits for the SDK handshake
  and rejects if the handshake fails, or with `TypeError` if `subPath` is not a
  string.
- App Shell validates the path and **silently ignores** values it rejects:
  longer than 2048 characters, containing `..`, `%2e%2e`, `//`, `\`, or a scheme
  prefix, or resolving outside the plugin route. No error is sent back.
- Only full-page plugin mounts apply route changes. Slot mounts ignore them.

This replaces hand-written
`window.parent.postMessage({ type: 'SP_ROUTE_CHANGE_EVT', ... })` calls.

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run lint` | Run ESLint |
| `pnpm run lint:fix` | Run ESLint with auto-fix |
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Check formatting without writing |
| `pnpm run test` | Run Jest tests |
| `pnpm run typecheck` | TypeScript type checking (no emit) |

## Testing Plugins Offline

The `@sailpoint/ui-plugin-sdk/testing` subpath provides a framework-agnostic
mock App Shell for browser-like unit-test environments. Install the mock before
calling an SDK method that starts the handshake, then restore it after the test.

`context` is optional — the default models a valid least-privileged user, so pass
it only when the test depends on specific tenant or capability values.

```typescript
import { createSDK } from '@sailpoint/ui-plugin-sdk';
import type { UserCapabilities } from '@sailpoint/ui-plugin-sdk';
import { mockSdkContext } from '@sailpoint/ui-plugin-sdk/testing';

/**
 * Capability flags are exhaustive: App Shell always sends every key, so a mock
 * context must too. Start from all-false and enable what the test needs.
 */
const capabilities: UserCapabilities = {
	isOrgAdmin: true,
	isHelpdesk: false,
	isDashboard: false,
	isCertAdmin: false,
	isReportAdmin: false,
	isSourceAdmin: false,
	isSourceSubadmin: false,
	isRoleAdmin: false,
	isRoleSubadmin: false,
	isCloudGovAdmin: false,
	isCloudGovUser: false,
	isSaasManagementAdmin: false,
	isSaasManagementReader: false
};

const appShell = mockSdkContext({
	context: {
		tenant: {
			id: 'tenant-1',
			scriptName: 'acme',
			org: 'acme',
			name: 'Acme',
			pod: 'useast1',
			region: 'us-east-1',
			apiUrl: { idn: 'https://acme.api.identitynow.com' },
			products: []
		},
		user: { id: 'user-1', displayName: 'Test User', email: 'test@example.com', capabilities },
		page: { route: 'https://acme.identitynow.com/plugins/example' },
		slot: { id: 'slot-1' },
		pluginConfiguration: { pluginId: 'plugin-1' }
	}
});
const sdk = createSDK({ targetOrigin: appShell.targetOrigin });

expect(await sdk.getContext()).toEqual(appShell.context);

const onViewportChange = jest.fn();
sdk.events.onViewportChange(onViewportChange);
appShell.emitViewportChange({ width: 1280, height: 720 });

expect(onViewportChange).toHaveBeenCalledWith({ width: 1280, height: 720 });
appShell.restore();
```

The mock also supports `emitTokenUpdate()`, responds to forced token refreshes,
and exposes recorded outbound messages for protocol assertions. `routeChanges`
lists the `subPath` values sent through `navigation.setRoute`, in order and after
leading-slash normalization:

```typescript
await sdk.navigation.setRoute('/settings');
expect(appShell.routeChanges).toEqual(['settings']);
```

The mock has no dependency on Jest, Vitest, or another test framework.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to report issues, propose changes, and run the project locally.

## License

[MIT](./LICENSE)

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Please read it before participating in issues, pull requests, or discussions.

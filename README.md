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

```typescript
import { createSDK } from '@sailpoint/ui-plugin-sdk';
import { mockSdkContext } from '@sailpoint/ui-plugin-sdk/testing';

const appShell = mockSdkContext({
	context: {
		tenant: { id: 'tenant-1', scriptName: 'acme', org: 'acme' },
		user: { id: 'user-1', displayName: 'Test User', email: 'test@example.com' },
		page: { route: '/plugins/example' },
		slot: { id: 'slot-1' }
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
and exposes recorded outbound messages for protocol assertions. It has no
dependency on Jest, Vitest, or another test framework.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to report issues, propose changes, and run the project locally.

## License

[MIT](./LICENSE)

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Please read it before participating in issues, pull requests, or discussions.

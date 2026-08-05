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
and exposes recorded outbound messages for protocol assertions. It has no
dependency on Jest, Vitest, or another test framework.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to report issues, propose changes, and run the project locally.

## License

[MIT](./LICENSE)

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Please read it before participating in issues, pull requests, or discussions.

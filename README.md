# ui-plugin-sdk

SailPoint UI Plugin SDK — runtime library and CLI tooling for building UI plugins for Identity Security Cloud (ISC).

## Packages

| Package | Description |
|---------|-------------|
| [`@sailpoint/ui-plugin-sdk`](./packages/ui-plugin-sdk) | Browser runtime library for UI plugins |
| [`@sailpoint/plugin-cli`](./packages/plugin-cli) | CLI tool for plugin development workflow |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) 9.x (`corepack enable && corepack prepare`)

### Setup

```bash
pnpm install
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run lint` | Run ESLint across all packages |
| `pnpm run lint:fix` | Run ESLint with auto-fix |
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Check formatting without writing |
| `pnpm run test` | Run Jest tests across all packages |
| `pnpm run typecheck` | TypeScript type checking (no emit) |

## License

[MIT](./LICENSE)

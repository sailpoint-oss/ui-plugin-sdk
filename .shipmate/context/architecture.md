# Architecture

## Current State

The repository is in its initial scaffolding phase. No source code, build system, or module structure has been established yet.

## Current Shape

Single-package **browser runtime library** published as `@sailpoint/ui-plugin-sdk`:

- COIP/iframe handshake and ISC UI plugin integration
- ESM-only output targeting modern browsers
- CLI tooling is **decoupled** — not part of this repository

## Directory Layout

```
ui-plugin-sdk/
├── src/              # Runtime library source
├── __tests__/        # Jest tests
├── dist/             # Build output (gitignored)
├── package.json      # @sailpoint/ui-plugin-sdk
├── tsconfig.json     # Browser-targeted TypeScript config
├── eslint.config.mjs
├── jest.config.ts
└── ...
```

## Key Decisions

- **Package manager:** npm (single package, no workspaces)
- **Language:** TypeScript, ESM (`"type": "module"`)
- **Target:** Browser (`ES2022`, DOM libs)
- **CLI:** Out of scope for this repo (separate epic tickets)

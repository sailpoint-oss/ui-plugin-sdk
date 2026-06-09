# Feature: SDK Repository Skeleton & Workspace Initialization

**Status:** Implemented
**Created:** 2026-06-09
**Jira:** [CSTM-184](https://sailpoint.atlassian.net/browse/CSTM-184)
**Epic:** [CSTM-183](https://sailpoint.atlassian.net/browse/CSTM-183) - UI Plugin SDK
**Completeness Score:** 65% at planning start

---

## Context Sources

This plan was created using context from:
- **Jira Ticket:** [CSTM-184](https://sailpoint.atlassian.net/browse/CSTM-184) - SDK Repository Skeleton & Workspace Initialization
- **Parent Epic:** [CSTM-183](https://sailpoint.atlassian.net/browse/CSTM-183) - UI Plugin SDK (18 stories)
- **Reference Configs:** ESLint and Prettier configs from `saas-sp-renderer` (saved in `context/`)
- **Similar Features:** None in this repo (greenfield)

---

## Problem Statement

The UI Plugin SDK needs a dedicated, independent repository with a well-structured monorepo layout so that developers can immediately begin implementing the runtime library (`@sailpoint/ui-plugin-sdk`) and CLI tooling (`@sailpoint/plugin-cli`). The repo must be completely independent of `saas-ui-monorepo`, use lightweight workspace tooling (pnpm workspaces, no Nx), and establish consistent code quality standards (linting, formatting, testing) from the start.

This is the foundational ticket — every other story in the CSTM-183 Epic depends on this skeleton being in place.

---

## Requirements

### Functional Requirements

- [x] FR-1: Root `package.json` configured as a pnpm workspace with `packages/*` glob
- [x] FR-2: `pnpm-workspace.yaml` defining the `packages/` directory as the workspace root
- [x] FR-3: `@sailpoint/plugin-cli` package skeleton under `packages/plugin-cli/` with its own `package.json`, `tsconfig.json`, and `src/index.ts`
- [x] FR-4: `@sailpoint/ui-plugin-sdk` package skeleton under `packages/ui-plugin-sdk/` with its own `package.json`, `tsconfig.json`, and `src/index.ts`
- [x] FR-5: Root TypeScript config (`tsconfig.base.json`) with shared compiler options; per-package `tsconfig.json` files extending it with environment-appropriate targets (Node for CLI, browser/ESM for runtime)
- [x] FR-6: Root ESLint config adapted from `saas-sp-renderer` — remove NestJS plugin, retain TypeScript/standard/jest/prettier integration, with per-package environment overrides (`node` for CLI, `browser` for runtime)
- [x] FR-7: Root Prettier config matching `saas-sp-renderer` conventions — `tabWidth: 4`, `useTabs: true`, `singleQuote: true`, `@trivago/prettier-plugin-sort-imports` with import order updated for SDK packages
- [x] FR-8: Jest configured at root with TypeScript support (`ts-jest`), with per-package Jest configs that resolve correctly within the workspace
- [x] FR-9: Root `package.json` scripts for workspace-wide linting (`lint`), formatting check (`format:check`), and testing (`test`)
- [x] FR-10: `.gitignore` covering `node_modules/`, `dist/`, `coverage/`, `.turbo/`, editor files, and OS artifacts
- [x] FR-11: `.nvmrc` or `engines` field pinning Node.js 22 LTS
- [x] FR-12: Inter-package dependency resolution works — `@sailpoint/plugin-cli` can declare a workspace dependency on `@sailpoint/ui-plugin-sdk` (or vice versa) and pnpm resolves it correctly
- [x] FR-13: MIT `LICENSE` file at repo root
- [x] FR-14: `commitlint` configured to enforce Conventional Commits format (full `@changesets/cli` and publish automation deferred to CSTM-185)

### Non-Functional Requirements

- **Consistency:** Formatting and linting rules must match the `saas-sp-renderer` / `saas-ui-monorepo` style so developers moving between repos experience minimal friction
- **Developer Experience:** `pnpm install` from root should set up the entire workspace; all lint/test/format commands should work from the first clone
- **Performance:** pnpm chosen over npm for faster installs and strict dependency isolation
- **Extensibility:** The skeleton must accommodate future packages (CSTM-198 design tokens, CSTM-190 `@sailpoint/create-plugin`) without structural changes to the workspace config

---

## Acceptance Criteria

- [x] AC-1: `pnpm install` from the repo root succeeds and creates a valid `pnpm-lock.yaml`; both workspace packages are recognized (verified via `pnpm ls --depth 0 -r`)
- [x] AC-2: `pnpm run lint` at root executes ESLint across all packages without errors on the skeleton code
- [x] AC-3: `pnpm run test` at root executes Jest across all packages; placeholder tests pass (at least one test per package asserting a trivial truth or re-exporting the entry point)
- [x] AC-4: `pnpm run format:check` at root runs Prettier in check mode and reports no formatting violations on skeleton code
- [x] AC-5: `packages/plugin-cli/tsconfig.json` targets Node.js 22 (`"module": "NodeNext"`, `"target": "ES2023"`)
- [x] AC-6: `packages/ui-plugin-sdk/tsconfig.json` targets modern browsers (`"module": "ES2022"`, `"target": "ES2022"`, `"lib": ["ES2022", "DOM"]`)
- [x] AC-7: TypeScript compilation (`tsc --noEmit`) succeeds for both packages from their respective directories
- [x] AC-8: Adding a new package directory under `packages/` requires only creating the directory with a `package.json` — no changes needed to root workspace config

---

## Confirmed Assumptions

The following assumptions were confirmed during planning:

| Assumption | Source | Confirmed By |
|------------|--------|--------------|
| pnpm workspaces (not npm) | Clarifying question | User on 2026-06-09 |
| Jest for testing (not Vitest) | Clarifying question | User on 2026-06-09 |
| Node.js 22 LTS minimum | Clarifying question | User on 2026-06-09 |
| `packages/` directory convention | Clarifying question | User on 2026-06-09 |
| Only 2 packages in this ticket (no design tokens) | Clarifying question | User on 2026-06-09 |
| ESM-only output for `@sailpoint/ui-plugin-sdk` | Clarifying question | User on 2026-06-09 |
| ESLint config adapted from `saas-sp-renderer` | Ticket description + shared config | User on 2026-06-09 |
| Prettier config adapted from `saas-sp-renderer` | Ticket description + shared config | User on 2026-06-09 |

---

## Vision Alignment

**Mission:** This is the first concrete step toward building the UI Plugin SDK — the standardized interface for ISC UI plugin development. It establishes the physical repo structure that all subsequent SDK work depends on.

**Architecture:** Creates a pnpm workspace monorepo with clear package boundaries matching the two primary SDK concerns: a Node.js CLI tool (`@sailpoint/plugin-cli`) and a browser runtime library (`@sailpoint/ui-plugin-sdk`). TypeScript and ESLint configs are scoped per environment to enforce correct API usage.

**Domain:** Establishes the `@sailpoint/` package namespace and the two core SDK package identifiers that consumers and sibling Epic tickets will reference.

---

## Similar Features

No similar features exist in this repo — it is greenfield with a single "first commit" containing only a `README.md`. The ESLint and Prettier configs from `saas-sp-renderer` serve as the closest reference and are saved in `context/`.

---

## Feature Flag Decision

**Project Policy Mode:** `strong`
**Decision:** No flag needed
**Rationale:** This is pure repository scaffolding — package.json, tsconfig, ESLint, Prettier, and empty package skeletons. It is non-executable infrastructure that cannot alter customer-facing behavior. Falls under the CI/CD and build configuration exemption.
**Label:** `feature-flag-exempt`

---

## Technical Approach

### High-Level Strategy

Create a pnpm workspace monorepo with two package skeletons, shared TypeScript/ESLint/Prettier configs at root, and per-package tsconfig overrides for the two runtime environments (Node.js and browser).

### Root Configuration

**`package.json`** (root):
- `"private": true` (workspace root, not published)
- `"type": "module"` (ESM by default)
- `"engines": { "node": ">=22" }`
- `"packageManager": "pnpm@10.x"` (corepack)
- Scripts: `lint`, `format:check`, `format`, `test`, `build`, `typecheck`
- DevDependencies: TypeScript, ESLint, Prettier, Jest, ts-jest, and shared plugins

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'packages/*'
```

**`tsconfig.base.json`** (shared compiler options):
- `strict: true`
- `esModuleInterop: true`
- `declaration: true`
- `declarationMap: true`
- `sourceMap: true`
- `skipLibCheck: true`
- `forceConsistentCasingInFileNames: true`
- `resolveJsonModule: true`
- `isolatedModules: true`

**`.eslintrc.cjs`** (adapted from `saas-sp-renderer`):
- Remove `plugin:nestjs/recommended` and `nestjs` plugin (not applicable)
- Keep `plugin:prettier/recommended`, `plugin:@typescript-eslint/recommended`, `standard`
- Keep `jest` plugin with `jest/no-focused-tests: error`
- Set root `env` to `{ es6: true, jest: true }` — per-package overrides add `node` or `browser`
- Keep all TypeScript rules from reference config **except** `@typescript-eslint/indent` (set to `'off'` — Prettier owns indentation)
- Keep spec file overrides (relaxed `no-explicit-any`, looser `no-unused-vars`)

**`.prettierrc.cjs`** (adapted from `saas-sp-renderer`):
- All settings carried forward
- Update `importOrder` to:
  ```
  ["^@sailpoint/(.*)$", "<THIRD_PARTY_MODULES>", "^[./]"]
  ```
- Keep `importOrderSeparation: true`
- Keep `importOrderParserPlugins: ["typescript", "decorators-legacy"]`

**`jest.config.ts`** (root):
- `projects: ['<rootDir>/packages/*']` to discover per-package configs
- Shared config preset: `ts-jest/presets/default-esm`

### Package: `@sailpoint/plugin-cli`

**Target:** Node.js 22 (CLI tool)

```
packages/plugin-cli/
├── package.json          # name: @sailpoint/plugin-cli, type: module
├── tsconfig.json         # extends ../../tsconfig.base.json, target: ES2023, module: NodeNext
├── jest.config.ts        # ts-jest with node environment
├── src/
│   └── index.ts          # placeholder export
└── __tests__/
    └── index.spec.ts     # placeholder test
```

- `tsconfig.json`: `"target": "ES2023"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
- ESLint env override: `node: true`
- `package.json` `"bin"` field prepared (empty for now — CSTM-191 will populate)

### Package: `@sailpoint/ui-plugin-sdk`

**Target:** Browser (ESM runtime library)

```
packages/ui-plugin-sdk/
├── package.json          # name: @sailpoint/ui-plugin-sdk, type: module
├── tsconfig.json         # extends ../../tsconfig.base.json, target: ES2022, module: ES2022
├── jest.config.ts        # ts-jest with jsdom environment
├── src/
│   └── index.ts          # placeholder export
└── __tests__/
    └── index.spec.ts     # placeholder test
```

- `tsconfig.json`: `"target": "ES2022"`, `"module": "ES2022"`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`
- ESLint env override: `browser: true`
- `package.json` `"exports"` field for ESM-only distribution

### Additional Root Files

| File | Purpose |
|------|---------|
| `.nvmrc` | `22` — pin Node version for nvm/fnm users |
| `.gitignore` | `node_modules/`, `dist/`, `coverage/`, `.turbo/`, editor/OS files |
| `.editorconfig` | Tabs, UTF-8, final newline — consistent across editors |
| `LICENSE` | MIT license |
| `commitlint.config.cjs` | Enforce Conventional Commits (`@commitlint/config-conventional`) |
| `README.md` | Expand beyond title: repo purpose, getting started, workspace structure |

---

## Dependencies

### Technical Dependencies (devDependencies at root)

| Package | Purpose |
|---------|---------|
| `typescript` | Language compiler |
| `eslint` | Linting engine |
| `@typescript-eslint/parser` | TS parser for ESLint |
| `@typescript-eslint/eslint-plugin` | TS-specific lint rules |
| `eslint-config-standard` | Standard style base |
| `eslint-plugin-import` | Import/export lint rules (standard dep) |
| `eslint-plugin-n` | Node.js lint rules (standard dep) |
| `eslint-plugin-promise` | Promise lint rules (standard dep) |
| `eslint-plugin-jest` | Jest-specific lint rules |
| `eslint-plugin-prettier` | Run Prettier as ESLint rule |
| `eslint-config-prettier` | Disable conflicting ESLint rules |
| `prettier` | Code formatter |
| `@trivago/prettier-plugin-sort-imports` | Import sorting |
| `jest` | Test runner |
| `ts-jest` | TypeScript Jest transformer |
| `@types/jest` | Jest type definitions |
| `@commitlint/cli` | Commit message linter |
| `@commitlint/config-conventional` | Conventional Commits ruleset |

### Team Dependencies

- None — this is self-contained foundational work

### External Dependencies

- None — no external services or APIs

### Blocking Issues

- None — no linked blockers in Jira

---

## Constraints

- **Formatting Consistency:** Must match `saas-sp-renderer` / `saas-ui-monorepo` Prettier output (tabs, 4-wide, single quotes, trailing comma: none)
- **No Nx:** Ticket explicitly calls out lightweight tooling — pnpm workspaces only
- **Scope:** Only `@sailpoint/plugin-cli` and `@sailpoint/ui-plugin-sdk` skeletons. `@sailpoint/create-plugin` is deferred to CSTM-190. Design tokens deferred to CSTM-198.
- **Dual Environment:** tsconfig and ESLint must correctly scope Node.js vs browser environments per package to prevent accidental use of Node APIs in the browser runtime library or DOM APIs in the CLI

---

## Open Questions

All resolved.

- [x] OQ-1: **Resolved** — Add `commitlint` for Conventional Commits now; defer `@changesets/cli` and publish automation to CSTM-185
- [x] OQ-2: **Resolved** — MIT license
- [x] OQ-3: **Resolved** — Let Prettier own indentation; disable `@typescript-eslint/indent` in ESLint config

---

## Clarifying Questions & Answers

### Questions Asked

**Q1:** Package Manager: npm or pnpm workspaces?
**A1:** pnpm workspaces

**Q2:** Testing Framework: Vitest, Jest, or other?
**A2:** Jest

**Q3:** Node.js minimum version?
**A3:** Node 22 LTS

**Q4:** Package directory convention?
**A4:** `packages/` directory (e.g., `packages/plugin-cli/`, `packages/ui-plugin-sdk/`)

**Q5:** Include design tokens skeleton now?
**A5:** No — only the two packages specified in the ticket

**Q6:** ESLint config approach?
**A6:** User shared `saas-sp-renderer` config for matching (saved in context)

**Q7:** Module format for `@sailpoint/ui-plugin-sdk`?
**A7:** ESM only

**Q8:** Prettier config source?
**A8:** User shared `saas-sp-renderer` config for matching (saved in context)

---

## Jira Context

**Ticket:** CSTM-184
**URL:** [CSTM-184](https://sailpoint.atlassian.net/browse/CSTM-184)
**Title:** SDK Repository Skeleton & Workspace Initialization
**Priority:** Unspecified
**Labels:** None
**Epic:** CSTM-183 — UI Plugin SDK

**Original Description:**
> Establish the dedicated repository for the UI Plugin SDK, completely independent of the `saas-ui-monorepo`, and create the foundational structure needed for developers to immediately start writing code.
>
> **Implementation Details:**
> - Initialize a new git repository (e.g., `ui-plugin-sdk`).
> - Use standard `npm workspaces` (or `pnpm workspaces`) to manage the mono-repo structure without the overhead of heavy tools like Nx.
> - Scaffold the internal packages with basic structural files: `@sailpoint/plugin-cli` and `@sailpoint/ui-plugin-sdk`. (Note: `@sailpoint/create-plugin` is deferred to a separate ticket).
> - Configure root `package.json`, linting, code formatting (Prettier/ESLint), and testing frameworks suitable for Node.js CLI tools and vanilla JavaScript libraries.
> - **Formatting:** Adopt the standard Prettier configurations used in `saas-sp-renderer` and `saas-ui-monorepo` to ensure consistency (e.g., `tabWidth: 4`, `useTabs: true`). Ensure the `@trivago/prettier-plugin-sort-imports` plugin is included.
> - **Linting:** Draw inspiration from the ESLint configurations in `saas-sp-renderer` (extending `standard` and testing rules).
> - **Note on Scope:** The workspace contains both Node.js (CLI) and Browser (Runtime) code. Ensure `tsconfig.json` and ESLint environments (node vs browser) are scoped correctly per package.

---

## Next Steps

1. Review this plan and resolve any open questions (OQ-1 through OQ-3)
2. Implement the skeleton (this can be done directly — no spec needed for scaffolding)
3. Run `/shipmate-spec CSTM-184` if a more detailed technical specification is desired before implementation

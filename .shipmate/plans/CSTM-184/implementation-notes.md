# Implementation Notes: CSTM-184

## Scope Change (2026-06-09)

**User correction:** Eliminate monorepo; flatten to single-package browser runtime library.

| Change | Action taken |
|--------|--------------|
| Remove pnpm workspaces | Deleted `pnpm-workspace.yaml`; switched to npm single package |
| Remove `@sailpoint/plugin-cli` | Deleted `packages/plugin-cli/` |
| Flatten `@sailpoint/ui-plugin-sdk` | Moved `src/` and `__tests__/` to repo root |
| Simplify configs | Single `tsconfig.json`, browser-only ESLint globals, simplified scripts |
| Package identity | Root `package.json` is now `@sailpoint/ui-plugin-sdk` |

**External follow-up:** Update Ticket 1 in `sdk-epic.org` and Jira CSTM-184 description to match revised scope (documented in `context/jira.md`).

## Key Decisions

**1. ESLint flat config without `eslint-config-standard`**
- Context: ESLint 9 flat config does not support legacy `extends: ['standard']` the same way; `eslint-config-standard` targets legacy config.
- Choice: Ported substantive rules from `saas-sp-renderer` into `eslint.config.mjs` and used `globals` package for Jest/Node/browser environments.
- Rationale: Keeps linting working on ESLint 9 without fighting incompatible config formats.

**2. Consolidated Jest configuration at root**
- Context: Per-package `jest.config.ts` files failed to transform `plugin-cli` tests when package `"type": "module"` combined with `NodeNext` tsconfig.
- Choice: Single root `jest.config.ts` with inline `projects` array; added `packages/plugin-cli/tsconfig.jest.json` with CommonJS module for test compilation.
- Rationale: Stable ts-jest CJS transform for NodeNext CLI package while preserving ESM source/build config.

**3. Added `ts-node` devDependency**
- Context: Jest 29 requires `ts-node` to load root `jest.config.ts`.
- Choice: Added `ts-node` to workspace root devDependencies.
- Rationale: Minimal addition to support TypeScript Jest config as specified.

**4. Workspace inter-package dependency**
- Context: FR-12 requires workspace dependency resolution.
- Choice: `@sailpoint/plugin-cli` declares `"@sailpoint/ui-plugin-sdk": "workspace:*"` in dependencies.
- Rationale: Verifies pnpm workspace linking without adding runtime code yet.

**5. Typecheck script adjustment**
- Context: `tsc --build` requires `composite` project references not defined in skeleton.
- Choice: `tsc --noEmit -p` per package instead of `tsc --build`.
- Rationale: Achieves AC-7 without premature project-reference setup.

## Deviations from Spec

| Deviation | Rationale |
|-----------|-----------|
| Removed per-package `jest.config.ts` files | Root inline projects required for reliable transforms |
| Added `tsconfig.jest.json` for plugin-cli | NodeNext + `"type": "module"` broke ts-jest CJS transform |
| Added `globals` and `ts-node` devDependencies | Required for ESLint 9 flat config and Jest TS config loading |
| Omitted `eslint-config-standard` and related plugins | Incompatible with ESLint 9 flat config; rules ported manually |
| Removed deprecated `@typescript-eslint` rules (`member-delimiter-style`, `type-annotation-spacing`) | Removed in typescript-eslint v8 |

## Test Coverage

- Unit: 2 placeholder tests (1 per package), both passing
- Integration: N/A (scaffolding only)
- E2E: N/A (deferred to CSTM-197)

## Verification Results

All acceptance criteria verified on 2026-06-09:

```bash
pnpm install                    # AC-1 ✓
pnpm ls --depth 0 -r            # AC-1 ✓ (workspace packages + link)
pnpm run lint                   # AC-2 ✓
pnpm run test                   # AC-3 ✓ (2 tests passing)
pnpm run format:check           # AC-4 ✓
pnpm run typecheck              # AC-5/6/7 ✓
```

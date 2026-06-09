# Jira Context: CSTM-184

**Ticket:** [CSTM-184](https://sailpoint.atlassian.net/browse/CSTM-184)
**Summary:** SDK Repository Skeleton & Workspace Initialization
**Type:** Story
**Status:** In Progress
**Assignee:** Patrick Dowd
**Reporter/Creator:** Jeremy Gooch
**Project:** Customizations (CSTM)

## Parent Epic

**Epic:** [CSTM-183](https://sailpoint.atlassian.net/browse/CSTM-183) — UI Plugin SDK

## Original Description (Jira — stale)

> Establish the dedicated repository for the UI Plugin SDK, completely independent of the `saas-ui-monorepo`, and create the foundational structure needed for developers to immediately start writing code.

Original implementation details referenced pnpm/npm workspaces, `@sailpoint/plugin-cli`, and dual Node.js/browser environments.

## Revised Scope (2026-06-09)

The repository is a **single-package NPM library** focused exclusively on the browser runtime (`@sailpoint/ui-plugin-sdk`). CLI tooling is decoupled from this repo.

### Revised Implementation Details (for Jira / sdk-epic.org Ticket 1)

- Initialize a dedicated git repository (`ui-plugin-sdk`).
- Set up a **standard, single-package NPM repository** for `@sailpoint/ui-plugin-sdk`.
- Scaffold the `@sailpoint/ui-plugin-sdk` structure (`src/`, `__tests__/`, `package.json`, `tsconfig.json`).
- Configure linting, code formatting (Prettier/ESLint), and testing frameworks suitable for a **browser runtime library**.
- **Formatting:** Adopt Prettier settings from `saas-sp-renderer` / `saas-ui-monorepo` (`tabWidth: 4`, `useTabs: true`, `@trivago/prettier-plugin-sort-imports`).
- **Linting:** Draw inspiration from ESLint configurations in `saas-sp-renderer` (browser + Jest globals only).

**Removed from scope:**
- pnpm/npm workspaces monorepo structure
- `@sailpoint/plugin-cli` package
- Dual Node.js/browser environment scoping per package

### Revised Acceptance Criteria

- [ ] Dedicated repository and single-package NPM structure are successfully created.
- [ ] `@sailpoint/ui-plugin-sdk` skeleton is scaffolded with `src/`, tests, and build output to `dist/`.
- [ ] Linting, formatting, typecheck, and testing commands execute successfully.

## Sibling Tickets in Epic

CLI-related tickets (CSTM-190 through CSTM-197) remain in the epic but are **out of scope for this repository**. They will live in a separate CLI repo or delivery path.

| Ticket | Summary | Relevance to this repo |
|--------|---------|------------------------|
| CSTM-184 | SDK Repository Skeleton | **This ticket** |
| CSTM-185 | SDK CI/CD Pipeline & NPM Publishing | Next |
| CSTM-186–189 | Runtime Library features | In-repo implementation |
| CSTM-190–197 | CLI tooling | **Decoupled** — not in this repo |
| CSTM-198–201 | Design tokens / App Shell | Separate concerns |

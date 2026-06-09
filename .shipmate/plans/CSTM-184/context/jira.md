# Jira Context: CSTM-184

**Ticket:** [CSTM-184](https://sailpoint.atlassian.net/browse/CSTM-184)
**Summary:** SDK Repository Skeleton & Workspace Initialization
**Type:** Story
**Status:** In Progress
**Assignee:** Patrick Dowd
**Reporter/Creator:** Jeremy Gooch
**Priority:** Unspecified
**Labels:** None
**Components:** None
**Project:** Customizations (CSTM)

## Parent Epic

**Epic:** [CSTM-183](https://sailpoint.atlassian.net/browse/CSTM-183) — UI Plugin SDK
**Epic Status:** Backlog

## Description

Establish the dedicated repository for the UI Plugin SDK, completely independent of the `saas-ui-monorepo`, and create the foundational structure needed for developers to immediately start writing code.

### Implementation Details

- Initialize a new git repository (e.g., `ui-plugin-sdk`).
- Use standard `npm workspaces` (or `pnpm workspaces`) to manage the mono-repo structure without the overhead of heavy tools like Nx.
- Scaffold the internal packages with basic structural files: `@sailpoint/plugin-cli` and `@sailpoint/ui-plugin-sdk`. (Note: `@sailpoint/create-plugin` is deferred to a separate ticket).
- Configure root `package.json`, linting, code formatting (Prettier/ESLint), and testing frameworks suitable for Node.js CLI tools and vanilla JavaScript libraries.
- **Formatting:** Adopt the standard Prettier configurations used in `saas-sp-renderer` and `saas-ui-monorepo` to ensure consistency (e.g., `tabWidth: 4`, `useTabs: true`). Ensure the `@trivago/prettier-plugin-sort-imports` plugin is included.
- **Linting:** Draw inspiration from the ESLint configurations in `saas-sp-renderer` (extending `standard` and testing rules).
- **Note on Scope:** The workspace contains both Node.js (CLI) and Browser (Runtime) code. Ensure `tsconfig.json` and ESLint environments (node vs browser) are scoped correctly per package.

### Acceptance Criteria

- [ ] Dedicated repository and `npm workspaces` structure are successfully created.
- [ ] Basic package skeletons are scaffolded and inter-dependencies resolve correctly via the workspace.
- [ ] Linting and testing commands execute successfully across the workspace.

## Sibling Tickets in Epic

| Ticket | Summary | Status |
|--------|---------|--------|
| CSTM-184 | SDK Repository Skeleton & Workspace Initialization | In Progress |
| CSTM-185 | SDK CI/CD Pipeline & NPM Publishing | Backlog |
| CSTM-186 | Runtime Library - Core Engine & Handshake | Backlog |
| CSTM-187 | Runtime Library - Context API | Backlog |
| CSTM-188 | Runtime Library - Token Management & API Fetching | Backlog |
| CSTM-189 | Runtime Library - Testing Harness | Backlog |
| CSTM-190 | Workspace Scaffolding CLI (@sailpoint/create-plugin) | Backlog |
| CSTM-191 | Core CLI Base & State Management (@sailpoint/plugin-cli) | Backlog |
| CSTM-192 | CLI Command - init | Backlog |
| CSTM-193 | CLI Command - serve | Backlog |
| CSTM-194 | CLI Command - build | Backlog |
| CSTM-195 | CLI Command - deploy | Backlog |
| CSTM-196 | CLI Commands - Lifecycle Utilities | Backlog |
| CSTM-197 | CLI E2E Testing Strategy | Backlog |
| CSTM-198 | UI Integration - Design Tokens Package | Backlog |
| CSTM-199 | App Shell - Local Dev Interceptor & State Machine | Backlog |
| CSTM-200 | App Shell - Local Dev Consent & Certificate Fallback UIs | Backlog |
| CSTM-201 | App Shell - Local Dev Persistent Indicator Badge | Backlog |

# Shipmate Project Context

Review the repo-specific files under `@.shipmate/context/` before making changes that depend on business intent, architecture, local conventions, or delivery workflow. These files are the project-maintained source of truth created or refreshed by `/shipmate-learn` after deterministic init/update/doctor flows have established the project contract.

## Always Check Repo Context First

- Prefer repo-specific guidance in `@.shipmate/context/` over generic defaults when the two conflict.
- Read `@.shipmate/context/mission.md` before scoping work, prioritizing changes, or making tradeoff calls.
- Read `@.shipmate/context/coding-style.md` and `@.shipmate/context/style-guide.md` before editing code so naming, structure, tests, and formatting stay aligned with the repo.

## Context Files And When To Use Them

| File | Review When |
|------|-------------|
| `@.shipmate/context/mission.md` | You need the service purpose, user outcome, or product priority behind a change. |
| `@.shipmate/context/domain.md` | Terminology, business rules, or domain concepts affect naming, validation, or behavior. |
| `@.shipmate/context/architecture.md` | The task changes boundaries, data flow, APIs, integrations, or module structure. |
| `@.shipmate/context/project-info.md` | You need a quick summary of the repo shape, ownership, entrypoints, or operating constraints. |
| `@.shipmate/context/coding-style.md` | You are editing implementation details and need repo-specific coding patterns or language conventions. |
| `@.shipmate/context/style-guide.md` | You are choosing naming, file organization, test shape, imports, comments, or review expectations. |
| `@.shipmate/context/git-branching.md` | The task involves branches, commits, merge strategy, release flow, or hotfix process. |
| `@.shipmate/context/pull-requests.md` | You are preparing a PR, commit summary, review response, or rollout notes. |
| `@.shipmate/context/tech-debt.md` | You are planning cleanup, follow-up work, refactors, or known-risk remediation. |

## Working Rules

- Use the narrowest relevant context file first, then expand to adjacent files only when needed.
- If a referenced context file is missing, continue with the files that exist instead of inventing repo conventions.
- Keep standards, workflows, and project context aligned: repo context explains local expectations, while `@.shipmate/standards/` and `@.shipmate/workflows/` provide the broader Shipmate guidance.

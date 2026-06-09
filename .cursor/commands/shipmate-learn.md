[Shipmate] Refresh project-specific context in .shipmate/context/ without mutating the canonical deterministic project contract.

---
version: 1.0
context:
  - @README.md
  - @.shipmate/context/mission.md
  - @.shipmate/context/architecture.md
  - @.shipmate/context/coding-style.md
  - @.shipmate/context/**/*
---
# Re-Learn Project

**Command:** `/shipmate-learn`

**Purpose:** Refresh `.shipmate/context/` and `projectLearn` freshness metadata for an already initialized repository. `/shipmate-learn` is re-runnable and context-only.

**Skill:** Vision Builder - Product Vision Initialization Specialist (`@.shipmate/roles/engineering-ic/skills/vision-builder/SKILL.md`)

---

## Repo Contract

Use these paths and ownership rules throughout this command:

- project config: `shipmate.json`
- project context: `.shipmate/context/`
- active feature workspace: `.shipmate/plans/{FEATURE-ID}/`
- projected reference trees: `.shipmate/standards/` and `.shipmate/workflows/`

`/shipmate-learn` refreshes `.shipmate/context/` and updates `shipmate.json.projectLearn`. It may update existing context files there, but it must not recreate legacy repo-local `.shipmate/project/` or `.shipmate/users/`, and it must not write `roles` into `shipmate.json`.

## Deterministic Ownership Boundary

The CLI owns deterministic project state.

`/shipmate-learn` must **not** rewrite any of these canonical deterministic fields:

- `shipmate.json.harnesses`
- `shipmate.json.projectTypes`
- `shipmate.json.teams`
- `shipmate.json.techStacks`
- `shipmate.json.detected.*`
- `shipmate.json.coreVersion`

`/shipmate-learn` must **not** reproject any of these deterministic surfaces:

- `.shipmate/standards/`
- `.shipmate/workflows/`
- harness-native files under `.cursor/`, `.claude/`, `.agents/`
- `CLAUDE.md`
- `AGENTS.md`
- `.gitignore`

If you believe the canonical project contract is stale or wrong, stop and direct the user to run `shipmate init`, `shipmate update`, or `shipmate doctor` instead of silently fixing it here.

## Prerequisites

- Project has already been initialized with `shipmate init`
- `shipmate.json` exists
- You are in the project root directory

If those conditions are not met, instruct the user to run `shipmate init` first.

## What Learn Does

1. Read the existing `shipmate.json` contract and any existing `.shipmate/context/` files.
2. Analyze the codebase to refresh project-specific context such as:
   - mission and purpose
   - architecture and boundaries
   - domain language and key entities
   - PR conventions and branching workflow
   - coding style and repo-local patterns
   - known technical debt
3. Optionally enrich that context with external references discovered in the repo, such as Jira tickets or Confluence pages, when those tools are available.
4. Write or refresh the standard context files in `.shipmate/context/`:
   - `mission.md`
   - `architecture.md`
   - `domain.md`
   - `project-info.md`
   - `git-branching.md`
   - `pull-requests.md`
   - `coding-style.md`
   - `style-guide.md`
   - `tech-debt.md`
5. Update `shipmate.json.projectLearn.generatedAt` and `shipmate.json.projectLearn.gitSha`.
6. Summarize what context changed and any gaps that still need manual follow-up.

## Operating Guidance

- Prefer preserving and improving existing context over replacing it wholesale.
- Treat existing `shipmate.json` classification as input, not something to be recomputed here.
- When context is stale or incomplete, call that out explicitly in the generated files instead of inventing certainty.
- If you discover that the deterministic contract is clearly wrong, recommend running `shipmate init` or `shipmate doctor` after learn completes, or before learn if the mismatch blocks accurate context generation.

## Automation Guidance

`/shipmate-learn` is safe to run repeatedly when:

- architecture changes materially
- product/domain context changes
- PR or branching conventions drift
- stale-context warnings indicate the project should be re-learned

In automation or non-interactive usage, apply context refreshes automatically, but keep the deterministic ownership boundary intact.

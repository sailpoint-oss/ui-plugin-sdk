[Shipmate] Collect any missing answers, run shipmate init, then continue into learn only when context needs to be refreshed.

---
version: 1.0
context:
  - @README.md
  - @.shipmate/context/mission.md
  - @.shipmate/context/architecture.md
  - @.shipmate/context/coding-style.md
---
# Shipmate Init

**Command:** `/shipmate-init`

`/shipmate-init` is a thin AI wrapper around the canonical `shipmate init` CLI command. The CLI owns deterministic project state. This slash command may help interview the user first, but it must not duplicate the init pipeline.

## Repo Contract

Use these paths and outputs throughout this command:

- project config: `shipmate.json`
- project context: `.shipmate/context/`
- active feature workspace: `.shipmate/plans/{FEATURE-ID}/`
- retained shipped feature reference: `.shipmate/features/{FEATURE-ID}.md`
- projected reference trees: `.shipmate/standards/` and `.shipmate/workflows/`

Do **not** create repo-local `.shipmate/project/`, `.shipmate/users/`, `.shipmate/agents/`, `.shipmate/commands/`, or `.shipmate/tools/`.

## Required Outcomes

1. Verify that the Shipmate CLI is available. If it is not, instruct the user to install Shipmate first.
2. Determine whether the user wants to accept the repo's freshly detected contract or override any of these deterministic fields before init runs:
   - `teams`
   - `projectTypes`
   - `techStacks`
   - `harnesses`
3. Run the canonical CLI command from the repo root:
   - base command: `shipmate init`
   - append explicit flags only when the user supplied overrides:
     - `--team <value>`
     - `--project-type <value>`
     - `--tech-stack <value>`
     - `--harness <value>`
   - use `--force` only when the user explicitly wants an unconditional deterministic refresh
4. Let the CLI own all deterministic writes:
   - create or refresh `shipmate.json`
   - refresh detection metadata
   - generate or refresh the projected reference trees in `.shipmate/standards/` and `.shipmate/workflows/`
   - Project harness content only for the harnesses enabled in `shipmate.json`
   - do **not** create files or directories for harnesses that are not enabled
   - ensure `.gitignore` contains the Shipmate-managed entries
5. After `shipmate init` finishes, decide whether to continue into `/shipmate-learn`:
   - continue automatically when this was the first init
   - continue automatically when `.shipmate/context/` is missing
   - continue automatically when the canonical contract changed in a way that makes context stale
   - otherwise stop after summarizing the deterministic refresh
6. Present a concise summary of what the CLI changed and whether learn ran.

## Constraints

- Prefer running `shipmate init` over manually editing `shipmate.json` or projecting files yourself.
- Never bypass the CLI when the CLI is available.
- Never create `.claude/`, `CLAUDE.md`, `.agents/`, or `AGENTS.md` unless the corresponding harness is enabled in `shipmate.json`.
- `/shipmate-init` may ask follow-up questions, but deterministic project ownership remains with the CLI.
- `/shipmate-init` may invoke `/shipmate-learn`, but only after `shipmate init` has completed successfully.

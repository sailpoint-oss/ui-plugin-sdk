[Shipmate] Discover strong documentation patterns in the repo and improve related docs to match them.

---
version: 1.0
context:
  - @README.md
  - @.shipmate/context/mission.md
  - @.shipmate/context/architecture.md
  - @.shipmate/context/coding-style.md
  - @.shipmate/context/pull-requests.md
---
# Improve Documentation

**Command:** `/shipmate-improve-docs`

**Purpose:** Discover documentation patterns already in the repo, then model from the best examples to fill gaps across sibling projects, modules, or components.

**Workflow:** Single-agent

**Skill:** Scribe - Documentation Specialist (`@.shipmate/roles/engineering-ic/skills/writing-documentation/SKILL.md`)

---

> **⚠️ Tool Preference:** Use `jira` and `confluence` CLI commands for all Atlassian access. Do NOT use Atlassian MCP servers — they are unreliable. Use `gh` CLI for GitHub operations.

## Core Principle

**The repo already contains its own documentation standard via example.** Don't impose an external template. Find the best-documented sibling and use it as the model.

---

## Instructions

### Phase 1: Discover Repo Structure

Understand how the repo is organized before looking at docs.

**Step 1: Identify repeating units**

Scan for parallel directory structures - these are the "siblings" that should have consistent documentation.

```bash
# Monorepo with apps/packages
ls -d apps/*/ packages/*/ libs/*/ 2>/dev/null

# MFE-style
ls -d apps/mfes/*/ 2>/dev/null

# Services
ls -d services/*/ 2>/dev/null

# Any parallel structure
find . -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" | sort
```

**Step 2: Classify the repo pattern**

| Pattern | Indicator | Sibling Unit |
|---------|-----------|-------------|
| Monorepo (Nx/Lerna/pnpm) | `nx.json`, `lerna.json`, `pnpm-workspace.yaml` | Each project/package |
| MFE collection | `apps/mfes/*/mfe.json` | Each MFE |
| Microservices | `services/*/Dockerfile` | Each service |
| Component library | `src/components/*/` | Each component |
| Plugin architecture | `plugins/*/` | Each plugin |
| Standard project | Single `package.json` | Each top-level module/directory |

Report what you found:

```
Repo Structure Detected:
  Type: [monorepo/mfes/services/library/standard]
  Sibling units: [count] found
  Examples: [list first 5]
```

---

### Phase 2: Find Documentation Exemplars

**Step 1: Survey existing documentation across all siblings**

```bash
# Find all doc-like files across siblings
find [sibling-dirs] -name "*.md" -not -path "*/node_modules/*" | sort

# Check for docs/ directories
find [sibling-dirs] -type d -name "docs" | sort

# Find READMEs
find [sibling-dirs] -maxdepth 2 -name "README.md" | sort
```

**Step 2: Score each sibling's documentation**

For each sibling unit, assess:

| Signal | Weight | How to Check |
|--------|--------|-------------|
| Has `docs/` directory | High | Directory exists |
| Has README with >50 lines | High | `wc -l README.md` |
| Has multiple doc files | High | Count `.md` files |
| Docs reference actual code | Medium | Grep for file paths, function names |
| Has diagrams (ASCII/Mermaid) | Medium | Grep for box-drawing chars or mermaid blocks |
| Has tables | Medium | Grep for markdown tables |
| Docs updated recently | Low | `git log --format=%ai -1 -- docs/` |

**Step 3: Identify the exemplar(s)**

Pick the 1-2 best-documented siblings. These are your models.

```
Documentation Survey:
  [count] siblings scanned
  [count] have docs/ directory
  [count] have substantial README

  Best documented (exemplar):
    [name] - [X] doc files, [Y] total lines, last updated [date]
    Files: [list doc files]

  Undocumented or sparse:
    [list siblings with no/minimal docs]
```

**STOP and confirm with the user:**

```
I found [exemplar name] as the best-documented [sibling type] in this repo.

It has:
- [list doc files with brief description of each]

I can use this as the model to generate matching documentation for:
- [list undocumented siblings]

Options:
1. Generate docs for all undocumented [sibling type]s using this model
2. Generate docs for a specific [sibling type] (name it)
3. Show me the exemplar analysis first
4. Use a different exemplar (specify)

Which would you like?
```

---

### Phase 3: Analyze the Exemplar

**Step 1: Extract the documentation schema**

Read every doc file in the exemplar. For each file, extract:

- **File name and purpose** (ARCHITECTURE.md = structure, README.md = overview, etc.)
- **Section headings** (H2/H3 structure)
- **Content patterns** (tables vs prose vs diagrams vs code blocks)
- **Information sources** (what code was analyzed to produce each section)
- **Naming conventions** (how things are labeled, referenced)

**Step 2: Build the abstract template**

Convert the exemplar's docs into a reusable schema. Don't copy content - capture structure.

Example output:

```
Extracted Documentation Schema from [exemplar]:

File: ARCHITECTURE.md
  Purpose: High-level architecture overview
  Sections:
    - Overview (metadata table + 1-2 sentence summary)
    - Routes (table: route, flag, auth, module)
    - Component Hierarchy (ASCII diagram)
    - Module Structure (ASCII diagram)
    - Feature Libraries (table: name, import path, purpose)
    - Services (table: name, location, scope, purpose)
    - Guards (table: name, type, logic)
  Patterns:
    - Tables preferred over prose
    - ASCII diagrams for hierarchies
    - One-phrase descriptions in tables
  Source analysis needed:
    - Route files (*.routes.ts)
    - Service files (*.service.ts)
    - Guard files (*.guard.ts)
    - Module config (mfe.json, project.json)

File: DATA-MODELS.md
  Purpose: TypeScript interface/type catalog
  Sections:
    - Quick Reference (summary table)
    - API Models (request/response types)
    - Domain Models (business entities with property tables)
    - UI State (component/store types)
    - Enums & Constants
    - Type Relationships (ASCII diagram, optional)
  Source analysis needed:
    - Model files (*/models/*.ts)
    - Interface exports (grep "export interface")
    - Enum exports (grep "export enum")
```

---

### Phase 4: Generate Documentation for Target Siblings

For each target sibling (undocumented or sparse):

**Step 1: Analyze the sibling's source code**

Using the schema from Phase 3, gather the same types of information the exemplar used:

```bash
# Mirror the exemplar's analysis for the target
# If exemplar analyzed route files → find route files in target
# If exemplar analyzed services → find services in target
# If exemplar analyzed models → find models in target
```

**Step 2: Generate each doc file following the schema**

- Use the **same file names** as the exemplar
- Use the **same section structure**
- Use the **same content patterns** (tables where exemplar used tables, diagrams where exemplar used diagrams)
- Fill with **real data from the target's source code**
- If a section doesn't apply (e.g., target has no guards), omit it with a brief note or skip entirely

**Step 3: Adapt intelligently**

The exemplar is a model, not a rigid template:

- If the target has concepts the exemplar didn't (e.g., WebSocket connections, background jobs), add appropriate sections
- If the target is simpler, don't pad with empty sections
- If the target uses different patterns (e.g., NGRX vs signals), adjust terminology
- Match the **depth** to the target's complexity - a 3-file utility doesn't need the same doc depth as a 50-component MFE

---

### Phase 5: Gap Analysis for Existing Docs

If a sibling already has documentation but it's incomplete compared to the exemplar:

**Step 1: Compare against the schema**

```
Documentation Gap Analysis: [sibling name]

Present and complete:
  ✅ README.md - Has overview, setup, usage
  ✅ ARCHITECTURE.md - Has component hierarchy

Missing (exemplar has, this doesn't):
  ❌ DATA-MODELS.md - No type/interface documentation
  ❌ EDGE-CASES.md - No edge case documentation

Incomplete (exists but sparse vs exemplar):
  ⚠️ ARCHITECTURE.md - Missing Services table, Guards table
  ⚠️ README.md - Missing Error Handling section
```

**Step 2: Fill gaps without overwriting existing content**

- Add missing files entirely
- For incomplete files, append missing sections (never rewrite existing content)
- Flag sections where existing content contradicts source code (mark as potentially stale, don't auto-fix)

---

### Phase 6: Validate and Report

**Step 1: Cross-reference generated docs against source**

For each generated doc file:
- Verify referenced files/paths actually exist
- Verify interface properties match actual TypeScript definitions
- Verify route paths match actual route configs
- Flag anything that couldn't be confirmed from source

**Step 2: Summary report**

```
Documentation Improvement Complete

Exemplar used: [name]
Schema extracted: [X] doc files, [Y] sections

Generated:
  [sibling 1]: [X] new files, [Y] sections
  [sibling 2]: [X] new files, [Y] sections
  ...

Gap-filled:
  [sibling 3]: [X] sections added to existing docs

Total:
  Files created: [count]
  Files updated: [count]
  Siblings now matching exemplar: [count]/[total]

Confidence notes:
  - [any sections that couldn't be fully verified]
  - [any concepts that need manual review]

Would you like me to commit these documentation changes?
```

---

## Fallback: No Exemplar Found

If no sibling has meaningful documentation, use this escalation chain:

### Level 1: Check for repo-level standards

Does `.shipmate/`, `.cursor/rules/`, or `CONTRIBUTING.md` define documentation expectations? Use those.

### Level 2: Use best-in-class references

When the repo has nothing to model from, use these proven documentation patterns as your starting point. Fetch and analyze the ones most relevant to the repo's type:

**Angular / Frontend (TypeScript):**
- Angular CDK: https://github.com/angular/components/tree/main/src/cdk — each module has a focused README with API tables, usage examples, and accessibility notes
- Angular Material: https://github.com/angular/components/tree/main/src/material — per-component docs with API reference, examples, and theming guidance
- NgRx: https://github.com/ngrx/platform/tree/main/docs — store, effects, and entity docs with clear usage patterns and API tables

**Nx Monorepos:**
- Nx: https://github.com/nrwl/nx/tree/master/docs — consistent structure across packages with getting-started, guides, and API reference per tool
- Nx Angular plugin: https://github.com/nrwl/nx/tree/master/packages/angular/docs — Angular-specific generator and executor docs with options tables

**Java / Spring (Backend Services):**
- Spring Boot: https://github.com/spring-projects/spring-boot/tree/main/spring-boot-project — module-level README per sub-project with purpose, config properties, and usage
- Resilience4j: https://github.com/resilience4j/resilience4j/tree/master/resilience4j-docs — per-module docs with configuration tables, usage patterns, and metrics reference
- MapStruct: https://github.com/mapstruct/mapstruct/tree/main/documentation — reference guide with annotation tables, examples, and migration notes
- OpenAPI Generator: https://github.com/OpenAPITools/openapi-generator/tree/master/docs — generator-specific docs with config options tables, per-language customization

**Go (Backend Services):**
- Go kit: https://github.com/go-kit/kit — per-package README with interface contracts, middleware patterns, and transport layer docs
- Wire (DI): https://github.com/google/wire/tree/main/docs — tutorial + best practices + FAQ structure for a focused tool
- Atlas (HashiCorp): https://github.com/ariga/atlas/tree/master/doc — schema migration tool docs with CLI reference tables and concept guides

**Groovy / CI Pipelines:**
- Jenkins Shared Libraries: https://www.jenkins.io/doc/book/pipeline/shared-libraries/ — function reference, parameter tables, and usage examples per step
- Gradle: https://github.com/gradle/gradle/tree/master/platforms — per-platform docs with DSL reference and migration guides

**CLI Tools:**
- oclif: https://github.com/oclif/oclif/tree/main/docs — command reference tables, flag documentation, hook lifecycle docs
- Cobra (Go): https://github.com/spf13/cobra/tree/main/site/content — user guide + API reference separation for Go CLI tools

**General best practices (any repo type):**
- Diátaxis framework: https://diataxis.fr — the four types of documentation (tutorials, how-to, reference, explanation). Use this to classify what sections a project needs.

**How to use references:**

1. Fetch 2-3 relevant references based on repo type
2. Identify the common structural patterns across them (not content — structure)
3. Adapt to the repo's scale:
   - Small utility (1-5 files): README.md only, with overview + API + examples
   - Medium library (5-20 files): README + dedicated docs/ with 2-3 focused pages
   - Large project (20+ files): README + docs/ with architecture, API reference, guides, and troubleshooting
4. Generate docs following the adapted pattern
5. Tell the user which references informed the structure

### Level 3: Start minimal and iterate

If references aren't accessible or the repo is too unique to model from:

1. Generate a README.md for each sibling with: **overview, setup, key files, usage**
2. This becomes the seed exemplar for next time
3. Tell the user: "No documentation exemplar found in this repo and I couldn't fetch external references. I've generated minimal READMEs as a starting point. Refine one to your liking, then re-run this command — I'll use it as the model for the rest."

---

## Quality Checklist

Before finishing:

- [ ] Generated docs match exemplar's file naming and structure
- [ ] All referenced file paths exist in the target
- [ ] All TypeScript types/interfaces match actual source
- [ ] Tables are properly formatted
- [ ] ASCII diagrams render correctly
- [ ] No placeholder text remains (TBD, TODO)
- [ ] Depth is proportional to target complexity
- [ ] Existing docs were not overwritten (only appended/gap-filled)

---

## Related Commands

- `/shipmate-learn` — Deep-dive into a specific area of the codebase
- `/shipmate-verify` — Verify documentation accuracy against source
- `/shipmate-plan` — Include documentation in feature planning

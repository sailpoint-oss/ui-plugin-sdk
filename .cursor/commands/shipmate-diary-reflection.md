[Shipmate] Process learning diary entries and distill actionable improvements to rules, prompts, and workflows.

---
version: 1.0
context:
  - @README.md
  - @.shipmate/context/mission.md
  - @.shipmate/context/architecture.md
  - @.shipmate/context/coding-style.md
---
# /shipmate-digest

Process learning diary entries and distill actionable improvements to rules, prompts, and workflows.

## Purpose

This command analyzes accumulated diary entries from the self-learning hooks system and synthesizes them into concrete improvements for Shipmate's configuration.

## Trigger

```
/shipmate-digest [options]
```

## Options

- `--period <value>` - Time period to analyze: `day`, `week`, `month`, `all` (default: `week`)
- `--focus <category>` - Focus on specific category: `corrections`, `errors`, `completions`, `all`
- `--dry-run` - Show proposed changes without applying them
- `--verbose` - Show detailed analysis

## Workflow

### Phase 1: Collection

1. Read all diary entries from `~/.shipmate/diary/entries/`
2. Filter by time period and category
3. Parse and validate entry structure
4. Group entries by type and category

### Phase 2: Pattern Analysis

For each entry type, identify patterns:

**Corrections Analysis:**
- What user expectations were misunderstood?
- What instructions were misinterpreted?
- What common correction phrases appeared?
- What tasks led to user frustration?

**Error Analysis:**
- What error types recurred most frequently?
- What tools caused the most errors?
- What recovery strategies worked?
- What errors could have been prevented?

**Completion Analysis:**
- What tool combinations worked well?
- What patterns led to successful outcomes?
- What file types were handled efficiently?
- What complexity levels were managed well?

### Phase 3: Insight Synthesis

Generate insights in these categories:

```yaml
understanding_gaps:
  - "Users expected X but agent did Y"
  - "Phrase 'do it quickly' was misinterpreted as..."

execution_patterns:
  - "Bash commands with quotes frequently failed"
  - "Multi-file edits succeeded with sequential approach"

communication_improvements:
  - "Ask for clarification when user says 'fix it'"
  - "Confirm understanding before large changes"

workflow_optimizations:
  - "Run tests after every file edit in TDD mode"
  - "Check file exists before attempting edit"

tooling_lessons:
  - "Use Read before Edit to avoid context issues"
  - "Prefer Glob over Bash find for file discovery"
```

### Phase 4: Improvement Generation

Generate concrete updates:

**Rules Updates** (`~/.shipmate/improvements/rules-updates.json`):
```json
{
  "timestamp": "2025-12-05T10:00:00Z",
  "updates": [
    {
      "type": "rule_addition",
      "category": "understanding",
      "rule": "When user says 'fix it' without specifics, ask: 'What specific behavior should I fix?'",
      "evidence": ["correction-abc123", "correction-def456"],
      "confidence": 0.85
    }
  ]
}
```

**Prompt Improvements** (`~/.shipmate/improvements/prompt-updates.json`):
```json
{
  "timestamp": "2025-12-05T10:00:00Z",
  "updates": [
    {
      "type": "prompt_enhancement",
      "target": "pre_implementation",
      "addition": "Before making changes, verify the user's intent by restating the goal",
      "evidence": ["correction-ghi789"],
      "confidence": 0.75
    }
  ]
}
```

**Workflow Updates** (`~/.shipmate/improvements/workflow-updates.json`):
```json
{
  "timestamp": "2025-12-05T10:00:00Z",
  "updates": [
    {
      "type": "workflow_optimization",
      "workflow": "file_editing",
      "improvement": "Always use Read tool before Edit to ensure context is fresh",
      "evidence": ["error-jkl012", "error-mno345"],
      "confidence": 0.90
    }
  ]
}
```

### Phase 5: Application

Apply improvements:

1. **Review Mode** (default): Present proposed changes for approval
2. **Auto-Apply Mode** (`--apply`): Apply high-confidence changes automatically
3. **Export Mode** (`--export`): Export as CLAUDE.md additions

## Output Format

```markdown
# Shipmate Digest - Week of 2025-12-01

## Summary
- **Entries Analyzed**: 47
- **Corrections Detected**: 12
- **Errors Tracked**: 23
- **Completions Logged**: 12

## Key Insights

### Understanding Gaps (3 patterns)
1. **Ambiguous 'fix' commands** (5 occurrences)
   - Users said "fix it" expecting specific behavior
   - Recommendation: Ask clarifying questions

2. **Path interpretation** (3 occurrences)
   - Relative vs absolute path confusion
   - Recommendation: Always confirm file paths

### Recurring Errors (2 patterns)
1. **Permission denied on scripts** (4 occurrences)
   - Scripts created without execute permission
   - Recommendation: Add `chmod +x` after script creation

2. **Module not found** (3 occurrences)
   - Attempted to use uninstalled packages
   - Recommendation: Check package.json before imports

### Successful Patterns (2 patterns)
1. **Test-first approach** (8 successes)
   - Writing tests before implementation
   - Maintain this pattern

2. **Incremental file edits** (6 successes)
   - Small, focused edits vs large rewrites
   - Maintain this pattern

## Proposed Improvements

### Rules Additions
```
[HIGH CONFIDENCE - 0.90]
Rule: After creating a shell script, always run chmod +x
Evidence: 4 error entries

[MEDIUM CONFIDENCE - 0.75]
Rule: When user says "fix" without context, ask for specifics
Evidence: 5 correction entries
```

### Workflow Updates
```
[HIGH CONFIDENCE - 0.85]
Workflow: file_editing
Update: Add validation step - Read before Edit
Evidence: 3 error entries
```

## Actions

- [ ] Apply high-confidence rules (2 items)
- [ ] Review medium-confidence rules (1 item)
- [ ] Archive processed entries
```

## Integration

### With CLAUDE.md

Digest can append rules to user's CLAUDE.md:

```markdown
## Learned Rules (Auto-Generated)

### Understanding
- Ask for clarification when "fix" is used without specifics

### Execution
- Run chmod +x after creating shell scripts
- Use Read before Edit for existing files

### Communication
- Confirm file paths before operations
```

### With Hooks

After digest, hooks are updated to track improvement effectiveness:
- Was the new rule followed?
- Did the improvement reduce errors?
- Is user satisfaction improved?

## Scheduling

Recommended schedule:
- **Daily**: Quick summary of new entries
- **Weekly**: Full digest with pattern analysis
- **Monthly**: Deep analysis with trend tracking

## Example Usage

```bash
# Weekly digest (default)
/shipmate-digest

# Last month with verbose output
/shipmate-digest --period month --verbose

# Focus on corrections only, dry run
/shipmate-digest --focus corrections --dry-run

# Auto-apply high-confidence improvements
/shipmate-digest --apply --min-confidence 0.85
```

## Related

- [Self-Learning Hooks](../../hooks/self-learning-hooks.md)
- [detect-correction.py](../../hooks/detect-correction.py)
- [completion-reflection.py](../../hooks/completion-reflection.py)
- [track-errors.py](../../hooks/track-errors.py)

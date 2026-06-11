# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## Adding a changeset

When your PR includes a change that should appear in the changelog or trigger a version bump, run:

```bash
pnpm changeset
```

Follow the prompts to select the semver bump type (patch, minor, major) and describe the change. This creates a markdown file in `.changeset/` that gets consumed during the release process.

Not every PR needs a changeset — skip it for internal changes like CI config, docs, or test-only updates.

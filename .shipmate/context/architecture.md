# Architecture

## Current State

The repository is in its initial scaffolding phase. No source code, build system, or module structure has been established yet.

## Intended Shape

Based on the project name (`ui-plugin-sdk`) and team assignment (`frontend`), this is expected to be a **library/SDK** that:

- Defines a plugin interface or contract for UI extensions
- Provides utilities, types, or base classes for plugin authors
- Ships as a consumable package (npm or similar)

## Key Decisions Pending

- **Language & framework**: No `package.json`, `tsconfig.json`, or framework configuration exists yet. The standards reference Angular patterns (the user rule mentions `npx ng test`), but no framework has been committed.
- **Build tooling**: No bundler or compiler configuration is present.
- **Module boundaries**: No `src/` directory or entry points have been defined.
- **Package distribution**: Publishing target (npm registry, internal registry, monorepo package) is undecided.

## Directory Layout

```
ui-plugin-sdk/
├── .cursor/          # Cursor IDE configuration and Shipmate skills
├── .shipmate/        # Shipmate standards and context
├── README.md         # Placeholder (title only)
├── shipmate.json     # Project contract
└── .gitignore        # Shipmate-specific ignores
```

No `src/`, `lib/`, `dist/`, or `test/` directories exist yet.

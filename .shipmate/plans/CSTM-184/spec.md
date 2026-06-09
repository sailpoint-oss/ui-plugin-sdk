# Specification: SDK Repository Skeleton & Workspace Initialization

**Status:** Implemented
**Created:** 2026-06-09
**Plan:** [plan.md](./plan.md)
**Jira:** [CSTM-184](https://sailpoint.atlassian.net/browse/CSTM-184)

---

## Feature Overview

Establish the `ui-plugin-sdk` repository as a pnpm workspace monorepo with two package skeletons (`@sailpoint/plugin-cli` and `@sailpoint/ui-plugin-sdk`), shared TypeScript/ESLint/Prettier/Jest configuration, and Conventional Commits enforcement. This is the foundational ticket that every other story in the CSTM-183 Epic depends on.

**Problem Statement:**
The UI Plugin SDK needs a dedicated, independent repository with a well-structured monorepo layout so that developers can immediately begin implementing the runtime library and CLI tooling, completely independent of `saas-ui-monorepo`.

**Key Requirements:**
- pnpm workspace with `packages/*` glob and two package skeletons
- Dual-environment TypeScript (Node.js for CLI, browser/ESM for runtime)
- ESLint (flat config), Prettier, and Jest configured and passing
- Conventional Commits enforcement via commitlint
- MIT license

---

## Technical Requirements

### Functional Requirements

| ID | Requirement | Technical Approach |
|----|-------------|-------------------|
| FR-1 | Root `package.json` as pnpm workspace | `"private": true`, `"type": "module"`, `"engines": {"node": ">=22"}`, `"packageManager": "pnpm@9.x"` |
| FR-2 | `pnpm-workspace.yaml` | Single entry: `packages: ['packages/*']` |
| FR-3 | `@sailpoint/plugin-cli` skeleton | `packages/plugin-cli/` with package.json, tsconfig.json, src/index.ts, \_\_tests\_\_/index.spec.ts |
| FR-4 | `@sailpoint/ui-plugin-sdk` skeleton | `packages/ui-plugin-sdk/` with same structure, browser-targeted tsconfig |
| FR-5 | Shared TypeScript base config | `tsconfig.base.json` at root; per-package configs extend it |
| FR-6 | ESLint (flat config) | `eslint.config.mjs` at root — adapted from saas-sp-renderer, no NestJS, Prettier owns indent |
| FR-7 | Prettier config | `.prettierrc.cjs` at root — matching saas-sp-renderer with updated import order |
| FR-8 | Jest with ts-jest (CJS transform) | Root `jest.config.ts` with `projects` array; per-package configs |
| FR-9 | Workspace scripts | `lint`, `format`, `format:check`, `test`, `typecheck` in root package.json |
| FR-10 | `.gitignore` | Comprehensive ignore for node_modules, dist, coverage, editor, OS files |
| FR-11 | Node 22 LTS pin | `.nvmrc` with `22`, plus `engines` field in root package.json |
| FR-12 | Inter-package deps | Workspace protocol (`"workspace:*"`) for cross-package references |
| FR-13 | MIT LICENSE | Standard MIT license text at repo root |
| FR-14 | commitlint | `commitlint.config.cjs` with `@commitlint/config-conventional` — no git hooks yet (CI enforcement in CSTM-185) |

### Non-Functional Requirements

| Category | Requirement | Implementation |
|----------|-------------|----------------|
| Consistency | Match saas-sp-renderer formatting output | Identical Prettier settings (tabs, 4-wide, single quotes, no trailing comma) |
| Developer Experience | Single `pnpm install` sets up everything | All devDependencies at root; workspace protocol for cross-refs |
| Performance | Fast installs | pnpm 9 with content-addressable store and strict isolation |
| Extensibility | Future packages need zero config changes | `packages/*` glob auto-discovers new packages |

---

## Implementation Details

### Final Directory Tree

```
ui-plugin-sdk/
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.cjs
├── LICENSE
├── README.md
├── commitlint.config.cjs
├── eslint.config.mjs
├── jest.config.ts
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── packages/
    ├── plugin-cli/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── jest.config.ts
    │   ├── src/
    │   │   └── index.ts
    │   └── __tests__/
    │       └── index.spec.ts
    └── ui-plugin-sdk/
        ├── package.json
        ├── tsconfig.json
        ├── jest.config.ts
        ├── src/
        │   └── index.ts
        └── __tests__/
            └── index.spec.ts
```

---

### Root Files — Exact Specifications

#### `package.json`

```json
{
    "name": "ui-plugin-sdk",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "description": "SailPoint UI Plugin SDK — runtime library and CLI tooling for ISC UI plugin development",
    "license": "MIT",
    "engines": {
        "node": ">=22"
    },
    "packageManager": "pnpm@9.15.4",
    "scripts": {
        "lint": "eslint 'packages/*/src/**/*.ts' 'packages/*/__tests__/**/*.ts'",
        "lint:fix": "eslint --fix 'packages/*/src/**/*.ts' 'packages/*/__tests__/**/*.ts'",
        "format": "prettier --write 'packages/*/src/**/*.ts' 'packages/*/__tests__/**/*.ts'",
        "format:check": "prettier --check 'packages/*/src/**/*.ts' 'packages/*/__tests__/**/*.ts'",
        "test": "jest",
        "typecheck": "tsc --build packages/plugin-cli/tsconfig.json packages/ui-plugin-sdk/tsconfig.json --noEmit"
    },
    "devDependencies": {
        "@commitlint/cli": "latest",
        "@commitlint/config-conventional": "latest",
        "@trivago/prettier-plugin-sort-imports": "latest",
        "@types/jest": "latest",
        "@typescript-eslint/eslint-plugin": "latest",
        "@typescript-eslint/parser": "latest",
        "eslint": "latest",
        "eslint-config-prettier": "latest",
        "eslint-config-standard": "latest",
        "eslint-plugin-import": "latest",
        "eslint-plugin-jest": "latest",
        "eslint-plugin-n": "latest",
        "eslint-plugin-prettier": "latest",
        "eslint-plugin-promise": "latest",
        "jest": "latest",
        "prettier": "latest",
        "ts-jest": "latest",
        "typescript": "latest"
    }
}
```

> **Note:** `"latest"` is a placeholder. At implementation time, run `pnpm add -D <package>` to resolve actual latest versions into `pnpm-lock.yaml`. The `packageManager` field should use the exact pnpm version installed (verify with `pnpm --version`).

#### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

#### `tsconfig.base.json`

```json
{
    "compilerOptions": {
        "strict": true,
        "esModuleInterop": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "newLine": "lf",
        "outDir": "dist",
        "rootDir": "src"
    }
}
```

This base config is **never used directly** — each package extends it and adds its own `target`, `module`, `lib`, and `moduleResolution`.

#### `eslint.config.mjs`

Flat config adapted from `saas-sp-renderer`. Key adaptations:
- **Removed:** `plugin:nestjs/recommended`, `nestjs` plugin
- **Removed:** `@typescript-eslint/indent` (Prettier owns indentation)
- **Format:** Modern flat config (`eslint.config.mjs`) instead of legacy `.eslintrc.js`
- **Environment:** Base config does not set `node` or `browser` — these are scoped via file pattern overrides

```javascript
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import jestPlugin from 'eslint-plugin-jest';

export default [
    {
        ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
    },
    {
        files: ['packages/*/src/**/*.ts', 'packages/*/__tests__/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                sourceType: 'module'
            },
            globals: {
                console: 'readonly',
                process: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescriptPlugin,
            prettier: eslintPluginPrettier,
            jest: jestPlugin
        },
        rules: {
            // Prettier integration
            'prettier/prettier': ['error', { endOfLine: 'auto' }],

            // TypeScript rules (from saas-sp-renderer, minus indent)
            '@typescript-eslint/consistent-type-definitions': 'error',
            '@typescript-eslint/dot-notation': 'off',
            '@typescript-eslint/explicit-member-accessibility': [
                'off',
                { accessibility: 'explicit' }
            ],
            '@typescript-eslint/member-delimiter-style': [
                'error',
                {
                    multiline: { delimiter: 'semi', requireLast: true },
                    singleline: { delimiter: 'semi', requireLast: false }
                }
            ],
            '@typescript-eslint/member-ordering': 'off',
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: 'typeLike', format: ['PascalCase'] }
            ],
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-empty-interface': 'error',
            '@typescript-eslint/no-inferrable-types': 'error',
            '@typescript-eslint/no-misused-new': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-shadow': ['error'],
            '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
            '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
            '@typescript-eslint/no-use-before-define': 'error',
            '@typescript-eslint/prefer-function-type': 'error',
            '@typescript-eslint/quotes': ['error', 'single'],
            '@typescript-eslint/semi': ['error', 'always'],
            '@typescript-eslint/type-annotation-spacing': 'error',
            '@typescript-eslint/unified-signatures': 'error',

            // Jest rules
            'jest/no-focused-tests': 'error',

            // General rules (from saas-sp-renderer)
            'arrow-body-style': 'off',
            'brace-style': ['error', '1tbs'],
            camelcase: 'off',
            curly: 'error',
            'dot-notation': 'off',
            'eol-last': 'error',
            eqeqeq: ['error', 'smart'],
            'guard-for-in': 'error',
            'no-bitwise': 'error',
            'no-caller': 'error',
            'no-console': 'error',
            'no-debugger': 'error',
            'no-empty': 'off',
            'no-empty-function': 'off',
            'no-eval': 'error',
            'no-fallthrough': 'error',
            'no-new-wrappers': 'error',
            'no-redeclare': 'error',
            'no-restricted-imports': 'error',
            'no-shadow': 'off',
            'no-throw-literal': 'error',
            'no-tabs': ['error', { allowIndentationTabs: true }],
            'no-trailing-spaces': 'error',
            'no-undef-init': 'error',
            'no-underscore-dangle': 'off',
            'no-unused-labels': 'error',
            'no-useless-constructor': 'off',
            'no-var': 'error',
            'padded-blocks': 'off',
            'prefer-const': 'error',
            quotes: [2, 'single', { avoidEscape: true }],
            radix: 'error',
            semi: ['error', 'always'],
            'space-before-function-paren': 'off',
            'spaced-comment': ['error', 'always', { markers: ['/'] }],
            'max-len': ['error', { code: 256 }]
        }
    },
    // CLI package: Node.js environment
    {
        files: ['packages/plugin-cli/**/*.ts'],
        languageOptions: {
            globals: {
                __dirname: 'readonly',
                __filename: 'readonly',
                Buffer: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly'
            }
        }
    },
    // Runtime package: Browser environment
    {
        files: ['packages/ui-plugin-sdk/**/*.ts'],
        languageOptions: {
            globals: {
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                MessageEvent: 'readonly',
                CustomEvent: 'readonly',
                HTMLElement: 'readonly',
                addEventListener: 'readonly',
                removeEventListener: 'readonly',
                postMessage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                console: 'readonly'
            }
        }
    },
    // Spec file overrides (relaxed rules for tests)
    {
        files: ['packages/*/__tests__/**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { vars: 'local', args: 'none' }]
        }
    },
    // Apply prettier config last to override conflicting rules
    eslintConfigPrettier
];
```

#### `.prettierrc.cjs`

```javascript
module.exports = {
    plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],
    printWidth: 120,
    tabWidth: 4,
    useTabs: true,
    bracketSpacing: true,
    quoteProps: 'as-needed',
    singleQuote: true,
    arrowParens: 'avoid',
    trailingComma: 'none',
    endOfLine: 'auto',
    importOrder: ['^@sailpoint/(.*)$', '<THIRD_PARTY_MODULES>', '^[./]'],
    importOrderSeparation: true,
    importOrderParserPlugins: ['typescript', 'decorators-legacy'],
    jsxSingleQuote: true
};
```

#### `.prettierignore`

```
node_modules
dist
coverage
pnpm-lock.yaml
*.md
```

#### `jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
    projects: ['<rootDir>/packages/*']
};

export default config;
```

#### `commitlint.config.cjs`

```javascript
module.exports = {
    extends: ['@commitlint/config-conventional']
};
```

#### `.nvmrc`

```
22
```

#### `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = tab
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.yaml]
indent_style = space
indent_size = 2

[*.yml]
indent_style = space
indent_size = 2
```

#### `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Test coverage
coverage/

# Cache
.turbo/
*.tsbuildinfo

# Editor
.vscode/
!.vscode/settings.json
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Shipmate
.shipmate-backup-*
.shipmate/tmp/
.shipmate/logs/
```

#### `LICENSE`

```
MIT License

Copyright (c) 2026 SailPoint Technologies, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

#### `README.md`

```markdown
# ui-plugin-sdk

SailPoint UI Plugin SDK — runtime library and CLI tooling for building UI plugins for Identity Security Cloud (ISC).

## Packages

| Package | Description |
|---------|-------------|
| [`@sailpoint/ui-plugin-sdk`](./packages/ui-plugin-sdk) | Browser runtime library for UI plugins |
| [`@sailpoint/plugin-cli`](./packages/plugin-cli) | CLI tool for plugin development workflow |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) 9.x (`corepack enable && corepack prepare`)

### Setup

```bash
pnpm install
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run lint` | Run ESLint across all packages |
| `pnpm run lint:fix` | Run ESLint with auto-fix |
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Check formatting without writing |
| `pnpm run test` | Run Jest tests across all packages |
| `pnpm run typecheck` | TypeScript type checking (no emit) |

## License

[MIT](./LICENSE)
```

---

### Package: `@sailpoint/plugin-cli`

#### `packages/plugin-cli/package.json`

```json
{
    "name": "@sailpoint/plugin-cli",
    "version": "0.0.0",
    "description": "CLI tool for SailPoint UI plugin development workflow",
    "type": "module",
    "license": "MIT",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        }
    },
    "files": [
        "dist"
    ],
    "scripts": {
        "build": "tsc",
        "typecheck": "tsc --noEmit"
    }
}
```

#### `packages/plugin-cli/tsconfig.json`

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "target": "ES2023",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "lib": ["ES2023"],
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": ["src"]
}
```

#### `packages/plugin-cli/jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
    displayName: 'plugin-cli',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: false,
                tsconfig: 'tsconfig.json'
            }
        ]
    },
    testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'json']
};

export default config;
```

#### `packages/plugin-cli/src/index.ts`

```typescript
export const VERSION = '0.0.0';
```

#### `packages/plugin-cli/__tests__/index.spec.ts`

```typescript
import { VERSION } from '../src/index';

describe('@sailpoint/plugin-cli', () => {
    it('should export VERSION', () => {
        expect(VERSION).toBe('0.0.0');
    });
});
```

---

### Package: `@sailpoint/ui-plugin-sdk`

#### `packages/ui-plugin-sdk/package.json`

```json
{
    "name": "@sailpoint/ui-plugin-sdk",
    "version": "0.0.0",
    "description": "Browser runtime library for SailPoint ISC UI plugins",
    "type": "module",
    "license": "MIT",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        }
    },
    "files": [
        "dist"
    ],
    "scripts": {
        "build": "tsc",
        "typecheck": "tsc --noEmit"
    }
}
```

#### `packages/ui-plugin-sdk/tsconfig.json`

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "target": "ES2022",
        "module": "ES2022",
        "moduleResolution": "Bundler",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": ["src"]
}
```

#### `packages/ui-plugin-sdk/jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
    displayName: 'ui-plugin-sdk',
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: false,
                tsconfig: 'tsconfig.json'
            }
        ]
    },
    testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'json']
};

export default config;
```

> **Note:** `jest-environment-jsdom` must be added as a devDependency at root for the `jsdom` test environment.

#### `packages/ui-plugin-sdk/src/index.ts`

```typescript
export const VERSION = '0.0.0';
```

#### `packages/ui-plugin-sdk/__tests__/index.spec.ts`

```typescript
import { VERSION } from '../src/index';

describe('@sailpoint/ui-plugin-sdk', () => {
    it('should export VERSION', () => {
        expect(VERSION).toBe('0.0.0');
    });
});
```

---

## Testing Strategy

### Unit Tests

| Area | Coverage Target | Key Test Cases |
|------|-----------------|----------------|
| `@sailpoint/plugin-cli` | Placeholder (1 test) | Verify entry point exports |
| `@sailpoint/ui-plugin-sdk` | Placeholder (1 test) | Verify entry point exports |

Future tickets (CSTM-186 through CSTM-197) will add substantial test coverage. This ticket establishes that the test infrastructure works.

### Verification Script

After implementation, run this sequence to verify all acceptance criteria:

```bash
# AC-1: Workspace installs and packages are recognized
pnpm install
pnpm ls --depth 0 -r

# AC-2: Linting passes
pnpm run lint

# AC-3: Tests pass
pnpm run test

# AC-4: Formatting passes
pnpm run format:check

# AC-5 + AC-6 + AC-7: TypeScript compilation
pnpm run typecheck

# AC-8: Verify workspace glob (no root config change needed for new packages)
cat pnpm-workspace.yaml
```

---

## Security Considerations

### Authentication & Authorization
- Not applicable — this ticket is pure infrastructure scaffolding

### Data Protection
- No sensitive data handled
- `.gitignore` excludes `.env` files to prevent accidental secret commits

### Input Validation
- Not applicable — no runtime code

### Dependency Security
- Use `pnpm audit` after initial install to verify no known vulnerabilities in devDependencies
- pnpm's strict isolation prevents phantom dependencies

---

## Performance Considerations

### Install Performance
- pnpm's content-addressable store avoids redundant downloads across packages
- `pnpm install` should complete in < 30 seconds on a warm store

### CI Considerations (CSTM-185)
- The `pnpm-lock.yaml` enables deterministic installs in CI
- `--frozen-lockfile` flag should be used in CI (documented for CSTM-185)

---

## Feature Flag Strategy

**Project Policy Mode:** `strong`
**Decision from Plan:** No flag needed
**Rationale:** Pure repository scaffolding — config files and empty package skeletons. No customer-facing behavior. Falls under CI/CD and build configuration exemption.
**Label:** `feature-flag-exempt`

---

## Migration/Deployment Notes

### No Database Migrations
This is a greenfield repository scaffold — no databases involved.

### Deployment
This ticket does not deploy anything. The scaffold is committed to `main`. CI/CD setup is deferred to CSTM-185.

### Recommended Commit Sequence

The implementation can be done in a single commit or broken into logical commits:

1. **Root configuration:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.cjs`, `jest.config.ts`, `commitlint.config.cjs`, `.editorconfig`, `.nvmrc`, `.gitignore`, `LICENSE`, `README.md`
2. **Package skeletons:** Both packages with their `package.json`, `tsconfig.json`, `jest.config.ts`, `src/index.ts`, `__tests__/index.spec.ts`
3. **Lock file:** `pnpm install` to generate `pnpm-lock.yaml`

Alternatively, a single commit with message:
```
feat: scaffold pnpm workspace with plugin-cli and ui-plugin-sdk packages

- Configure pnpm workspace with packages/* glob
- Add @sailpoint/plugin-cli skeleton (Node.js target)
- Add @sailpoint/ui-plugin-sdk skeleton (browser ESM target)
- Set up ESLint (flat config), Prettier, Jest, TypeScript
- Add commitlint for Conventional Commits
- Add MIT license

Ref: CSTM-184
```

---

## Additional devDependency: `jest-environment-jsdom`

The `@sailpoint/ui-plugin-sdk` jest config uses `testEnvironment: 'jsdom'`. This requires:

```bash
pnpm add -D jest-environment-jsdom
```

This should be added to the root `package.json` devDependencies alongside the other Jest packages.

---

## Open Questions / Decisions Needed

All resolved during planning and spec phases. No remaining open questions.

---

## Existing Code to Leverage

### Reference Configs (saved in `context/`)

| Reference | Location | How Applied |
|-----------|----------|-------------|
| ESLint from `saas-sp-renderer` | `context/eslint-reference.js` | Adapted: removed NestJS, removed indent rule, converted to flat config |
| Prettier from `saas-sp-renderer` | `context/prettier-reference.js` | Adapted: updated importOrder for `@sailpoint/` packages |

---

## Out of Scope

The following are explicitly NOT part of this specification:
- `@sailpoint/create-plugin` package (CSTM-190)
- Design tokens package (CSTM-198)
- CI/CD pipeline (CSTM-185)
- `@changesets/cli` or automated versioning (CSTM-185)
- Git hooks (husky/simple-git-hooks) — commitlint enforcement will be via CI
- Any runtime library code (CSTM-186 through CSTM-189)
- Any CLI command implementation (CSTM-191 through CSTM-196)

---

## Clarifying Questions & Answers

### Technical Design Questions

**Q1:** Initial package versions?
**A1:** `0.0.0` — pre-release, nothing published yet

**Q2:** ESLint config format?
**A2:** Modern flat config (`eslint.config.mjs`) — forward-looking

**Q3:** Jest + ESM strategy?
**A3:** ts-jest with CJS transform (stable, proven)

**Q4:** pnpm version?
**A4:** pnpm 9 (current stable)

**Q5:** Git hooks for commitlint?
**A5:** No hooks — just the commitlint config, enforcement via CI later (CSTM-185)

**Q6:** Pre-commit lint-staged?
**A6:** No — devs run format manually

---

## Next Steps

1. Review this specification
2. Implement the skeleton — all file contents are specified above
3. Run the verification script to confirm all acceptance criteria pass
4. Commit and push to `main`

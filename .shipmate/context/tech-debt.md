# Tech Debt

## Current Debt

No technical debt exists — the project has no source code yet.

## Scaffolding Gaps

The following foundational items are missing and should be addressed before or during initial development:

| Gap | Priority | Notes |
|-----|----------|-------|
| No `package.json` | High | Required to define dependencies, scripts, and package metadata |
| No build configuration | High | No `tsconfig.json`, bundler config, or build pipeline |
| No linter/formatter | Medium | No ESLint, Prettier, or equivalent configured |
| No test infrastructure | Medium | No test runner, test utilities, or coverage configuration |
| No CI/CD pipeline | Medium | No GitHub Actions, Jenkins, or equivalent |
| No PR template | Low | No `.github/pull_request_template.md` |
| Minimal README | Low | Contains only the project title |
| No CONTRIBUTING guide | Low | No contributor onboarding documentation |

## Known Risks

- **No framework decision committed**: The tech stack choice will have cascading effects on all subsequent development. Making this decision and committing the initial scaffold early reduces rework risk.

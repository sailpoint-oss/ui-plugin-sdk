# Coding Style

## Language & Framework

> _Not yet established._ No source code, `package.json`, or configuration files exist. The user environment references Angular testing (`npx ng test`), suggesting Angular may be the intended framework.

## Patterns

No code patterns have been established. The project's `.shipmate/standards/` files define aspirational guidance:

- **Components**: Single responsibility, reusable, composable with clear interfaces
- **CSS**: Consistent methodology, minimize custom CSS, leverage design tokens
- **Accessibility**: Semantic HTML, keyboard navigation, ARIA when needed, screen reader testing
- **Responsive**: Mobile-first, standard breakpoints, fluid layouts, relative units

## Linting & Formatting

> _No linter or formatter configuration exists._ Set up ESLint, Prettier, or equivalent tooling as the first development step.

## Testing

> _No test framework configured._ The user environment suggests Angular's test runner (`npx ng test --test-path-pattern`). Configure testing infrastructure when scaffolding the project.

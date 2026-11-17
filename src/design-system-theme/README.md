# SPDS theme implementation

This directory contains the framework-neutral SailPoint Public Design System theme implementation. It applies light and dark color semantics, resolves brand colors, and writes optional branding as CSS custom properties.

## SDK integration boundary

The SDK always uses the color-scheme listener with a caller-owned callback to synchronize its effective parent/OS state before App Shell takes authority. `createSDK({ useSpds: true })` additionally applies that state to `spds-dark` and invokes the branding helper. Without `useSpds`, the SDK does not manage `spds-dark` or create `#spds-branding`.

When enabled, `applySpdsBranding()` installs both the generated `--spds-branding-*` variables and the supported PrimeNG token redirects. A missing App Shell brand still produces the compact defaults documented below.

## Public module

Import supported behavior through `public-api.ts`:

- `applySpdsColorScheme(colorScheme)` applies or removes the `spds-dark` class.
- `listenToColorSchemeChange(callback?)` reports the current `prefers-color-scheme` result, follows changes, and returns a listener disposer. Without a callback, it applies the result to `spds-dark`.
- `applySpdsBranding(brand?)` resolves a partial brand, writes `#spds-branding`, and returns a style disposer.
- `SPDS_PREFIX`, `SPDS_DARK_MODE_CLASS_NAME`, and `SPDS_DARK_MODE_SELECTOR` expose shared CSS naming constants.
- `SpdsColorScheme` and `SpdsBrandingConfig` provide the supported TypeScript contracts.

The color-scheme helpers are browser-safe. Without `window`, `document`, `document.documentElement`, or `matchMedia`, they return without changing state. The listener reports the current media-query result immediately. Its disposer removes that call's listener and is safe to call repeatedly.

## Branding input

`SpdsBrandingConfig` accepts six optional opaque hex colors:

- `actionButtonColor`
- `darkActionButtonColor`
- `activeLinkColor`
- `darkActiveLinkColor`
- `navigationColor`
- `darkNavigationColor`

Each value must be `#RGB` or `#RRGGBB`. Valid values are normalized to lowercase six-digit hex. Missing or invalid fields independently use the matching light or dark SPDS default; a missing dark value does not reuse its light value. The resolver derives lighter and darker stops by adjusting lightness by 10 percentage points.

The compact defaults are:

- Action button: light `#1d5ade`, dark `#00aaff`
- Active link: light `#1d5ade`, dark `#66cfff`
- Navigation: light `#0033a1`, dark `#66cfff`

## Generated branding variables

Branding emits 24 variables under `:root, :host`.

The 18 direct light and dark variables are:

- `--spds-branding-light-action-button-color`
- `--spds-branding-light-action-button-lighter-color`
- `--spds-branding-light-action-button-darker-color`
- `--spds-branding-light-active-link-color`
- `--spds-branding-light-active-link-lighter-color`
- `--spds-branding-light-active-link-darker-color`
- `--spds-branding-light-navigation-color`
- `--spds-branding-light-navigation-lighter-color`
- `--spds-branding-light-navigation-darker-color`
- `--spds-branding-dark-action-button-color`
- `--spds-branding-dark-action-button-lighter-color`
- `--spds-branding-dark-action-button-darker-color`
- `--spds-branding-dark-active-link-color`
- `--spds-branding-dark-active-link-lighter-color`
- `--spds-branding-dark-active-link-darker-color`
- `--spds-branding-dark-navigation-color`
- `--spds-branding-dark-navigation-lighter-color`
- `--spds-branding-dark-navigation-darker-color`

The six semantic variables use CSS `light-dark()`:

- `--spds-branding-action-button-color`
- `--spds-branding-action-button-hover-color`
- `--spds-branding-active-link-color`
- `--spds-branding-active-link-hover-color`
- `--spds-branding-navigation-color`
- `--spds-branding-navigation-hover-color`

Base semantic values select the matching light or dark base. Hover values select the darker light stop or lighter dark stop.

## PrimeNG token redirects

The style redirects 39 PrimeNG component tokens to semantic branding variables. Every redirect uses `!important` so branding wins without changing component styles:

- `button.primary.background`
- `button.primary.border.color`
- `button.primary.hover.background`
- `button.primary.hover.border.color`
- `button.primary.active.background`
- `button.primary.active.border.color`
- `button.secondary.color`
- `button.secondary.border.color`
- `button.secondary.hover.color`
- `button.secondary.hover.border.color`
- `button.secondary.active.color`
- `button.secondary.active.border.color`
- `button.text.primary.color`
- `button.outlined.primary.color`
- `button.outlined.primary.border.color`
- `button.link.color`
- `button.link.hover.color`
- `button.link.active.color`
- `togglebutton.content.checked.background`
- `tabs.active.bar.background`
- `tabs.tab.active.color`
- `tabs.tab.active.border.color`
- `tabs.tab.hover.color`
- `tabs.tab.hover.border.color`
- `panelmenu.item.focus.color`
- `panelmenu.item.icon.focus.color`
- `panelmenu.submenu.icon.focus.color`
- `breadcrumb.item.color`
- `breadcrumb.item.hover.color`
- `breadcrumb.item.icon.color`
- `breadcrumb.item.icon.hover.color`
- `stepper.step.number.active.color`
- `stepper.step.title.active.color`
- `stepper.separator.active.background`
- `menubar.item.focus.color`
- `menubar.item.active.color`
- `menubar.item.icon.focus.color`
- `menubar.item.icon.active.color`
- `menubar.submenu.icon.focus.color`

## Style lifecycle

`applySpdsBranding()` resolves defaults before checking for browser globals. In a browser, it removes any existing `#spds-branding` element and appends one replacement to `document.head`. The returned disposer removes only the element created by that call. A stale disposer therefore cannot remove a newer brand style.

Identity and image fields are not branding inputs and never enter generated CSS. Style text is assigned with `HTMLStyleElement.textContent`.

## Temporary location and removal

This subtree is a temporary home for the framework-neutral theme implementation while the standalone `@sailpoint/design-system-theme` package is not yet available to consumers. Keep changes focused on preserving its public behavior.

When the standalone package is ready:

1. Replace local `public-api.ts` imports with package imports.
2. Remove this subtree and the copied tests under `__tests__/design-system-theme/`.
3. Keep the appearance coordinator, protocol contract, public API, and testing-helper tests because they cover code that remains in this repository.
4. Run the retained tests, type checking, and package build.

---
'@sailpoint/ui-plugin-sdk': minor
---

Sync plugins with the ISC light or dark theme.

**Behavior change.** `createSDK()` now applies the host theme to the plugin
document by default: it toggles the SailPoint Design System `spds-dark` class on
`document.documentElement` and sets its `color-scheme` to `light` or `dark`.
Plugins without dark styles should pass `applyTheme: false`, because
`color-scheme: dark` also switches the browser's default text, background, and
form control colors.

- The theme is applied synchronously in `createSDK()`, before the handshake, so
  the first paint matches, and then follows every theme switch. It comes from
  the frame's `prefers-color-scheme`, which tracks the `color-scheme` App Shell
  sets on its root. Where `window.matchMedia` is unavailable (jsdom, server-side
  rendering) the SDK reports `'light'` and does not throw.
- New `applyTheme` config: `false` to opt out, or `{ darkClass, root }` to change
  the class and element.
- New `sdk.theme.getColorScheme()` and `sdk.events.onThemeChange(callback)`. The
  callback receives `{ colorScheme }` and fires only when the scheme changes; the
  call returns an unsubscribe function. Both work with `applyTheme: false`.
- New public exports: `ColorScheme`, `ThemeContext`, `ApplyThemeOptions`.
- `mockSdkContext` answers `(prefers-color-scheme: dark)` while installed. New
  `colorScheme` option (default `'light'`) and `emitThemeChange()` on the handle.
  Other media queries go to the original `window.matchMedia`, or never match
  when there is none. `restore()` puts the original back.

This replaces hand-written `prefers-color-scheme` listeners that toggle
`spds-dark`. Existing plugins can follow `skills/adopting-theme-sync/SKILL.md`
to remove old theme code and pick the right setting.

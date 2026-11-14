---
name: adopting-theme-sync
description: Use when updating an existing SailPoint UI plugin to the SDK's built-in theme sync, or when a plugin looks wrong in ISC dark or light mode. Covers removing hand-written theme code, choosing between design-system styles and `applyTheme: false`, redrawing charts and canvases on theme changes, and testing both modes. Use it after upgrading `@sailpoint/ui-plugin-sdk`, when a plugin has its own theme toggle or `prefers-color-scheme` listener, or when text becomes unreadable in one mode.
---

# Adopting built-in theme sync

`createSDK()` now follows the ISC theme by default. Before the handshake it sets `color-scheme` on `document.documentElement` and toggles the SailPoint Design System `spds-dark` class, then keeps both in step as the user switches themes. Plugins written before this often carry their own theme code, which now fights the SDK or never matched ISC in the first place. Work through the steps in order.

## 1. Upgrade and find the old theme code

Upgrade `@sailpoint/ui-plugin-sdk` to the release that includes theme sync (see the changelog). Then search the plugin for:

- `prefers-color-scheme` and `matchMedia(`
- `spds-dark` or any other dark class you add or remove
- `colorScheme` and `color-scheme` set from script
- theme keys in `localStorage` or `sessionStorage`
- buttons or menus that switch the theme

## 2. Remove what the SDK now does

Delete script that toggles the dark class, sets `color-scheme`, or listens to `prefers-color-scheme` for that purpose. Two writers on the same element cause flicker and can leave the plugin in the wrong mode.

Remove in-plugin theme toggles and stored theme preferences. ISC owns the theme; a separate switch inside the plugin drifts from it, and the stored value keeps overriding ISC after the user changes modes.

Keep exactly one `createSDK()` call. In the Angular starter that lives in `SailpointPluginService`.

## 3. Decide how the plugin gets dark styles

| The plugin uses | Do this |
|---|---|
| The SailPoint Design System preset (the Angular starter's PrimeNG theme) | Nothing more. The preset already keys its dark tokens off `.spds-dark`. |
| Its own CSS with a different dark class | Pass `createSDK({ applyTheme: { darkClass: 'your-dark-class' } })`, or move those rules under `.spds-dark`. |
| Its own CSS written with `@media (prefers-color-scheme: dark)` | It keeps working, since the media query tracks the ISC theme. Remove only the script from step 2. |
| No dark styles, and no time to add them | Pass `createSDK({ applyTheme: false })`. `color-scheme: dark` also switches the browser's default text, background, and form-control colors, so hard-coded light backgrounds end up with light text on them. |

## 4. Replace hard-coded colors

Swap literal colors for the design system's semantic variables so one stylesheet serves both modes: `--spds-content-background`, `--spds-content-hover-background`, `--spds-content-border-color`, `--spds-text-color`, `--spds-text-muted-color`, `--spds-primary-color`, `--spds-highlight-background`. Don't use `--spds-surface-50` or `--spds-surface-100` as backgrounds; in the dark scheme they are light colors.

## 5. Redraw anything you paint yourself

Canvas, WebGL, chart libraries, and SVG with fixed fills don't respond to CSS classes. Read the scheme once and subscribe to changes:

```ts
const sdk = createSDK();

chart.setTheme(sdk.theme.getColorScheme());
const unsubscribe = sdk.events.onThemeChange(({ colorScheme }) => chart.setTheme(colorScheme));
// call unsubscribe() when the chart is destroyed
```

Both work with `applyTheme: false`, so a plugin that opts out of document styling can still theme its own drawings.

## 6. Test both modes

- Unit tests: `mockSdkContext({ colorScheme: 'dark' })` starts in dark mode, and `handle.emitThemeChange('light')` switches it. Assert the dark class, and that charts or canvases redraw.
- In the tenant: switch ISC between light and dark with the plugin open and confirm it follows without a reload.

## Symptoms and fixes

| Symptom after upgrading | Cause and fix |
|---|---|
| Light text on a light background in dark mode | The plugin has no dark styles. Add them (steps 3 and 4) or pass `applyTheme: false`. |
| The theme flickers or flips twice | Leftover script still toggles the class or `color-scheme`. Finish step 2. |
| The plugin ignores ISC and keeps an old choice | A stored theme preference overrides the SDK. Remove it. |
| A chart or canvas keeps the old colors | It isn't subscribed to `onThemeChange`. See step 5. |
| The plugin stays dark while ISC is light | ISC hasn't set `color-scheme: light` on its root yet, so the frame falls back to the user's OS setting. It resolves once App Shell declares light mode explicitly. |

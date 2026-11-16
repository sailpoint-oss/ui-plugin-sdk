---
name: adopting-theme-sync
description: Migrates a UI plugin from hand-written color-scheme synchronization to the UI plugin SDK appearance APIs. Use when removing prefers-color-scheme listeners, App Shell theme messages, SPDS class handling, or plugin-owned tenant branding.
---

# Adopt SDK theme synchronization

Use the SDK as the only App Shell appearance transport. Keep plugin code responsible only for rendering work that CSS cannot perform.

## Migration

1. Create the SDK with `useSpds: true` when the plugin uses the `spds-dark` class, generated SPDS branding variables, or branded PrimeNG token redirects:

   ```typescript
   const sdk = createSDK({ useSpds: true });
   ```

   Omit `useSpds` when the plugin needs theme synchronization and raw brand context but does not use SPDS DOM effects. The SDK still follows the parent/OS scheme, accepts App Shell takeover, and writes the effective value to `document.documentElement.style.colorScheme`.

2. Remove plugin-owned code that:
   - reads or listens to `prefers-color-scheme`
   - adds or removes `spds-dark`
   - writes root `color-scheme`
   - listens for raw App Shell appearance messages
   - creates tenant-brand CSS variables

3. Read current host state synchronously:

   ```typescript
   const colorScheme = sdk.theme.getColorScheme();
   ```

   `getColorScheme()` starts with the effective parent/OS preference when `matchMedia` is available. A valid App Shell value becomes authoritative.

4. Subscribe only for imperative rendering such as charts or canvases:

   ```typescript
   const unsubscribe = sdk.events.onThemeChange(({ colorScheme }) => {
	   chart.setTheme(colorScheme);
   });
   ```

   CSS-driven components should use SPDS variables and need no callback.

5. Read raw initialization-only brand values from context:

   ```typescript
   const { brand } = await sdk.getContext();
   document.title = brand?.productName ?? document.title;
   const lightLogoUrl = brand?.logoUrl;
   const actionButtonColor = brand?.actionButtonColor;
   ```

   The SDK preserves accepted App Shell values unchanged. With `useSpds: true`, the theme implementation handles color validation, fallback, derivation, CSS variables, and PrimeNG token redirects. Without `useSpds`, branding is available only through the raw context. Do not generate CSS from product or logo values. Let the browser's Content Security Policy control logo loading.

6. Dispose the callback with its owner:

   ```typescript
   unsubscribe();
   ```

## Verification

- Without `useSpds`, parent/OS and host values update root `color-scheme` and the theme APIs without changing `spds-dark` or creating `#spds-branding`.
- Before a host scheme arrives, every SDK instance follows the parent scheme where browser iframe inheritance is supported, then the operating-system or browser preference.
- With `useSpds: true`, that effective scheme also controls `spds-dark`.
- The first valid host scheme takes authority; later fallback changes have no effect.
- Fallback and host changes update the getter and imperative subscribers.
- With `useSpds: true`, missing or invalid brand colors use SPDS defaults independently and the generated style redirects the supported PrimeNG tokens.
- Brand context exposes only the projected raw App Shell fields.
- Repeated values do not trigger duplicate callbacks.

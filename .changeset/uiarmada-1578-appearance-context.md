---
'@sailpoint/ui-plugin-sdk': minor
---

Add App Shell color-scheme synchronization and public tenant branding to the UI plugin SDK.

- Every SDK instance begins with the parent App Shell color scheme when the browser propagates it into the iframe, falling back to the operating-system or browser preference. The effective value updates root `color-scheme`, `sdk.theme.getColorScheme()`, and theme subscribers. Root synchronization defaults to on and can be disabled with `createSDK({ syncColorScheme: false })` without disabling theme state or events.
- A valid initial App Shell value or later COIP update becomes authoritative and stops the fallback listener. Plugins should remove competing theme listeners and root `color-scheme` writes.
- `PluginContext.brand` exposes the nine raw supported App Shell fields: six base colors, `productName`, `logoUrl`, and `darkLogoUrl`. Unknown or incorrectly typed fields are omitted.
- `useSpds` defaults to `false`. It controls only SPDS effects: synchronizing `spds-dark` and injecting validated branding variables, SPDS defaults, derived stops, and PrimeNG token redirects.
- `mockSdkContext` accepts separate operating-system and App Shell schemes plus brand values, and can emit live changes for appearance tests.

When App Shell omits branding, `PluginContext.brand` remains undefined. SPDS-enabled plugins still receive the compact default branding CSS.

Root `color-scheme` synchronization is a visual behavior change: a dark App Shell scheme can change native controls, scrollbars, and other browser-rendered elements in existing plugins that only support light mode. Those plugins can pass `syncColorScheme: false` to retain their previous document styling while they adopt dark mode.

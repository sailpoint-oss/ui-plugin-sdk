---
'@sailpoint/ui-plugin-sdk': minor
---

Add `sdk.navigation.setRoute(subPath)` for syncing a full-page plugin's internal
route to the App Shell URL (CSTM-526).

- Sends the COIP `SP_ROUTE_CHANGE_EVT` with `{ subPath }`. App Shell applies it
  with `history.replaceState`. This replaces hand-written
  `window.parent.postMessage` calls.
- Returns `Promise<void>`. It waits for the SDK handshake, because App Shell
  drops route events received before the handshake completes, and rejects if
  the handshake fails.
- Rejects with `TypeError` for a non-string `subPath`. Strips one leading `/`,
  so router paths such as `location.pathname` are accepted. App Shell otherwise
  rejects them silently.
- New public export: `RouteChangePayload`.
- `mockSdkContext` handles now expose `routeChanges` for asserting route
  updates in plugin tests.
- New `context.page.subPath`: the plugin-relative route the host mounted the
  plugin at, derived from `page.route`. It is `''` for the start route, slot
  mounts, and malformed or plugin-less routes. It holds path segments only,
  still percent-encoded, so `setRoute(page.subPath)` round-trips. `page.route`
  is unchanged.
- `mockSdkContext`: `page.subPath` is optional in the supplied context and
  derived from `route` (new `MockPluginContext` type). The default mock route is
  now `.../ui/plugin/mock-plugin/settings` (`subPath: 'settings'`), matching the
  App Shell URL layout.

**Migration:** code that builds a `PluginContext` literal by hand must add
`page.subPath`. Contexts passed to `mockSdkContext` are unaffected. Tests that
relied on the old default mock route (`https://mock-app-shell.sailpoint.test/`)
now see the new route.

Tested against App Shell at `saas-sp-renderer@d283d69c`.

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

Tested against App Shell at `saas-sp-renderer@d283d69c`.

# @sailpoint/ui-plugin-sdk

## 0.1.0

### Minor Changes

- e2d78dc: Align plugin context types with the App Shell capability-flag contract (CSTM-354).

    **Breaking.** App Shell now sends an exhaustive map of public capability booleans
    instead of fine-grained rights, so the SDK's context declarations were not just
    stale but actively wrong: `capabilities?: string[]` compiled cleanly against a
    value that is really an object, then threw `TypeError: ...includes is not a
function` at runtime.

    - `UserContext.capabilities` is now a required `UserCapabilities` object with all
      13 flags. Replace `capabilities?.includes('ORG_ADMIN')` with
      `capabilities.isOrgAdmin`.
    - Removed `amsRights`, `uiRights`, `uid`, `alias`, `lastLoginTimestamp`,
      `federated`, and `mfeSessionHash` from `UserContext` — App Shell never sent them.
    - `TenantContext.name`, `pod`, `region`, `apiUrl`, and `products` are now
      required, `products` is typed `TenantProduct[]` with `licenses`, and
      `TenantApiUrl` is narrowed to exactly `{ idn: string }`.
    - Removed the `[key: string]: unknown` index signatures from `TenantContext`,
      `UserContext`, `PageContext`, and `TenantApiUrl`, so a misspelled field is a
      compile error instead of `unknown`.
    - Added `PluginContext.pluginConfiguration`, exposing the `slotConfiguration` and
      `pluginId` the SDK previously discarded.
    - The handshake now validates every newly-required field and fails with
      `HANDSHAKE_FAILED` when the host payload does not match, rather than handing
      plugins `undefined` at a site the types call safe.
    - `api.get`/`api.post` no longer derive a hostname from the tenant name when
      `apiUrl` is absent; they use the validated `tenant.apiUrl.idn`.
    - New public exports: `UserCapabilities`, `CapabilityFlagKey`, `TenantProduct`,
      `TenantProductLicense`, `PluginConfiguration`, `SlotConfiguration`, `TenantApiUrl`.

    Requires App Shell at `saas-sp-renderer@4100daea` or later.

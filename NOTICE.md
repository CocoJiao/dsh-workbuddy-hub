# NOTICE

`dsh-workbuddy-hub` bundles third-party code.

## lib/vendor/ — dsh-workbuddy-connect (MIT)

- **Project**: dsh-workbuddy-connect
- **Author**: Corrine Hu (corrinehu)
- **Repository**: https://github.com/corrinehu/dsh-workbuddy-connect
- **License**: MIT — full text in `lib/vendor/LICENSE.connect.txt`
- **Vendored at**: version 0.7.1 (2026-10-01)

**What was changed**: only the relative import path
`./host-heartbeat-L93zSVB5.js` → `./connect-heartbeat.js` (the vendor file was
renamed on copy). No logic was modified. The bundled `apply()` is invoked with a
config object produced from its own exported Schemastery `Config` schema, which
is what cordis itself does when the plugin is installed normally.

**Why vendored**: WorkBuddy stores its `accessToken` in an encrypted envelope and
the decryption key can only be obtained by running WorkBuddy's own Electron binary
with `ELECTRON_RUN_AS_NODE=1`. That logic is non-trivial and tracks DSH kernel /
pi-ai APIs; vendoring keeps the hub self-contained without reimplementing it.

**Upstream updates**: to sync, copy `lib/index.js` and `lib/host-heartbeat-*.js`
from a newer dsh-workbuddy-connect release into `lib/vendor/`
(as `connect-index.js` / `connect-heartbeat.js`) and re-apply the import rewrite.

## Compatibility note

This plugin and `dsh-workbuddy-connect` register the SAME provider id (`workbuddy`).
DSH rejects duplicate provider ids all-or-nothing, so install **one** of them.

# Share Checklist

Use this checklist right before handing the plugin to someone else.

## Required

- `README.md` is present
- `INSTALL.md` is present
- `TROUBLESHOOTING.md` is present
- `RELEASE-NOTES.md` is present
- `CHANGELOG.md` is present
- `UPGRADE.md` is present
- `QUICKSTART.md` is present
- `DELIVERY.md` is present
- `.codex-plugin/plugin.json` is present
- `.mcp.json` is present
- lifecycle scripts are present

## Verify on your machine

- `status-word-helper.ps1` returns `ready`
- `word-live-doctor.mjs` returns `ok: true`
- `lifecycle-smoke-test.mjs` passes
- one real Word edit succeeds

## Sharing notes

- Source code should be shared
- Repo-local marketplace entry should be shared
- Runtime and log files should not be included in the normal share package
- The receiver machine will create `logs/` and `runtime/` automatically on first use

## Package cleanup

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\prepare-share-package.ps1
```

Then verify:

- `logs/` contains only `.gitkeep`
- `runtime/` contains only `.gitkeep`

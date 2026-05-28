# Delivery Guide

This file is for the person sharing `word-live-mcp` with others.

## What to share

Share:

- `plugins/word-live-mcp/`
- `.agents/plugins/marketplace.json`
- `plugins/word-live-mcp/INSTALL.md`
- `plugins/word-live-mcp/TROUBLESHOOTING.md`
- `plugins/word-live-mcp/RELEASE-NOTES.md`
- `plugins/word-live-mcp/CHANGELOG.md`
- `plugins/word-live-mcp/UPGRADE.md`

The receiver should open the repository in Codex and install the plugin from the repository marketplace.

Do not include machine-local helper state as part of the intended release content. The receiver's machine should create its own `logs/` and `runtime/` artifacts after install.

## Pre-share checklist

Before sharing, verify:

1. `status-word-helper.ps1` reports `ready`
2. `word-live-doctor.mjs` returns `ok: true`
3. `lifecycle-smoke-test.mjs` writes a passing report
4. A real Word edit works end-to-end on the current machine

## Suggested validation steps

1. Start helper
2. Run `status`
3. Run `doctor`
4. Run lifecycle smoke test
   Read `runtime/lifecycle-smoke-report.json` as the source of truth for the result.
5. Open Word and select a short paragraph
6. Ask Codex to rewrite or translate the selection
7. Confirm the selection changed in Word

## What not to assume

- Do not assume the receiver has the same Windows username or desktop session behavior
- Do not assume the receiver will keep helper running all the time
- Do not assume runtime files from your machine are useful on their machine

## Recommended cleanup before packaging

Recommended:

1. Stop the helper
2. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\prepare-share-package.ps1
```

3. Confirm only source files, docs, and empty placeholder directories remain in the plugin folder

If you intentionally want to share diagnostics with a collaborator, export those logs separately instead of bundling them as default plugin content.

## Upgrade handoff

When sending an updated build to an existing user, also point them to:

- `plugins/word-live-mcp/UPGRADE.md`
- `plugins/word-live-mcp/scripts/prepare-word-live-reinstall.ps1`

## Release state

Current maturity:

- `shareable beta`
- appropriate for controlled sharing and collaborator testing
- not yet a polished marketplace-grade public release

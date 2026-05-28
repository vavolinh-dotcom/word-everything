# Upgrade Guide

This guide is for updating an existing local installation of `word-live-mcp`.

## Receiver upgrade

Use this path when someone already installed the plugin from the shared repository.

1. Replace the repository contents with the newer plugin files.
2. Run the reinstall preflight:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\prepare-word-live-reinstall.ps1
```

3. In the Codex app, reinstall or refresh the plugin from the same repository marketplace.
4. Start a new Codex thread before testing the updated plugin.
5. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1
```

6. If needed, restart the helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\restart-word-helper.ps1
```

## Maintainer update loop

Use this path when iterating on the plugin locally and you want Codex to pick up the new plugin build.

1. Update the plugin version cachebuster:

```powershell
python C:\Users\wltszsd\.codex\skills\.system\plugin-creator\scripts\update_plugin_cachebuster.py D:\codex\act-skill\plugins\word-live-mcp
```

2. Reinstall the plugin from the configured marketplace in Codex.
3. If Codex CLI plugin commands are unavailable in your current environment, use the Codex app UI instead of forcing the CLI path.
4. Start a new Codex thread before testing.

## After upgrade

Recommended checks:

1. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1
```

2. If the helper is not ready, run:

```powershell
node .\plugins\word-live-mcp\scripts\word-live-doctor.mjs
```

3. Open Word, select a paragraph, and verify one real edit works end to end.

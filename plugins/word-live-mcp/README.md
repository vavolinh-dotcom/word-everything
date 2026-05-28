# Word Live MCP

`word-live-mcp` is a Windows-only Codex plugin that lets Codex read and edit the active Microsoft Word desktop document through a local MCP server and a desktop helper.

## Who this is for

Use this plugin if you want Codex to:

- read the current Word selection
- rewrite the selected paragraph in place
- translate selected content while keeping the original
- replace a paragraph by index
- add comments, toggle Track Changes, and save the document

This plugin is designed for local desktop use on Windows with the desktop version of Microsoft Word.

## What is included

- MCP server for Codex
- desktop helper for Word COM automation
- lifecycle tools: `start`, `stop`, `restart`, `status`, `doctor`
- runtime and log directories that are auto-created on first start
- smoke test for lifecycle validation

## System requirements

- Windows
- Desktop Microsoft Word installed
- Codex available on the same machine
- Node.js available to Codex
- PowerShell available to Codex

## Architecture

- `Codex MCP server`
- `localhost desktop helper`
- `Word COM in the logged-in desktop user session`

The helper must run in the same logged-in Windows desktop session as Microsoft Word.

## Install

1. Put this repository on the target Windows machine.
2. Open the repository in Codex.
3. In Codex, install `word-live-mcp` from `.agents/plugins/marketplace.json`.
4. Approve local MCP execution if Codex prompts for it.
5. For a receiver-friendly walkthrough, follow `INSTALL.md`.
6. If installation or live editing fails, follow `TROUBLESHOOTING.md`.
7. For later updates, follow `UPGRADE.md` and review `CHANGELOG.md`.
8. Before a reinstall, you can run `scripts/prepare-word-live-reinstall.ps1`.

Recommended setup command:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1
```

## First-time setup

1. Open desktop Microsoft Word.
2. Open a test document.
3. Start the helper.

The helper automatically creates `logs/` and `runtime/` on the local machine if they do not exist.

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\start-word-helper.ps1
```

4. Confirm helper status:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1
```

Expected result:

- `status` is `ready`
- `health.pid`, `pidRecord.pid`, and `portOwnerPid` match

## Quick start

1. In Word, select the exact text you want Codex to work on.
2. In Codex, ask for a selection-based edit, for example:
   - `Read my current Word selection and polish it.`
   - `Translate this passage into professional academic English and keep the original text.`
   - `Rewrite this paragraph so it sounds more like a paper introduction.`
3. Codex reads the selection first.
4. Codex writes the revision back into the active Word document.

## Lifecycle commands

Start helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\start-word-helper.ps1
```

Stop helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\stop-word-helper.ps1
```

Restart helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\restart-word-helper.ps1
```

Check status:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1
```

Run doctor:

```powershell
node .\plugins\word-live-mcp\scripts\word-live-doctor.mjs
```

Run lifecycle smoke test:

```powershell
node .\plugins\word-live-mcp\scripts\lifecycle-smoke-test.mjs
```

Smoke test report path:

- `plugins/word-live-mcp/runtime/lifecycle-smoke-report.json`

## Status model

The helper lifecycle uses these states:

- `ready`
- `starting`
- `not_running`
- `stale_pid`
- `unhealthy`
- `unmanaged_running`

Health checks are the primary truth source. PID files are support metadata for restart, stop, and diagnostics.

## Logs and runtime files

These files are machine-local runtime artifacts. Do not treat them as distributable plugin content.

Runtime state created after helper start:

- `plugins/word-live-mcp/runtime/word-helper.pid`
- `plugins/word-live-mcp/runtime/lifecycle-smoke-report.json`

Helper logs created after helper start:

- `plugins/word-live-mcp/logs/word-helper.out.log`
- `plugins/word-live-mcp/logs/word-helper.err.log`

Lifecycle logs created after lifecycle commands run:

- `plugins/word-live-mcp/logs/word-helper.lifecycle.out.log`
- `plugins/word-live-mcp/logs/word-helper.lifecycle.err.log`

## Troubleshooting

If `status` is not `ready`:

1. Run `doctor`
2. Check the helper logs
3. Confirm Word is open in the logged-in desktop session
4. Run `restart-word-helper.ps1`
5. If needed, use `TROUBLESHOOTING.md` for step-by-step recovery

If Codex says helper is unavailable:

1. Start the helper from the desktop user session
2. Re-run `status`
3. If still failing, inspect `word-helper.out.log` and `word-helper.lifecycle.out.log`
4. If you need to send diagnostics to a collaborator, run `export-word-live-diagnostics.ps1`

If lifecycle state looks inconsistent:

1. Run `restart-word-helper.ps1`
2. Re-run `status`
3. Re-run `lifecycle-smoke-test.mjs`

## Current scope

- Windows only
- Desktop Word only, not Word Online
- Live edits are discrete tool calls, not screen-stream control
- Selection-based editing is the most reliable workflow

## Recommended sharing practice

Share the plugin source folder and the repo-local marketplace entry, but do not ship your own runtime or log files as part of the release. The target machine should generate its own helper state and logs after installation.

The repository keeps only `logs/.gitkeep` and `runtime/.gitkeep` so the empty directories remain shareable without carrying machine-local state.

Before packaging for others, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\prepare-share-package.ps1
```

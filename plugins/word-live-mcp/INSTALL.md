# Install Guide

This guide is for a first-time receiver of `word-live-mcp`.

## What you need

- Windows
- Desktop Microsoft Word
- Codex on the same machine
- Node.js available to Codex
- PowerShell available to Codex

## What you should receive

- the repository folder that contains `plugins/word-live-mcp/`
- the repository marketplace file at `.agents/plugins/marketplace.json`

You should not expect prebuilt runtime state, PID files, or logs from the sender. Those are created locally on your machine after first use.

## Install in Codex

1. Open the shared repository in Codex.
2. Install `word-live-mcp` from the repository marketplace file:
   `.agents/plugins/marketplace.json`
3. Approve local MCP execution if Codex asks for permission.

## Recommended first command

Run the setup script from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1
```

If you want it to start the helper at the end:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1 -StartHelper
```

The setup script:

- creates local `logs/` and `runtime/` directories
- checks Node.js availability
- checks Microsoft Word COM availability
- confirms key plugin files are present
- prints the next steps for the receiver

## Manual first start

1. Open Microsoft Word.
2. Open any test document.
3. Start the desktop helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\start-word-helper.ps1
```

4. Check helper status:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1
```

Expected result:

- `status` is `ready`

If the status is not `ready`, run:

```powershell
node .\plugins\word-live-mcp\scripts\word-live-doctor.mjs
```

If that does not resolve the issue, continue with `TROUBLESHOOTING.md`.

## First live test

1. In Word, select a short paragraph.
2. In Codex, send a prompt such as:
   - `Read my current Word selection and polish it.`
   - `Translate this passage into professional academic English and keep the original text.`
   - `Rewrite the selected paragraph while keeping the meaning but making it sound more like a paper.`
3. Confirm the selected content changes in the live Word document.

## Local files created automatically

After helper start or lifecycle checks, the plugin creates local machine files under:

- `plugins/word-live-mcp/logs/`
- `plugins/word-live-mcp/runtime/`

These are expected local artifacts and are not part of the share package.

If you need to send diagnostics back to the sharer, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\export-word-live-diagnostics.ps1
```

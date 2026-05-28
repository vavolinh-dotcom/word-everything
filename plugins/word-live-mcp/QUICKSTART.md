# Quick Start

## Install

1. Open this repository in Codex.
2. Install `word-live-mcp` from `.agents/plugins/marketplace.json`.

## Recommended setup

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1 -StartHelper
```

This checks the local environment, creates runtime directories, and starts the helper for you.

## Start helper

The helper creates `logs/` and `runtime/` automatically on the local machine.

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\start-word-helper.ps1
```

## Confirm helper is ready

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1
```

Expected result:

- `status` is `ready`

If the result is not `ready`, run:

```powershell
node .\plugins\word-live-mcp\scripts\word-live-doctor.mjs
```

## Use with Word

1. Open desktop Microsoft Word.
2. Open a document.
3. Select some text.
4. Ask Codex to edit the selected text.

Example prompts:

- `Polish this paragraph in a more academic tone.`
- `Translate this passage into professional English and keep the original text.`
- `Add a comment saying this claim needs stronger evidence.`

## Optional validation

Run lifecycle smoke test:

```powershell
node .\plugins\word-live-mcp\scripts\lifecycle-smoke-test.mjs
```

If the console output looks incomplete, read the saved report:

`.\plugins\word-live-mcp\runtime\lifecycle-smoke-report.json`

## Sharing note

Do not package your local `logs/` or `runtime/` contents for others. If you are preparing a handoff, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\prepare-share-package.ps1
```

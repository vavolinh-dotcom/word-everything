# Troubleshooting

This guide is for the receiver of `word-live-mcp` when installation or live Word editing does not work as expected.

## Quick triage

Run these commands from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1
```

```powershell
node .\plugins\word-live-mcp\scripts\word-live-doctor.mjs
```

Check the result first, then use the cases below.

For first-time setup issues, also run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1
```

## Case: helper does not start

Symptoms:

- `status` shows `not_running`
- Codex says the helper is unavailable

What to do:

1. Make sure Microsoft Word desktop is open.
2. Start the helper manually:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\start-word-helper.ps1
```

3. Re-run `status`.
4. If it still fails, run `doctor` and inspect:
   - `plugins/word-live-mcp/logs/word-helper.out.log`
   - `plugins/word-live-mcp/logs/word-helper.err.log`

## Case: helper status is inconsistent

Symptoms:

- `status` shows `stale_pid`
- `status` shows `unhealthy`
- PID file and health check do not match

What to do:

1. Restart the helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\restart-word-helper.ps1
```

2. Re-run `status`.
3. If needed, run the lifecycle smoke test:

```powershell
node .\plugins\word-live-mcp\scripts\lifecycle-smoke-test.mjs
```

4. Read:
   `plugins/word-live-mcp/runtime/lifecycle-smoke-report.json`

## Case: Word is open but Codex cannot read the selection

Symptoms:

- live edit commands fail
- selection-based actions return empty or missing content

What to do:

1. Make sure text is actively selected in the desktop Word window.
2. Keep Word in the logged-in desktop session, not in a different Windows user session.
3. Ask Codex to read the selection first before asking for a rewrite.
4. If needed, retry after `restart-word-helper.ps1`.

## Case: plugin installs but no live edits happen

Symptoms:

- plugin appears in Codex
- MCP calls return errors
- no text changes appear in Word

What to do:

1. Confirm the plugin was installed from `.agents/plugins/marketplace.json`.
2. Confirm local MCP execution was approved in Codex.
3. Confirm Word desktop is open on the same machine.
4. Confirm helper `status` is `ready`.
5. Run `doctor` and inspect helper logs.

## Case: first-time install on another machine fails

Check these prerequisites:

- Windows
- desktop Microsoft Word installed
- Node.js available to Codex
- PowerShell available to Codex

If all prerequisites are present, follow `INSTALL.md` again from the beginning.

## Useful files

- helper logs: `plugins/word-live-mcp/logs/`
- runtime state: `plugins/word-live-mcp/runtime/`
- install guide: `plugins/word-live-mcp/INSTALL.md`
- quick start: `plugins/word-live-mcp/QUICKSTART.md`

## When to send diagnostics back to the sharer

Send the sharer:

- the output of `status-word-helper.ps1`
- the output of `word-live-doctor.mjs`
- relevant lines from helper logs

Recommended command:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\export-word-live-diagnostics.ps1
```

That command creates a local diagnostics bundle under `plugins/word-live-mcp/runtime/diagnostics/`.

Do not send the whole plugin folder with your local runtime and logs unless someone explicitly asks for a diagnostic bundle.

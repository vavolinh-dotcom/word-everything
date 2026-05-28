# Changelog

All notable changes to `word-live-mcp` should be recorded in this file.

## 0.1.0+codex.20260528091120

Initial shareable beta cachebuster build for reinstall testing.

Added:

- live Word editing through a local MCP server
- desktop helper for Word COM automation
- lifecycle command set: `start`, `stop`, `restart`, `status`, `doctor`
- lifecycle smoke test
- setup, cleanup, troubleshooting, and diagnostics scripts
- shareable install and delivery documentation

Operational notes:

- runtime and log artifacts are created on the receiver machine
- default diagnostics export includes log tails, not full logs
- this build uses a Codex cachebuster suffix for reliable local reinstall

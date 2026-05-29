# Changelog

All notable changes to `word-live-mcp` should be recorded in this file.

## 0.1.0+codex.20260529040810

Added:

- `target_language`, `style`, `heading`, and `include_heading` parameters for keep-original translation and polishing workflows
- automatic headings for inserted translated and polished versions
- `style` and `target_language` metadata for Track Changes rewrite workflows

Changed:

- `word_translate_selection_keep_original` now inserts a heading such as `Translation - English, academic:` by default
- `word_polish_selection_keep_original` now inserts a heading such as `Polished version - academic:` by default
- high-level workflow results now include workflow metadata for easier diagnostics

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

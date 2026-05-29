# Release Notes

## 0.1.0+codex.20260529040810

Workflow polish release.

Included in this release:

- target language and style labels for keep-original workflows
- automatic headings for translated and polished insertions
- workflow metadata in high-level tool responses
- updated README and skill routing guidance

Upgrade notes:

- reinstall or refresh the plugin in Codex after pulling this build
- start a new Codex thread so the refreshed MCP tools are picked up

## 0.1.0+codex.20260528091120

Initial shareable beta release with a Codex cachebuster for reinstall-friendly local iteration.

See also:

- `CHANGELOG.md` for ongoing version history
- `UPGRADE.md` for receiver and maintainer update flow

Included in this release:

- Codex MCP server for Microsoft Word live editing
- desktop helper for Word COM automation
- lifecycle command set: `start`, `stop`, `restart`, `status`, `doctor`
- lifecycle smoke test
- packaging cleanup script for shareable handoff
- diagnostics bundle export script
- install, quick start, delivery, and troubleshooting docs

Distribution notes:

- do not ship machine-local logs or runtime state
- receivers generate their own `logs/` and `runtime/` files after install

## Release template

Copy this section for the next version.

### x.y.z

Summary:

- one-line description of the release

Added:

- new feature

Changed:

- behavior or UX improvement

Fixed:

- bug fix

Known limits:

- current limitation

Upgrade notes:

- anything the receiver should do after updating

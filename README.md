# word-everything

This repository contains the shareable `word-live-mcp` Codex plugin for live editing Microsoft Word on Windows.

## What to do after cloning

1. Open this repository in Codex.
2. Install `word-live-mcp` from `.agents/plugins/marketplace.json`.
3. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1 -StartHelper
```

4. Open Microsoft Word, select some text, and ask Codex to edit it.

## Recommended Codex prompt after cloning

`Install the word-live-mcp plugin from .agents/plugins/marketplace.json, run .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1 -StartHelper, then help me test one live Word edit.`

The same prompt is also saved in:

- `CODEX-INSTALL-PROMPT.txt`

## Shareable install path

Future users can clone this repository with:

```powershell
git clone https://github.com/<your-github-username>/word-everything.git
```

Then they can follow `plugins/word-live-mcp/INSTALL.md`.

## Maintainer publish flow

After logging into GitHub CLI with `gh auth login`, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\publish-to-github.ps1
```

That script will:

- initialize a local git repository if needed
- create the first commit
- create the GitHub repository
- push the current shareable contents

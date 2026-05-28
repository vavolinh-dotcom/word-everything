---
name: word-live
description: Use when the user wants Codex to read or modify the active Microsoft Word document on Windows in near real time through the Word Live MCP plugin. Prefer selection-based edits for requests like "edit this here", "polish this paragraph", "change the current selection", "modify it directly in Word", or "live edit Word".
---

# Word Live

Use this skill when the user wants edits to happen in the local desktop version of Microsoft Word on Windows rather than in a standalone `.docx` file workflow.

## Workflow

1. Ensure the desktop helper is running in the logged-in desktop session. If helper-backed calls fail, ask the user to run `plugins/word-live-mcp/scripts/start-word-helper.ps1` from their desktop session.
2. Start by calling `word_status`.
3. If the user refers to "here", "this paragraph", or "the selected content", call `word_get_selection`.
4. Before substantial prose edits, prefer enabling tracked changes with `word_set_track_revisions` unless the user asked for direct edits without markup.
5. For selection-based rewrites, use `word_replace_selection`.
6. For precise document navigation, use `word_list_paragraphs` and then `word_replace_paragraph`.
7. After edits, use `word_save_document` if the user wants the file saved immediately.

## Guardrails

- This plugin is Windows-only and requires the desktop Microsoft Word application.
- The most reliable architecture is `Codex MCP -> localhost desktop helper -> Word COM`.
- If `word_status` reports no active document, ask the user to open a document in Word first.
- If the selection is empty and the user says "edit this here", ask them to select the target text in Word or give a paragraph number.
- Prefer paragraph or selection edits over whole-document rewrites.
- Tell the user when an action changes the live Word document immediately.

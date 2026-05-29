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
6. If the user wants the current selection removed, use `word_delete_selection`.
7. If the user wants to keep the current selection and add translated or revised text below it, use `word_insert_text_after_selection`.
8. If the user wants the selection translated while keeping the original in place, first generate the translation and then call `word_translate_selection_keep_original` with `target_language`, optional `style`, and the translated `text`.
9. If the user wants the selection polished while keeping the original in place, first generate the polished text and then call `word_polish_selection_keep_original` with optional `style`, `target_language`, and the polished `text`.
10. If the user wants a direct rewrite with visible revision markup, first generate the rewritten text and then call `word_rewrite_selection_with_track_changes` with optional `style` and `target_language`.
11. For precise document navigation, use `word_list_paragraphs` and then `word_replace_paragraph`.
12. After edits, use `word_save_document` if the user wants the file saved immediately.

## Guardrails

- This plugin is Windows-only and requires the desktop Microsoft Word application.
- The most reliable architecture is `Codex MCP -> localhost desktop helper -> Word COM`.
- If `word_status` reports no active document, ask the user to open a document in Word first.
- If the selection is empty and the user says "edit this here", ask them to select the target text in Word or give a paragraph number.
- Prefer paragraph or selection edits over whole-document rewrites.
- For keep-original workflows, use the default inserted headings unless the user asks for no heading or a custom heading.
- Tell the user when an action changes the live Word document immediately.

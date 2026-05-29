import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  helperBaseUrl
} from "./word-live-config.mjs";
import {
  doctorHelperLifecycle,
  startHelperLifecycle
} from "./helper-lifecycle.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bridgeScriptPath = path.join(__dirname, "word-bridge.ps1");
const pluginManifestPath = path.join(__dirname, "..", ".codex-plugin", "plugin.json");
const pluginManifest = JSON.parse(readFileSync(pluginManifestPath, "utf8"));
const serverInfo = {
  name: "word-live-mcp",
  version: pluginManifest.version
};

const toolDefinitions = [
  {
    name: "word_status",
    description: "Inspect the active Microsoft Word application, active document, current selection, and Track Changes state.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "word_open_document",
    description: "Open a Word document by absolute Windows path and optionally make Word visible.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute Windows path to the .docx or .doc file."
        },
        visible: {
          type: "boolean",
          description: "Whether to show the Word window. Defaults to true."
        }
      },
      required: ["path"],
      additionalProperties: false
    }
  },
  {
    name: "word_get_selection",
    description: "Read the currently selected text in the active Word document.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "word_replace_selection",
    description: "Replace the currently selected text in Word with new text.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Replacement text."
        }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "word_delete_selection",
    description: "Delete the currently selected text in Word.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "word_insert_text_at_selection",
    description: "Insert text at the current selection or cursor position without requiring selected content.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to insert."
        }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "word_insert_text_after_selection",
    description: "Insert text immediately after the current selection while keeping the selected content.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to insert after the current selection."
        }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "word_translate_selection_keep_original",
    description: "Keep the current selection in place and insert a translated version after it.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Translated text to insert after the current selection."
        },
        target_language: {
          type: "string",
          description: "Target language label for the inserted translation heading. Defaults to English."
        },
        style: {
          type: "string",
          description: "Optional translation style label, such as academic, professional, or plain."
        },
        heading: {
          type: "string",
          description: "Optional custom heading inserted before the translated text."
        },
        separator: {
          type: "string",
          description: "Optional separator inserted between the original selection and the translated text. Defaults to two newlines."
        },
        include_heading: {
          type: "boolean",
          description: "Whether to insert a heading before the translated text. Defaults to true."
        }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "word_polish_selection_keep_original",
    description: "Keep the current selection in place and insert a polished version after it.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Polished text to insert after the current selection."
        },
        style: {
          type: "string",
          description: "Polishing style label for the inserted heading. Defaults to academic."
        },
        target_language: {
          type: "string",
          description: "Optional language label for the polished text."
        },
        heading: {
          type: "string",
          description: "Optional custom heading inserted before the polished text."
        },
        separator: {
          type: "string",
          description: "Optional separator inserted between the original selection and the polished text. Defaults to two newlines."
        },
        include_heading: {
          type: "boolean",
          description: "Whether to insert a heading before the polished text. Defaults to true."
        }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "word_rewrite_selection_with_track_changes",
    description: "Turn on Track Changes and rewrite the current selection with new text.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Replacement text for the current selection."
        },
        style: {
          type: "string",
          description: "Rewrite style label, such as academic, concise, or reviewer-friendly."
        },
        target_language: {
          type: "string",
          description: "Optional language label for the rewritten text."
        }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "word_list_paragraphs",
    description: "List a window of paragraphs from the active document to help locate content for editing.",
    inputSchema: {
      type: "object",
      properties: {
        start: {
          type: "integer",
          minimum: 1,
          description: "1-based paragraph index to start from. Defaults to 1."
        },
        count: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "How many paragraphs to return. Defaults to 20."
        }
      },
      additionalProperties: false
    }
  },
  {
    name: "word_replace_paragraph",
    description: "Replace the full text of a paragraph by its 1-based index.",
    inputSchema: {
      type: "object",
      properties: {
        index: {
          type: "integer",
          minimum: 1,
          description: "1-based paragraph index."
        },
        text: {
          type: "string",
          description: "New paragraph text."
        }
      },
      required: ["index", "text"],
      additionalProperties: false
    }
  },
  {
    name: "word_set_track_revisions",
    description: "Turn Microsoft Word Track Changes on or off for the active document.",
    inputSchema: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "True to enable Track Changes, false to disable it."
        }
      },
      required: ["enabled"],
      additionalProperties: false
    }
  },
  {
    name: "word_add_comment_on_selection",
    description: "Add a Word comment anchored to the current selection.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Comment text."
        }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "word_save_document",
    description: "Save the active document, optionally to a new absolute Windows path.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional absolute path for Save As."
        }
      },
      additionalProperties: false
    }
  },
  {
    name: "word_undo_last_action",
    description: "Undo the most recent Word action in the active document.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  }
];

function sendMessage(message) {
  const json = JSON.stringify(message);
  const payload = Buffer.from(json, "utf8");
  process.stdout.write(`Content-Length: ${payload.length}\r\n\r\n`);
  process.stdout.write(payload);
}

function sendResponse(id, result) {
  sendMessage({
    jsonrpc: "2.0",
    id,
    result
  });
}

function sendError(id, code, message, data) {
  sendMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  });
}

function toToolResult(payload) {
  const text = JSON.stringify(payload, null, 2);
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    structuredContent: payload,
    isError: payload.ok === false
  };
}

async function invokeHelper(action, args = {}) {
  try {
    const response = await fetch(`${helperBaseUrl}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ action, args })
    });

    const text = await response.text();
    const payload = JSON.parse(text);
    if (!response.ok && payload?.ok !== false) {
      return {
        ok: false,
        error: `Helper returned HTTP ${response.status}.`,
        helperResponse: payload
      };
    }

    return {
      ...payload,
      transport: "desktop-helper"
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      helperUnavailable: true,
      transport: "desktop-helper"
    };
  }
}
async function buildHelperUnavailableMessage(startResult, helperResult) {
  const doctor = await doctorHelperLifecycle();
  return {
    ok: false,
    error:
      "Word desktop helper is not available. Start the helper in the logged-in Windows desktop session and keep Microsoft Word open there.",
    transport: "desktop-helper",
    helperUnavailable: true,
    helperStartAttempt: startResult,
    helperProbe: helperResult,
    doctor
  };
}

function invokeBridge(action, args = {}) {
  const payload = {
    action,
    args
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        bridgeScriptPath,
        encoded
      ],
      {
        cwd: __dirname,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        error: `Failed to launch PowerShell bridge: ${error.message}`,
        transport: "direct-bridge"
      });
    });

    child.on("close", (code) => {
      if (!stdout.trim()) {
        resolve({
          ok: false,
          error: stderr.trim() || `Bridge exited without output (code ${code ?? "unknown"}).`,
          transport: "direct-bridge"
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        parsed.transport = "direct-bridge";
        if (stderr.trim()) {
          parsed.stderr = stderr.trim();
        }
        resolve(parsed);
      } catch (error) {
        resolve({
          ok: false,
          error: "Bridge returned invalid JSON.",
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          details: error.message
        });
      }
    });
  });
}

async function invokeAction(action, args = {}) {
  const helperResult = await invokeHelper(action, args);
  if (helperResult.ok !== false || helperResult.helperUnavailable !== true) {
    return helperResult;
  }

  const startResult = await startHelperLifecycle("mcp-auto-start");
  const retriedHelper = await invokeHelper(action, args);
  if (retriedHelper.ok !== false || retriedHelper.helperUnavailable !== true) {
    return {
      ...retriedHelper,
      helperAutoStarted: true,
      helperStartAttempt: startResult
    };
  }

  if (startResult.ok === false) {
    return await buildHelperUnavailableMessage(startResult, retriedHelper);
  }

  const fallback = await invokeBridge(action, args);
  return {
    ...fallback,
    helperFallback: true,
    helperError: helperResult.error
  };
}

function hasOwnValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function buildDerivedHeading(kind, args = {}) {
  if (hasOwnValue(args.heading)) {
    return String(args.heading).trim();
  }

  if (kind === "translation") {
    const targetLanguage = hasOwnValue(args.target_language) ? String(args.target_language).trim() : "English";
    const style = hasOwnValue(args.style) ? `, ${String(args.style).trim()}` : "";
    return `Translation - ${targetLanguage}${style}:`;
  }

  if (kind === "polish") {
    const style = hasOwnValue(args.style) ? String(args.style).trim() : "academic";
    const targetLanguage = hasOwnValue(args.target_language) ? `, ${String(args.target_language).trim()}` : "";
    return `Polished version - ${style}${targetLanguage}:`;
  }

  return "Derived version:";
}

function buildDerivedInsertText(kind, args = {}) {
  const separator = args.separator === undefined ? "\r\n\r\n" : String(args.separator);
  const includeHeading = args.include_heading !== false;
  const heading = includeHeading ? buildDerivedHeading(kind, args) : "";
  const text = String(args.text ?? "");

  if (!includeHeading) {
    return `${separator}${text}`;
  }

  return `${separator}${heading}\r\n${text}`;
}

async function insertDerivedTextAfterSelection(kind, args = {}) {
  const selectionResult = await invokeAction("get_selection");
  if (selectionResult.ok === false) {
    return selectionResult;
  }

  const selectionText = selectionResult.selection?.text || "";
  if (!selectionText) {
    return {
      ok: false,
      error: "The current selection is empty. Select the target text in Word first."
    };
  }

  const text = String(args.text ?? "");
  if (!text) {
    return {
      ok: false,
      error: "The derived text is empty. Provide translated, polished, or rewritten text before writing to Word."
    };
  }

  const insertResult = await invokeAction("insert_text_after_selection", {
    text: buildDerivedInsertText(kind, args)
  });

  return {
    ...insertResult,
    sourceSelection: selectionResult.selection,
    workflow: {
      kind,
      targetLanguage: args.target_language || null,
      style: args.style || null,
      includeHeading: args.include_heading !== false,
      heading: args.include_heading === false ? null : buildDerivedHeading(kind, args)
    }
  };
}

async function rewriteSelectionWithTrackChanges(args = {}) {
  const text = String(args.text ?? "");
  if (!text) {
    return {
      ok: false,
      error: "The rewritten text is empty. Provide replacement text before writing to Word."
    };
  }

  const trackResult = await invokeAction("set_track_revisions", {
    enabled: true
  });
  if (trackResult.ok === false) {
    return trackResult;
  }

  const replaceResult = await invokeAction("replace_selection", { text });
  return {
    ...replaceResult,
    workflow: {
      kind: "rewrite_with_track_changes",
      targetLanguage: args.target_language || null,
      style: args.style || null
    },
    trackRevisions: {
      enabled: true,
      result: trackResult
    }
  };
}

async function handleRequest(message) {
  switch (message.method) {
    case "initialize": {
      const protocolVersion =
        message.params?.protocolVersion || "2024-11-05";
      sendResponse(message.id, {
        protocolVersion,
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo
      });
      return;
    }
    case "notifications/initialized":
      return;
    case "ping":
      sendResponse(message.id, {});
      return;
    case "tools/list":
      sendResponse(message.id, {
        tools: toolDefinitions
      });
      return;
    case "tools/call": {
      const name = message.params?.name;
      const args = message.params?.arguments || {};
      if (name === "word_translate_selection_keep_original") {
        const result = await insertDerivedTextAfterSelection("translation", args);
        sendResponse(message.id, toToolResult(result));
        return;
      }
      if (name === "word_polish_selection_keep_original") {
        const result = await insertDerivedTextAfterSelection("polish", args);
        sendResponse(message.id, toToolResult(result));
        return;
      }
      if (name === "word_rewrite_selection_with_track_changes") {
        const result = await rewriteSelectionWithTrackChanges(args);
        sendResponse(message.id, toToolResult(result));
        return;
      }

      const actionMap = {
        word_status: "status",
        word_open_document: "open_document",
        word_get_selection: "get_selection",
        word_replace_selection: "replace_selection",
        word_delete_selection: "delete_selection",
        word_insert_text_at_selection: "insert_text_at_selection",
        word_insert_text_after_selection: "insert_text_after_selection",
        word_list_paragraphs: "list_paragraphs",
        word_replace_paragraph: "replace_paragraph",
        word_set_track_revisions: "set_track_revisions",
        word_add_comment_on_selection: "add_comment_on_selection",
        word_save_document: "save_document",
        word_undo_last_action: "undo_last_action"
      };

      const action = actionMap[name];
      if (!action) {
        sendResponse(message.id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: false,
                  error: `Unknown tool: ${name}`
                },
                null,
                2
              )
            }
          ],
          structuredContent: {
            ok: false,
            error: `Unknown tool: ${name}`
          },
          isError: true
        });
        return;
      }

      const result = await invokeAction(action, args);
      sendResponse(message.id, toToolResult(result));
      return;
    }
    default:
      if (message.id !== undefined) {
        sendError(message.id, -32601, `Method not found: ${message.method}`);
      }
  }
}

let buffer = Buffer.alloc(0);

function tryParseMessages() {
  while (true) {
    const separator = buffer.indexOf("\r\n\r\n");
    if (separator === -1) {
      return;
    }

    const headerText = buffer.slice(0, separator).toString("utf8");
    const headers = new Map();
    for (const line of headerText.split("\r\n")) {
      const index = line.indexOf(":");
      if (index === -1) {
        continue;
      }
      const key = line.slice(0, index).trim().toLowerCase();
      const value = line.slice(index + 1).trim();
      headers.set(key, value);
    }

    const contentLength = Number(headers.get("content-length"));
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      buffer = Buffer.alloc(0);
      return;
    }

    const messageStart = separator + 4;
    const messageEnd = messageStart + contentLength;
    if (buffer.length < messageEnd) {
      return;
    }

    const body = buffer.slice(messageStart, messageEnd).toString("utf8");
    buffer = buffer.slice(messageEnd);

    let message;
    try {
      message = JSON.parse(body);
    } catch (error) {
      sendError(null, -32700, "Parse error", error.message);
      continue;
    }

    Promise.resolve(handleRequest(message)).catch((error) => {
      if (message?.id !== undefined) {
        sendError(message.id, -32000, error.message);
      }
    });
  }
}

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  tryParseMessages();
});

process.stdin.on("end", () => {
  process.exit(0);
});

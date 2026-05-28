import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function frame(obj) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  return Buffer.from(`Content-Length: ${body.length}\r\n\r\n${body}`, "utf8");
}

function createClient() {
  const child = spawn("node", [path.join(__dirname, "word-live-server.mjs")], {
    cwd: path.join(__dirname, ".."),
    stdio: ["pipe", "pipe", "pipe"]
  });

  let buffer = Buffer.alloc(0);
  let nextId = 1;
  const pending = new Map();

  child.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const sep = buffer.indexOf("\r\n\r\n");
      if (sep === -1) {
        break;
      }
      const header = buffer.slice(0, sep).toString("utf8");
      const match = /Content-Length: (\d+)/i.exec(header);
      if (!match) {
        throw new Error("Missing content length header.");
      }
      const len = Number(match[1]);
      const start = sep + 4;
      const end = start + len;
      if (buffer.length < end) {
        break;
      }
      const body = buffer.slice(start, end).toString("utf8");
      buffer = buffer.slice(end);
      const message = JSON.parse(body);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          reject(new Error(JSON.stringify(message.error)));
        } else {
          resolve(message.result);
        }
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk.toString("utf8"));
  });

  function call(method, params = {}) {
    const id = nextId++;
    child.stdin.write(frame({ jsonrpc: "2.0", id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  function notify(method, params = {}) {
    child.stdin.write(frame({ jsonrpc: "2.0", method, params }));
  }

  return { child, call, notify };
}

async function main() {
  const [toolName, argsFile] = process.argv.slice(2);
  if (!toolName) {
    throw new Error("Usage: node mcp-debug-client.mjs <tool-name> [args-json-file]");
  }

  let args = {};
  if (argsFile) {
    const raw = await readFile(argsFile, "utf8");
    args = JSON.parse(raw);
  }

  const client = createClient();
  try {
    await client.call("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "mcp-debug-client",
        version: "0.0.0"
      }
    });
    client.notify("notifications/initialized", {});
    const result = await client.call("tools/call", {
      name: toolName,
      arguments: args
    });
    process.stdout.write(JSON.stringify(result.structuredContent, null, 2));
  } finally {
    client.child.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});

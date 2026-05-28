import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { helperPort } from "./word-live-config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerScriptPath = path.join(__dirname, "word-com-worker.ps1");
const host = "127.0.0.1";
const port = helperPort;
const helperStartedAt = new Date().toISOString();
const helperPid = process.pid;

function log(event, details = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...details
  });
  process.stdout.write(`${line}\n`);
}

function invokeWorker(action, args = {}) {
  const payload = Buffer.from(
    JSON.stringify({ action, args }),
    "utf8"
  ).toString("base64");

  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        workerScriptPath,
        payload
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
        error: `Failed to launch worker: ${error.message}`
      });
    });

    child.on("close", (code) => {
      if (!stdout.trim()) {
        resolve({
          ok: false,
          error: stderr.trim() || `Worker exited without output (code ${code ?? "unknown"}).`
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (stderr.trim()) {
          parsed.stderr = stderr.trim();
        }
        resolve(parsed);
      } catch (error) {
        resolve({
          ok: false,
          error: "Worker returned invalid JSON.",
          details: error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body, "utf8")
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (!body.trim()) {
    return {};
  }
  return JSON.parse(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    log("request", {
      method: req.method,
      pathname: url.pathname
    });

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "word-live-helper",
        port,
        pid: helperPid,
        startedAt: helperStartedAt
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/invoke") {
      const body = await readJsonBody(req);
      const action = body.action;
      const args = body.args || {};
      log("invoke", { action });

      if (!action || typeof action !== "string") {
        sendJson(res, 400, {
          ok: false,
          error: "Missing string action."
        });
        return;
      }

      const result = await invokeWorker(action, args);
      sendJson(res, result.ok === false ? 500 : 200, result);
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: "Not found."
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message
    });
  }
});

server.listen(port, host, () => {
  log("listening", {
    ok: true,
    service: "word-live-helper",
    listeningOn: `http://${host}:${port}`,
    pid: helperPid,
    startedAt: helperStartedAt
  });
});

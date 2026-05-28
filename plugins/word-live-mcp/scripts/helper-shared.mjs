import { spawn } from "node:child_process";
import { existsSync, openSync } from "node:fs";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  helperBaseUrl,
  helperErrLogPath,
  helperOutLogPath,
  helperPidPath,
  helperPollIntervalMs,
  helperPort,
  lifecycleErrLogPath,
  lifecycleOutLogPath,
  logsDir,
  runtimeDir
} from "./word-live-config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const helperScriptPath = path.join(__dirname, "word-helper-server.mjs");

async function ensureRuntimeDirs() {
  await Promise.all([
    mkdir(runtimeDir, { recursive: true }),
    mkdir(logsDir, { recursive: true })
  ]);
}

async function sleep(ms = helperPollIntervalMs) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingHelper(timeoutMs = 1500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${helperBaseUrl}/health`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Helper health check returned HTTP ${response.status}.`
      };
    }
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: error.name === "AbortError" ? "Helper health check timed out." : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readHelperPidRecord() {
  if (!existsSync(helperPidPath)) {
    return null;
  }

  try {
    const raw = await readFile(helperPidPath, "utf8");
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      return Number.isFinite(parsed?.pid) ? parsed : null;
    }

    const pid = Number(trimmed);
    return Number.isFinite(pid) ? { pid } : null;
  } catch {
    return null;
  }
}

async function writeHelperPidRecord(record) {
  await ensureRuntimeDirs();
  await writeFile(helperPidPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

async function clearHelperPidRecord() {
  if (existsSync(helperPidPath)) {
    try {
      await rm(helperPidPath, {
        force: true,
        maxRetries: 5,
        retryDelay: 150
      });
    } catch {
      try {
        await writeFile(helperPidPath, "", "utf8");
        await rm(helperPidPath, { force: true });
      } catch {
        // PID cleanup should not break lifecycle control flow.
      }
    }
  }
}

function isPidRunning(pid) {
  if (!Number.isFinite(pid)) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function spawnPowerShell(command) {
  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      {
        windowsHide: true,
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
        error: error.message,
        stdout,
        stderr
      });
    });

    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function getPortOwnerPid() {
  const command = `
$connection = Get-NetTCPConnection -LocalPort ${helperPort} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
if ($null -eq $connection) { exit 1 }
Write-Output $connection
`;
  const result = await spawnPowerShell(command);
  if (!result.ok) {
    return null;
  }
  const pid = Number(result.stdout);
  return Number.isFinite(pid) ? pid : null;
}

async function stopProcessByPid(pid) {
  if (!Number.isFinite(pid)) {
    return false;
  }

  try {
    process.kill(pid);
    return true;
  } catch {
    return false;
  }
}

async function forceStopProcessByPid(pid) {
  if (!Number.isFinite(pid)) {
    return false;
  }

  const command = `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`;
  const result = await spawnPowerShell(command);
  return result.ok;
}

async function appendLifecycleLog(event, details = {}, stream = "out") {
  try {
    await ensureRuntimeDirs();
    const target = stream === "err" ? lifecycleErrLogPath : lifecycleOutLogPath;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...details
    });
    await appendFile(target, `${line}\n`, "utf8");
  } catch {
    // Lifecycle logging should never block helper control flow.
  }
}

function spawnHelperDetached() {
  const stdoutFd = openSync(helperOutLogPath, "a");
  const stderrFd = openSync(helperErrLogPath, "a");
  const child = spawn("node", [helperScriptPath], {
    cwd: path.join(__dirname, ".."),
    detached: true,
    stdio: ["ignore", stdoutFd, stderrFd],
    windowsHide: true
  });
  child.unref();
  return child.pid;
}

async function readLogTail(filePath, maxLines = 30) {
  try {
    const text = await readFile(filePath, "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

export {
  appendLifecycleLog,
  clearHelperPidRecord,
  ensureRuntimeDirs,
  forceStopProcessByPid,
  getPortOwnerPid,
  helperBaseUrl,
  helperErrLogPath,
  helperOutLogPath,
  helperPidPath,
  isPidRunning,
  lifecycleErrLogPath,
  lifecycleOutLogPath,
  pingHelper,
  readHelperPidRecord,
  readLogTail,
  sleep,
  spawnHelperDetached,
  stopProcessByPid,
  writeHelperPidRecord
};

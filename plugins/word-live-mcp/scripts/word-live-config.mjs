import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.join(__dirname, "..");
const runtimeDir = path.join(pluginRoot, "runtime");
const logsDir = path.join(pluginRoot, "logs");
const helperPort = Number(process.env.WORD_LIVE_HELPER_PORT || 30337);
const helperBaseUrl = `http://127.0.0.1:${helperPort}`;
const helperPidPath = path.join(runtimeDir, "word-helper.pid");
const helperOutLogPath = path.join(logsDir, "word-helper.out.log");
const helperErrLogPath = path.join(logsDir, "word-helper.err.log");
const lifecycleOutLogPath = path.join(logsDir, "word-helper.lifecycle.out.log");
const lifecycleErrLogPath = path.join(logsDir, "word-helper.lifecycle.err.log");
const helperStartupTimeoutMs = Number(process.env.WORD_LIVE_HELPER_STARTUP_TIMEOUT_MS || 8000);
const helperShutdownTimeoutMs = Number(process.env.WORD_LIVE_HELPER_SHUTDOWN_TIMEOUT_MS || 5000);
const helperPollIntervalMs = Number(process.env.WORD_LIVE_HELPER_POLL_INTERVAL_MS || 250);

export {
  __dirname,
  pluginRoot,
  runtimeDir,
  logsDir,
  helperPort,
  helperBaseUrl,
  helperPidPath,
  helperOutLogPath,
  helperErrLogPath,
  lifecycleOutLogPath,
  lifecycleErrLogPath,
  helperStartupTimeoutMs,
  helperShutdownTimeoutMs,
  helperPollIntervalMs
};

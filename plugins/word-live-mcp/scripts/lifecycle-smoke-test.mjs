import {
  doctorHelperLifecycle,
  getHelperStatus,
  restartHelperLifecycle,
  startHelperLifecycle,
  stopHelperLifecycle
} from "./helper-lifecycle.mjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const smokeReportPath = path.join(__dirname, "..", "runtime", "lifecycle-smoke-report.json");

const results = [];

async function runStep(name, fn) {
  try {
    const result = await fn();
    let ok = result.ok !== false;
    if (name === "status_after_stop") {
      ok = result.status === "not_running";
    }
    if (name === "status_before" || name === "status_after_restart" || name === "status_after_start") {
      ok = result.status === "ready";
    }
    results.push({ step: name, ok, result });
  } catch (error) {
    results.push({
      step: name,
      ok: false,
      error: error.stack || String(error)
    });
  }
}

async function finalizeAndExit(payload, exitCode) {
  const text = JSON.stringify(payload, null, 2);
  try {
    await writeFile(smokeReportPath, `${text}\n`, "utf8");
  } catch {
  }
  console.log(text);
  process.exitCode = exitCode;
}

try {
  await runStep("status_before", () => getHelperStatus());
  await runStep("doctor_before", () => doctorHelperLifecycle());
  await runStep("restart", () => restartHelperLifecycle("smoke-test"));
  await runStep("status_after_restart", () => getHelperStatus());
  await runStep("stop", () => stopHelperLifecycle("smoke-test"));
  await runStep("status_after_stop", () => getHelperStatus());
  await runStep("start", () => startHelperLifecycle("smoke-test"));
  await runStep("status_after_start", () => getHelperStatus());

  const ok = results.every((item) => item.ok);
  await finalizeAndExit({ ok, results }, ok ? 0 : 1);
} catch (error) {
  await finalizeAndExit(
    {
      ok: false,
      fatal: error.stack || String(error),
      results
    },
    1
  );
}

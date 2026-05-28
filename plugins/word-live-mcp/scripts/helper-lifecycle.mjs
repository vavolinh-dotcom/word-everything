import {
  appendLifecycleLog,
  clearHelperPidRecord,
  ensureRuntimeDirs,
  forceStopProcessByPid,
  getPortOwnerPid,
  helperBaseUrl,
  helperErrLogPath,
  helperOutLogPath,
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
} from "./helper-shared.mjs";
import {
  helperPollIntervalMs,
  helperPort,
  helperShutdownTimeoutMs,
  helperStartupTimeoutMs,
  logsDir,
  runtimeDir
} from "./word-live-config.mjs";

function buildNextSteps(status) {
  switch (status) {
    case "ready":
      return ["Helper is ready."];
    case "starting":
      return ["Wait a few seconds and run status again."];
    case "stale_pid":
      return ["Run restart to clean stale state and launch a fresh helper."];
    case "unhealthy":
      return [
        "Run restart to recycle the helper.",
        "If the problem persists, inspect the helper logs and confirm Word is open in the desktop session."
      ];
    case "unmanaged_running":
      return [
        "A helper-like process is listening on the port without a managed PID record.",
        "Run stop, then start, to reattach to managed lifecycle state."
      ];
    default:
      return ["Run start to launch the desktop helper."];
  }
}

async function maybeAdoptHealthyHelper(health, pidRecord, notes) {
  const healthPid = Number(health?.pid);
  if (!health?.ok || !Number.isFinite(healthPid)) {
    return {
      adopted: false,
      pidRecord
    };
  }

  const recordMatches =
    pidRecord &&
    Number.isFinite(pidRecord.pid) &&
    pidRecord.pid === healthPid;

  if (recordMatches) {
    return {
      adopted: false,
      pidRecord
    };
  }

  const adoptedRecord = {
    pid: healthPid,
    port: helperPort,
    helperUrl: helperBaseUrl,
    startedAt: health.startedAt || new Date().toISOString(),
    source: pidRecord ? "adopted-from-health-mismatch" : "adopted-from-health"
  };
  await writeHelperPidRecord(adoptedRecord);
  notes.push("Adopted the running helper into managed lifecycle state using health metadata.");
  return {
    adopted: true,
    pidRecord: adoptedRecord
  };
}

async function getHelperStatus() {
  await ensureRuntimeDirs();

  const health = await pingHelper();
  let pidRecord = await readHelperPidRecord();
  const portOwnerPid = await getPortOwnerPid();
  const notes = [];
  const adoption = await maybeAdoptHealthyHelper(health, pidRecord, notes);
  pidRecord = adoption.pidRecord;
  const pid = pidRecord?.pid ?? null;
  const pidRunning = isPidRunning(pid);

  let status = "not_running";
  if (health.ok) {
    if (pidRecord && Number.isFinite(health.pid) && pidRecord.pid === Number(health.pid)) {
      status = "ready";
    } else if (!pidRecord && Number.isFinite(portOwnerPid)) {
      status = "unmanaged_running";
      notes.push("Helper responded to health checks but could not be adopted into managed lifecycle state.");
    } else {
      status = "ready";
    }

    if (pidRecord && !pidRunning) {
      notes.push("PID record exists, but the local process check did not confirm that PID.");
    }
  } else if (pidRecord && pidRunning) {
    const startedAt = pidRecord.startedAt ? Date.parse(pidRecord.startedAt) : null;
    const ageMs = Number.isFinite(startedAt) ? Date.now() - startedAt : null;
    status = ageMs !== null && ageMs < helperStartupTimeoutMs ? "starting" : "unhealthy";
  } else if (pidRecord && !pidRunning) {
    status = "stale_pid";
  } else if (Number.isFinite(portOwnerPid)) {
    status = "unmanaged_running";
  }

  return {
    ok: status === "ready",
    status,
    helperUrl: helperBaseUrl,
    port: helperPort,
    runtimeDir,
    logsDir,
    health,
    pidRecord,
    pidRunning,
    portOwnerPid,
    healthPid: Number.isFinite(Number(health?.pid)) ? Number(health.pid) : null,
    adoptedManagedRecord: adoption.adopted,
    notes,
    nextSteps: buildNextSteps(status)
  };
}

async function waitForStatus(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let snapshot = await getHelperStatus();
  while (!predicate(snapshot) && Date.now() < deadline) {
    await sleep(helperPollIntervalMs);
    snapshot = await getHelperStatus();
  }
  return snapshot;
}

async function startHelperLifecycle(source = "manual") {
  const current = await getHelperStatus();

  if (current.status === "ready") {
    return {
      ok: true,
      action: "noop",
      status: current.status,
      message: "Helper is already running and healthy.",
      snapshot: current
    };
  }

  if (current.status === "starting") {
    const waited = await waitForStatus((s) => s.status !== "starting", helperStartupTimeoutMs);
    if (waited.status === "ready") {
      return {
        ok: true,
        action: "waited",
        status: waited.status,
        message: "Helper finished starting.",
        snapshot: waited
      };
    }
  }

  if (["stale_pid", "unhealthy", "unmanaged_running"].includes(current.status)) {
    await stopHelperLifecycle("auto-repair");
  } else if (current.status === "not_running") {
    await clearHelperPidRecord();
  }

  await appendLifecycleLog("helper-start-requested", {
    source,
    previousStatus: current.status
  });

  const pid = spawnHelperDetached();
  const record = {
    pid,
    port: helperPort,
    helperUrl: helperBaseUrl,
    startedAt: new Date().toISOString(),
    source
  };
  await writeHelperPidRecord(record);
  await appendLifecycleLog("helper-spawned", { pid, source });

  const snapshot = await waitForStatus((s) => s.status === "ready", helperStartupTimeoutMs);
  if (snapshot.status === "ready") {
    return {
      ok: true,
      action: "started",
      status: snapshot.status,
      message: "Helper started successfully.",
      snapshot
    };
  }

  return {
    ok: false,
    action: "started",
    status: snapshot.status,
    error: "Helper did not become ready before the startup timeout expired.",
    snapshot,
    logs: {
      lifecycleStdoutTail: await readLogTail(lifecycleOutLogPath),
      lifecycleStderrTail: await readLogTail(lifecycleErrLogPath),
      stdoutTail: await readLogTail(helperOutLogPath),
      stderrTail: await readLogTail(helperErrLogPath)
    }
  };
}

async function stopHelperLifecycle(source = "manual") {
  const current = await getHelperStatus();

  if (current.status === "not_running") {
    await clearHelperPidRecord();
    return {
      ok: true,
      action: "noop",
      status: "not_running",
      message: "Helper is already stopped.",
      snapshot: await getHelperStatus()
    };
  }

  if (current.status === "unmanaged_running" && !current.health.ok && Number.isFinite(current.portOwnerPid)) {
    const unmanagedPid = current.portOwnerPid;
    await appendLifecycleLog("helper-stop-requested", {
      source,
      previousStatus: current.status,
      targetPid: unmanagedPid
    });
    await forceStopProcessByPid(unmanagedPid);
    const snapshot = await waitForStatus(
      (s) => !s.health.ok && !Number.isFinite(s.portOwnerPid),
      helperShutdownTimeoutMs
    );
    await clearHelperPidRecord();
    const finalSnapshot = await getHelperStatus();
    if (finalSnapshot.status === "not_running") {
      return {
        ok: true,
        action: "stopped",
        status: "not_running",
        message: "Unmanaged helper process stopped successfully.",
        snapshot: finalSnapshot
      };
    }
  }

  const targetPid = current.pidRecord?.pid ?? current.portOwnerPid ?? null;
  await appendLifecycleLog("helper-stop-requested", {
    source,
    previousStatus: current.status,
    targetPid
  });

  if (Number.isFinite(targetPid)) {
    await stopProcessByPid(targetPid);
  }

  let snapshot = await waitForStatus(
    (s) => !s.health.ok && !s.pidRunning && !Number.isFinite(s.portOwnerPid),
    helperShutdownTimeoutMs
  );

  if (snapshot.status !== "not_running") {
    const fallbackPid = snapshot.pidRecord?.pid ?? snapshot.portOwnerPid ?? targetPid;
    if (Number.isFinite(fallbackPid)) {
      await forceStopProcessByPid(fallbackPid);
    }
    snapshot = await waitForStatus(
      (s) => !s.health.ok && !s.pidRunning && !Number.isFinite(s.portOwnerPid),
      helperShutdownTimeoutMs
    );
  }

  await clearHelperPidRecord();
  const finalSnapshot = await getHelperStatus();
  if (finalSnapshot.status === "not_running") {
    return {
      ok: true,
      action: "stopped",
      status: "not_running",
      message: "Helper stopped successfully.",
      snapshot: finalSnapshot
    };
  }

  return {
    ok: false,
    action: "stopped",
    status: finalSnapshot.status,
    error: "Helper did not stop cleanly.",
    snapshot: finalSnapshot,
    logs: {
      lifecycleStdoutTail: await readLogTail(lifecycleOutLogPath),
      lifecycleStderrTail: await readLogTail(lifecycleErrLogPath),
      stdoutTail: await readLogTail(helperOutLogPath),
      stderrTail: await readLogTail(helperErrLogPath)
    }
  };
}

async function restartHelperLifecycle(source = "manual") {
  const stop = await stopHelperLifecycle(`${source}:restart-stop`);
  const start = await startHelperLifecycle(`${source}:restart-start`);
  return {
    ok: Boolean(stop.ok && start.ok),
    action: "restarted",
    status: start.snapshot?.status || stop.snapshot?.status || "unknown",
    stop,
    start
  };
}

async function doctorHelperLifecycle() {
  const snapshot = await getHelperStatus();
  return {
    ok: snapshot.ok,
    helperUrl: helperBaseUrl,
    runtimeDir,
    logsDir,
    snapshot,
    logs: {
      lifecycleStdoutTail: await readLogTail(lifecycleOutLogPath),
      lifecycleStderrTail: await readLogTail(lifecycleErrLogPath),
      stdoutTail: await readLogTail(helperOutLogPath),
      stderrTail: await readLogTail(helperErrLogPath)
    }
  };
}

export {
  doctorHelperLifecycle,
  getHelperStatus,
  restartHelperLifecycle,
  startHelperLifecycle,
  stopHelperLifecycle
};

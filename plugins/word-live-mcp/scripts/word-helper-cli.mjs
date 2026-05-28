import {
  doctorHelperLifecycle,
  getHelperStatus,
  restartHelperLifecycle,
  startHelperLifecycle,
  stopHelperLifecycle
} from "./helper-lifecycle.mjs";

const [command = "status"] = process.argv.slice(2);

const handlers = {
  start: () => startHelperLifecycle("cli"),
  stop: () => stopHelperLifecycle("cli"),
  restart: () => restartHelperLifecycle("cli"),
  status: () => getHelperStatus(),
  doctor: () => doctorHelperLifecycle()
};

if (!handlers[command]) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

const result = await handlers[command]();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ok === false ? 1 : 0;

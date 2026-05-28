import { getHelperStatus } from "./helper-lifecycle.mjs";

const status = await getHelperStatus();
console.log(JSON.stringify(status, null, 2));
process.exitCode = status.ok === false ? 1 : 0;

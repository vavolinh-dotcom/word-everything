import { doctorHelperLifecycle } from "./helper-lifecycle.mjs";

const report = await doctorHelperLifecycle();
console.log(JSON.stringify(report, null, 2));

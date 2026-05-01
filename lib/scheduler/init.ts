import "server-only";
import { startScheduler } from "./cron";

// Boot once per Node runtime.
if (typeof globalThis !== "undefined") {
  const g = globalThis as { __crustopher_scheduler_booted?: boolean };
  if (!g.__crustopher_scheduler_booted) {
    g.__crustopher_scheduler_booted = true;
    startScheduler();
  }
}

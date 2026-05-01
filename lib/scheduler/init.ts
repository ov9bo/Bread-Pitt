import "server-only";
import { startScheduler } from "./cron";

// Boot once per Node runtime.
if (typeof globalThis !== "undefined") {
  const g = globalThis as { __bread_pitt_scheduler_booted?: boolean };
  if (!g.__bread_pitt_scheduler_booted) {
    g.__bread_pitt_scheduler_booted = true;
    startScheduler();
  }
}

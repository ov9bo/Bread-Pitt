import { startScheduler } from "./lib/scheduler/cron";

const g = globalThis as { __bread_pitt_scheduler_booted?: boolean };
if (!g.__bread_pitt_scheduler_booted) {
  g.__bread_pitt_scheduler_booted = true;
  startScheduler();
}

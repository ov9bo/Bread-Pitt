import { startScheduler } from "./lib/scheduler/cron";

const g = globalThis as { __crustopher_scheduler_booted?: boolean };
if (!g.__crustopher_scheduler_booted) {
  g.__crustopher_scheduler_booted = true;
  startScheduler();
}

import { executeAutomationRun } from './automationRunService';

let schedulerStarted = false;
let running = false;

const AUTOMATION_INTERVAL_MS = 60 * 1000;

async function runBackgroundAutomation() {
  if (running) {
    console.log(
      '[Automation] Previous background cycle is still running. Skipping this cycle.'
    );
    return;
  }

  running = true;

  try {
    console.log('[Automation] Starting background cycle...');

    const result = await executeAutomationRun('BACKGROUND');

    console.log(
      `[Automation] Completed. Requests: ${
        result.result.allocationRequestsProcessed
      }, Recommendations: ${
        result.result.recommendationsGenerated
      }, Alerts: ${
        result.result.criticalAlertsCreated +
        result.result.noResourceAlertsCreated +
        result.result.resourceAlertsCreated
      }`
    );
  } catch (error) {
    console.error(
      '[Automation] Background cycle failed:',
      error instanceof Error
        ? error.message
        : error
    );
  } finally {
    running = false;
  }
}

export function startAutomationScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  console.log(
    '[Automation] Background scheduler enabled. Interval: 60 seconds.'
  );

  // Run the first automatic cycle 10 seconds after server startup.
  setTimeout(() => {
    void runBackgroundAutomation();
  }, 10_000);

  // Continue running every 60 seconds.
  setInterval(() => {
    void runBackgroundAutomation();
  }, AUTOMATION_INTERVAL_MS);
}
import { prisma } from '../lib/prisma';
import { runAdminAutomation } from './automationService';

export type AutomationTrigger = 'MANUAL' | 'BACKGROUND';

export async function executeAutomationRun(
  trigger: AutomationTrigger
) {
  const run = await prisma.automationRun.create({
    data: {
      trigger,
      status: 'RUNNING'
    }
  });

  try {
    const result = await runAdminAutomation();

    const completed = await prisma.automationRun.update({
      where: {
        id: run.id
      },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),

        resourceAlertsCreated:
          result.resourceAlertsCreated,

        allocationRequestsProcessed:
          result.allocationRequestsProcessed,

        recommendationsGenerated:
          result.recommendationsGenerated,

        staleRecommendationsReprocessed:
          result.staleRecommendationsReprocessed,

        criticalAlertsCreated:
          result.criticalAlertsCreated,

        noResourceAlertsCreated:
          result.noResourceAlertsCreated
      }
    });

    return {
      run: completed,
      result
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown automation error.';

    const failed = await prisma.automationRun.update({
      where: {
        id: run.id
      },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage: message
      }
    });

    throw Object.assign(
      new Error(message),
      {
        automationRunId: failed.id
      }
    );
  }
}

export async function getAutomationRuns(
  limit = 20
) {
  return prisma.automationRun.findMany({
    orderBy: {
      startedAt: 'desc'
    },
    take: Math.min(
      Math.max(limit, 1),
      100
    )
  });
}

export async function getLatestAutomationRun() {
  return prisma.automationRun.findFirst({
    orderBy: {
      startedAt: 'desc'
    }
  });
}
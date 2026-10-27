import { prisma } from '../lib/prisma';
import { evaluateResourceAlerts } from './alertService';
import { runAllocationEngine } from './allocationEngine';
import { evaluateStaffingShortages } from './staffingService';

let automationRunning = false;

export async function runAdminAutomation() {
  if (automationRunning) {
    throw new Error(
      'Automation cycle is already running.'
    );
  }

  automationRunning = true;

  const startedAt = new Date();

  let resourceAlertsCreated = 0;
  let allocationRequestsProcessed = 0;
  let recommendationsGenerated = 0;
  let staleRecommendationsReprocessed = 0;
  let criticalAlertsCreated = 0;
  let noResourceAlertsCreated = 0;
  let staffingShortageAlertsCreated = 0;

  try {
    // --------------------------------------------------
    // 1. RESOURCE ALERTS
    // --------------------------------------------------

    const resourceAlerts =
      await evaluateResourceAlerts();

    resourceAlertsCreated =
      resourceAlerts.length;

    // --------------------------------------------------
    // 2. STAFFING SHORTAGE DETECTION
    // --------------------------------------------------

    const staffingResults =
      await evaluateStaffingShortages();

    for (const result of staffingResults) {
      const alertType =
        'STAFF_SHORTAGE';

      const resourceType =
        'STAFF';

      const existingAlert =
        await prisma.alert.findFirst({
          where: {
            alertType,
            resourceType,
            resourceId:
              result.departmentId,
            status: 'OPEN',
            message: {
              contains:
                result.role
            }
          }
        });

      if (result.shortage > 0) {
        const severity =
          result.shortage >= 2
            ? 'CRITICAL'
            : 'WARNING';

        const message =
          `${result.departmentName} has a ` +
          `${result.role} staffing shortage. ` +
          `Required: ${result.requiredCount}, ` +
          `Scheduled: ${result.scheduledCount}, ` +
          `Shortage: ${result.shortage}.`;

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              alertType,
              resourceType,
              resourceId:
                result.departmentId,
              message,
              threshold:
                result.requiredCount,
              currentValue:
                result.scheduledCount,
              severity
            }
          });

          staffingShortageAlertsCreated++;
        } else {
          await prisma.alert.update({
            where: {
              id: existingAlert.id
            },
            data: {
              message,
              threshold:
                result.requiredCount,
              currentValue:
                result.scheduledCount,
              severity
            }
          });
        }
      } else if (existingAlert) {
        await prisma.alert.update({
          where: {
            id: existingAlert.id
          },
          data: {
            status: 'RESOLVED',
            currentValue:
              result.scheduledCount,
            resolvedAt: new Date()
          }
        });
      }
    }

    // --------------------------------------------------
    // 3. PENDING BED ALLOCATIONS
    // --------------------------------------------------

    const pendingRequests =
      await prisma.allocationRequest.findMany({
        where: {
          status: 'PENDING',
          resourceType: 'BED'
        },
        include: {
          patient: true,
          decisions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

    allocationRequestsProcessed =
      pendingRequests.length;

    for (const request of pendingRequests) {
      const latestDecision =
        request.decisions[0];

      const shouldReprocess =
        !latestDecision ||
        latestDecision.engineDecision ===
          'NO_SUITABLE_RESOURCE' ||
        Date.now() -
            latestDecision.createdAt.getTime() >
          5 * 60 * 1000;

      if (!shouldReprocess) {
        continue;
      }

      if (latestDecision) {
        staleRecommendationsReprocessed++;
      }

      const result =
        await runAllocationEngine(
          request.id
        );

      recommendationsGenerated++;

      // --------------------------------------------------
      // NO SUITABLE BED
      // --------------------------------------------------

      if (
        result.decision.engineDecision ===
        'NO_SUITABLE_RESOURCE'
      ) {
        const existingAlert =
          await prisma.alert.findFirst({
            where: {
              alertType:
                'NO_SUITABLE_BED',
              resourceType:
                'BED',
              resourceId:
                request.id,
              status: 'OPEN'
            }
          });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              alertType:
                'NO_SUITABLE_BED',
              resourceType:
                'BED',
              resourceId:
                request.id,
              message:
                `No suitable bed is currently available for patient ` +
                `${request.patient.patientId}.`,
              severity:
                request.emergency ||
                request.priority ===
                  'CRITICAL'
                  ? 'CRITICAL'
                  : 'WARNING'
            }
          });

          noResourceAlertsCreated++;
        }
      }

      // --------------------------------------------------
      // CRITICAL ALLOCATION
      // --------------------------------------------------

      if (
        result.decision.engineDecision ===
          'RECOMMENDED' &&
        (request.emergency ||
          request.priority ===
            'CRITICAL')
      ) {
        const existingAlert =
          await prisma.alert.findFirst({
            where: {
              alertType:
                'CRITICAL_ALLOCATION',
              resourceType:
                'BED',
              resourceId:
                request.id,
              status: 'OPEN'
            }
          });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              alertType:
                'CRITICAL_ALLOCATION',
              resourceType:
                'BED',
              resourceId:
                request.id,
              message:
                `Critical bed allocation requires administrator review for patient ` +
                `${request.patient.patientId}.`,
              severity:
                'CRITICAL'
            }
          });

          criticalAlertsCreated++;
        }
      }
    }

    // --------------------------------------------------
    // 4. CHECK EXISTING RECOMMENDATIONS
    // --------------------------------------------------

    const recommendedRequests =
      await prisma.allocationRequest.findMany({
        where: {
          status: 'RECOMMENDED',
          resourceType: 'BED'
        },
        include: {
          decisions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });

    for (const request of recommendedRequests) {
      const decision =
        request.decisions[0];

      if (
        !decision?.recommendedResourceId
      ) {
        continue;
      }

      const bed =
        await prisma.bed.findUnique({
          where: {
            id:
              decision.recommendedResourceId
          }
        });

      if (
        !bed ||
        bed.status !== 'AVAILABLE'
      ) {
        await runAllocationEngine(
          request.id
        );

        staleRecommendationsReprocessed++;
        recommendationsGenerated++;
      }
    }

    // --------------------------------------------------
    // 5. RETURN AUTOMATION RESULT
    // --------------------------------------------------

    return {
      startedAt,
      finishedAt: new Date(),

      resourceAlertsCreated,

      allocationRequestsProcessed,

      recommendationsGenerated,

      staleRecommendationsReprocessed,

      criticalAlertsCreated,

      noResourceAlertsCreated,

      staffingShortageAlertsCreated
    };
  } finally {
    automationRunning = false;
  }
}
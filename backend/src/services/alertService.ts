import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';

const DEFAULT_THRESHOLDS: {
  resourceType: string;
  metric: string;
  thresholdValue: number;
}[] = [
  {
    resourceType: 'ICU',
    metric: 'OCCUPANCY_PERCENT',
    thresholdValue: 90
  },
  {
    resourceType: 'ISOLATION',
    metric: 'OCCUPANCY_PERCENT',
    thresholdValue: 90
  },
  {
    resourceType: 'GENERAL',
    metric: 'OCCUPANCY_PERCENT',
    thresholdValue: 95
  },
  {
    resourceType: 'OT',
    metric: 'UTILIZATION_PERCENT',
    thresholdValue: 90
  }
];

export async function ensureDefaultThresholds() {
  for (const threshold of DEFAULT_THRESHOLDS) {
    await prisma.alertThreshold.upsert({
      where: {
        resourceType_metric: {
          resourceType: threshold.resourceType,
          metric: threshold.metric
        }
      },
      update: {},
      create: threshold
    });
  }
}

export const listThresholds = () =>
  prisma.alertThreshold.findMany({
    orderBy: {
      resourceType: 'asc'
    }
  });

export async function updateThreshold(
  id: string,
  thresholdValue: number,
  actorId: string
) {
  if (thresholdValue < 0 || thresholdValue > 100) {
    throw ApiError.badRequest(
      'Threshold value must be between 0 and 100.'
    );
  }

  const existing = await prisma.alertThreshold.findUnique({
    where: { id }
  });

  if (!existing) {
    throw ApiError.notFound('Alert threshold not found.');
  }

  const updated = await prisma.alertThreshold.update({
    where: { id },
    data: {
      thresholdValue
    }
  });

  await recordAudit({
    userId: actorId,
    action: 'ALERT_THRESHOLD_UPDATED',
    entityType: 'AlertThreshold',
    entityId: id,
    details: {
      previous: existing.thresholdValue,
      updated: thresholdValue
    }
  });

  return updated;
}

/**
 * Creates or resolves occupancy alerts for hospital beds.
 */
async function evaluateBedOccupancyAlerts() {
  const thresholds = await listThresholds();

  const bedTypes = [
    'GENERAL',
    'ICU',
    'ISOLATION'
  ] as const;

  const createdAlerts = [];

  for (const bedType of bedTypes) {
    const total = await prisma.bed.count({
      where: {
        bedType
      }
    });

    if (total === 0) {
      continue;
    }

    const occupied = await prisma.bed.count({
      where: {
        bedType,
        status: 'OCCUPIED'
      }
    });

    const occupancyPercent =
      (occupied / total) * 100;

    const threshold = thresholds.find(
      (item) =>
        item.resourceType === bedType &&
        item.metric === 'OCCUPANCY_PERCENT'
    );

    if (!threshold) {
      continue;
    }

    const existingOpen = await prisma.alert.findFirst({
      where: {
        resourceType: bedType,
        alertType: 'OCCUPANCY_THRESHOLD',
        status: 'OPEN'
      }
    });

    /*
     * Occupancy is above threshold.
     */
    if (occupancyPercent > threshold.thresholdValue) {
      const severity =
        occupancyPercent >= 98
          ? 'CRITICAL'
          : 'WARNING';

      if (!existingOpen) {
        const alert = await prisma.alert.create({
          data: {
            alertType: 'OCCUPANCY_THRESHOLD',
            resourceType: bedType,
            message:
              `${bedType} occupancy has exceeded ` +
              `the configured threshold of ` +
              `${threshold.thresholdValue}%. ` +
              `Current occupancy is ${occupancyPercent.toFixed(1)}%.`,
            threshold: threshold.thresholdValue,
            currentValue: occupancyPercent,
            severity
          }
        });

        createdAlerts.push(alert);
      } else {
        /*
         * Keep an existing alert's live value updated.
         */
        await prisma.alert.update({
          where: {
            id: existingOpen.id
          },
          data: {
            currentValue: occupancyPercent,
            severity
          }
        });
      }
    }

    /*
     * Occupancy has returned to a safe level.
     * Automatically resolve the old monitoring alert.
     */
    if (
      occupancyPercent <= threshold.thresholdValue &&
      existingOpen
    ) {
      await prisma.alert.update({
        where: {
          id: existingOpen.id
        },
        data: {
          status: 'RESOLVED',
          currentValue: occupancyPercent,
          resolvedAt: new Date()
        }
      });
    }
  }

  return createdAlerts;
}

/**
 * Evaluates OT utilization for the current day.
 *
 * Utilization =
 *
 * scheduled OT minutes
 * -------------------- × 100
 * available OT minutes
 *
 * Available OT minutes are calculated from the number
 * of operation theatres × 24 hours.
 *
 * RECOMMENDED and CONFIRMED bookings are included because
 * both represent planned resource usage.
 */
async function evaluateOTUtilizationAlerts() {
  const threshold = await prisma.alertThreshold.findUnique({
    where: {
      resourceType_metric: {
        resourceType: 'OT',
        metric: 'UTILIZATION_PERCENT'
      }
    }
  });

  if (!threshold) {
    return [];
  }

  const theatres = await prisma.operationTheatre.count();

  if (theatres === 0) {
    return [];
  }

  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.oTBooking.findMany({
    where: {
      startTime: {
        lt: endOfDay
      },
      endTime: {
        gt: startOfDay
      },
      status: {
        in: [
          'RECOMMENDED',
          'CONFIRMED',
          'CONFLICT_PENDING_OVERRIDE'
        ]
      }
    },
    select: {
      startTime: true,
      endTime: true
    }
  });

  let scheduledMinutes = 0;

  for (const booking of bookings) {
    const bookingStart =
      booking.startTime > startOfDay
        ? booking.startTime
        : startOfDay;

    const bookingEnd =
      booking.endTime < endOfDay
        ? booking.endTime
        : endOfDay;

    if (bookingEnd > bookingStart) {
      scheduledMinutes +=
        (bookingEnd.getTime() -
          bookingStart.getTime()) /
        60000;
    }
  }

  const availableMinutes =
    theatres * 24 * 60;

  const utilizationPercent =
    (scheduledMinutes / availableMinutes) * 100;

  const existingOpen =
    await prisma.alert.findFirst({
      where: {
        resourceType: 'OT',
        alertType: 'OT_UTILIZATION_THRESHOLD',
        status: 'OPEN'
      }
    });

  if (
    utilizationPercent >
    threshold.thresholdValue
  ) {
    const severity =
      utilizationPercent >= 98
        ? 'CRITICAL'
        : 'WARNING';

    if (!existingOpen) {
      const alert = await prisma.alert.create({
        data: {
          alertType: 'OT_UTILIZATION_THRESHOLD',
          resourceType: 'OT',
          message:
            `Operation theatre utilization has exceeded ` +
            `the configured threshold of ` +
            `${threshold.thresholdValue}%. ` +
            `Current utilization is ` +
            `${utilizationPercent.toFixed(1)}%.`,
          threshold: threshold.thresholdValue,
          currentValue: utilizationPercent,
          severity
        }
      });

      return [alert];
    }

    await prisma.alert.update({
      where: {
        id: existingOpen.id
      },
      data: {
        currentValue: utilizationPercent,
        severity
      }
    });

    return [];
  }

  /*
   * Automatically resolve the alert when OT utilization
   * falls back below the configured threshold.
   */
  if (
    utilizationPercent <=
      threshold.thresholdValue &&
    existingOpen
  ) {
    await prisma.alert.update({
      where: {
        id: existingOpen.id
      },
      data: {
        status: 'RESOLVED',
        currentValue: utilizationPercent,
        resolvedAt: new Date()
      }
    });
  }

  return [];
}

/**
 * Main hospital resource monitoring function.
 *
 * Called by:
 * - allocation workflows
 * - dashboard/manual re-evaluation
 * - automated background scheduler
 */
export async function evaluateResourceAlerts() {
  await ensureDefaultThresholds();

  const bedAlerts =
    await evaluateBedOccupancyAlerts();

  const otAlerts =
    await evaluateOTUtilizationAlerts();

  return [
    ...bedAlerts,
    ...otAlerts
  ];
}

export const listAlerts = (status?: string) =>
  prisma.alert.findMany({
    where: status
      ? {
          status: status as any
        }
      : undefined,
    orderBy: {
      createdAt: 'desc'
    }
  });

export async function resolveAlert(
  id: string,
  actorId: string
) {
  const alert = await prisma.alert.findUnique({
    where: { id }
  });

  if (!alert) {
    throw ApiError.notFound(
      'Alert not found.'
    );
  }

  if (alert.status === 'RESOLVED') {
    throw ApiError.badRequest(
      'Alert is already resolved.'
    );
  }

  const updated =
    await prisma.alert.update({
      where: {
        id
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date()
      }
    });

  await recordAudit({
    userId: actorId,
    action: 'ALERT_RESOLVED',
    entityType: 'Alert',
    entityId: id
  });

  return updated;
}
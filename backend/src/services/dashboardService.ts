import { prisma } from '../lib/prisma';

export async function getDashboardSummary() {
  const [totalBeds, availableBeds, occupiedBeds, reservedBeds, maintenanceBeds] = await Promise.all([
    prisma.bed.count(),
    prisma.bed.count({ where: { status: 'AVAILABLE' } }),
    prisma.bed.count({ where: { status: 'OCCUPIED' } }),
    prisma.bed.count({ where: { status: 'RESERVED' } }),
    prisma.bed.count({ where: { status: 'MAINTENANCE' } })
  ]);

  const [icuTotal, icuAvailable, icuOccupied] = await Promise.all([
    prisma.bed.count({ where: { bedType: 'ICU' } }),
    prisma.bed.count({ where: { bedType: 'ICU', status: 'AVAILABLE' } }),
    prisma.bed.count({ where: { bedType: 'ICU', status: 'OCCUPIED' } })
  ]);

  const [isoTotal, isoAvailable, isoOccupied] = await Promise.all([
    prisma.bed.count({ where: { bedType: 'ISOLATION' } }),
    prisma.bed.count({ where: { bedType: 'ISOLATION', status: 'AVAILABLE' } }),
    prisma.bed.count({ where: { bedType: 'ISOLATION', status: 'OCCUPIED' } })
  ]);

  const [otTotal, otAvailable, otInUse, upcomingBookings, conflictPending, emergencyOverridesPending] =
    await Promise.all([
      prisma.operationTheatre.count(),
      prisma.operationTheatre.count({ where: { status: 'AVAILABLE' } }),
      prisma.operationTheatre.count({ where: { status: 'IN_USE' } }),
      prisma.oTBooking.count({ where: { status: { in: ['RECOMMENDED', 'CONFIRMED'] }, startTime: { gte: new Date() } } }),
      prisma.oTBooking.count({ where: { status: 'CONFLICT_PENDING_OVERRIDE' } }),
      prisma.emergencyOverride.count({ where: { status: 'PENDING' } })
    ]);

  const [totalDoctors, totalNurses, publishedRosters, draftRosters] = await Promise.all([
    prisma.user.count({ where: { role: 'DOCTOR' } }),
    prisma.user.count({ where: { role: 'NURSE' } }),
    prisma.dutyRoster.count({ where: { status: 'PUBLISHED' } }),
    prisma.dutyRoster.count({ where: { status: 'DRAFT' } })
  ]);

  const [pendingAllocations, recommendedAllocations, approvedAllocations, rejectedAllocations, emergencyRequests] =
    await Promise.all([
      prisma.allocationRequest.count({ where: { status: 'PENDING' } }),
      prisma.allocationRequest.count({ where: { status: 'RECOMMENDED' } }),
      prisma.allocationRequest.count({ where: { status: 'ALLOCATED' } }),
      prisma.allocationRequest.count({ where: { status: 'REJECTED' } }),
      prisma.allocationRequest.count({ where: { emergency: true, status: { in: ['PENDING', 'RECOMMENDED'] } } })
    ]);

  const openAlerts = await prisma.alert.count({ where: { status: 'OPEN' } });

  return {
    beds: {
      total: totalBeds,
      available: availableBeds,
      occupied: occupiedBeds,
      reserved: reservedBeds,
      maintenance: maintenanceBeds
    },
    icu: {
      total: icuTotal,
      available: icuAvailable,
      occupied: icuOccupied,
      occupancyPercent: icuTotal ? Math.round((icuOccupied / icuTotal) * 1000) / 10 : 0
    },
    isolation: {
      total: isoTotal,
      available: isoAvailable,
      occupied: isoOccupied,
      occupancyPercent: isoTotal ? Math.round((isoOccupied / isoTotal) * 1000) / 10 : 0
    },
    operationTheatres: {
      total: otTotal,
      available: otAvailable,
      inUse: otInUse,
      upcomingBookings,
      conflictsPendingOverride: conflictPending,
      emergencyRequestsPending: emergencyOverridesPending
    },
    staff: {
      totalDoctors,
      totalNurses,
      publishedRosters,
      draftRosters
    },
    allocation: {
      pending: pendingAllocations,
      recommended: recommendedAllocations,
      approved: approvedAllocations,
      rejected: rejectedAllocations,
      emergencyRequests
    },
    alerts: {
      open: openAlerts
    }
  };
}

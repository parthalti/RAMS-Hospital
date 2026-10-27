import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { evaluateBedAllocation, isBedStillAvailable } from './bedAllocationService';
import { evaluateOTAllocation } from './otAllocationService';
import { recordAudit } from './auditService';
import { generateAllocationRequestId } from '../utils/idGenerator';
import { Prisma } from '@prisma/client';

/**
 * IMPORTANT BUSINESS RULE (spec section 36):
 * The allocation engine RECOMMENDS. It never finalizes an allocation on its own.
 * ENGINE -> RECOMMENDATION -> ADMIN REVIEW -> APPROVAL -> FINAL ALLOCATION
 */

// ---------------------------------------------------------------------------
// Step 0: Create a new allocation request (nurse/doctor initiated) and
// immediately run the engine once so admins see a recommendation right away.
// ---------------------------------------------------------------------------
export async function createAllocationRequest(input: {
  patientId: string;
  resourceType: 'BED' | 'OT';
  requestedBy: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  emergency?: boolean;
}) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw ApiError.notFound('Patient not found.');

  const requestId = await generateAllocationRequestId();

  const request = await prisma.allocationRequest.create({
    data: {
      requestId,
      patientId: input.patientId,
      requestedBy: input.requestedBy,
      resourceType: input.resourceType,
      priority: input.priority ?? patient.priority,
      emergency: input.emergency ?? patient.emergency,
      status: 'PENDING'
    }
  });

  await recordAudit({
    userId: input.requestedBy,
    action: 'ALLOCATION_REQUEST_CREATED',
    entityType: 'AllocationRequest',
    entityId: request.id,
    details: { patientId: input.patientId, resourceType: input.resourceType }
  });

  // Immediately run the engine for BED requests so a recommendation is ready for review.
  if (input.resourceType === 'BED') {
    await runAllocationEngine(request.id);
  }

  return prisma.allocationRequest.findUnique({
    where: { id: request.id },
    include: { decisions: true, patient: true }
  });
}

// ---------------------------------------------------------------------------
// Step 1: Run the engine against a pending AllocationRequest and persist a
// recommendation (AllocationDecision). Does NOT allocate anything.
// ---------------------------------------------------------------------------
export async function runAllocationEngine(allocationRequestId: string) {
  const request = await prisma.allocationRequest.findUnique({
    where: { id: allocationRequestId },
    include: { patient: true }
  });
  if (!request) throw ApiError.notFound('Allocation request not found.');
  if (request.status !== 'PENDING' && request.status !== 'RECOMMENDED') {
    throw ApiError.badRequest(`Cannot run the allocation engine on a request with status ${request.status}.`);
  }

  if (request.resourceType === 'BED') {
    const result = await evaluateBedAllocation(request.patient, {
      priority: request.priority,
      emergency: request.emergency
    });

    const decision = await prisma.allocationDecision.create({
      data: {
        allocationRequestId: request.id,
        recommendedResourceId: result.bed?.id ?? null,
        recommendationReason: result.reason,
        criteriaEvaluated: result.criteriaEvaluated as unknown as Prisma.InputJsonValue,
        engineDecision: result.bed ? 'RECOMMENDED' : 'NO_SUITABLE_RESOURCE'
      }
    });

    const updated = await prisma.allocationRequest.update({
      where: { id: request.id },
      data: {
        status: result.bed ? 'RECOMMENDED' : 'PENDING',
        criteriaEvaluated: result.criteriaEvaluated as unknown as Prisma.InputJsonValue
      }
    });

    await recordAudit({
      action: 'ALLOCATION_RECOMMENDATION_GENERATED',
      entityType: 'AllocationRequest',
      entityId: request.id,
      details: { resourceType: 'BED', recommendedResourceId: result.bed?.id ?? null }
    });

    return { request: updated, decision, alternatives: result.alternatives };
  }

  if (request.resourceType === 'OT') {
    if (!request.requestedResourceId) {
      throw ApiError.badRequest('An OT allocation request requires OT booking context (use the OT booking flow).');
    }
    // For OT, the recommendation is generated as part of createOTBooking; this
    // path exists for symmetry / re-evaluation on demand.
    throw ApiError.badRequest('OT allocation requests are evaluated through the OT booking workflow.');
  }

  throw ApiError.badRequest('Unsupported resource type.');
}

// ---------------------------------------------------------------------------
// Step 2: Admin approves a recommended allocation. MUST re-check availability
// inside a transaction before finalizing, to guard against race conditions.
// ---------------------------------------------------------------------------
export async function approveAllocation(allocationRequestId: string, adminId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.allocationRequest.findUnique({
      where: { id: allocationRequestId },
      include: { decisions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!request) throw ApiError.notFound('Allocation request not found.');
    if (request.status !== 'RECOMMENDED') {
      throw ApiError.badRequest(`Only a RECOMMENDED request can be approved (current status: ${request.status}).`);
    }
    const latestDecision = request.decisions[0];
    if (!latestDecision || !latestDecision.recommendedResourceId) {
      throw ApiError.badRequest('No recommended resource is attached to this request.');
    }

    if (request.resourceType === 'BED') {
      // Re-check availability INSIDE the transaction - never trust the earlier recommendation blindly.
      const bed = await tx.bed.findUnique({ where: { id: latestDecision.recommendedResourceId } });
      if (!bed || bed.status !== 'AVAILABLE') {
        // Recommendation is stale. Mark this decision as failed and regenerate a fresh one
        // outside of allocation (caller should re-run the engine).
        await tx.allocationRequest.updateMany({ where: { id: request.id, status: 'RECOMMENDED' }, data: { status: 'PENDING' } });
        await recordAudit(
          {
            userId: adminId,
            action: 'ALLOCATION_APPROVAL_FAILED_STALE_RESOURCE',
            entityType: 'AllocationRequest',
            entityId: request.id,
            details: { staleResourceId: latestDecision.recommendedResourceId }
          },
          tx
        );
        return { __conflict: true as const };
      }

      // Atomic compare-and-set: only one concurrent approval can change AVAILABLE -> OCCUPIED.
      // PostgreSQL re-checks the predicate after waiting for a concurrent row update.
      const claim = await tx.bed.updateMany({
        where: { id: bed.id, status: 'AVAILABLE', currentPatientId: null },
        data: { status: 'OCCUPIED', currentPatientId: request.patientId }
      });
      if (claim.count !== 1) {
        await tx.allocationRequest.updateMany({ where: { id: request.id, status: 'RECOMMENDED' }, data: { status: 'PENDING' } });
        await recordAudit({
          userId: adminId,
          action: 'ALLOCATION_APPROVAL_FAILED_STALE_RESOURCE',
          entityType: 'AllocationRequest',
          entityId: request.id,
          details: { staleResourceId: bed.id }
        }, tx);
        return { __conflict: true as const };
      }
      const updatedBed = await tx.bed.findUniqueOrThrow({ where: { id: bed.id } });
      await tx.patient.update({ where: { id: request.patientId }, data: { admissionStatus: 'ADMITTED' } });
      await tx.allocationRequest.update({ where: { id: request.id }, data: { status: 'ALLOCATED' } });
      await tx.allocationDecision.update({
        where: { id: latestDecision.id },
        data: { adminDecision: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() }
      });
      await recordAudit(
        {
          userId: adminId,
          action: 'ALLOCATION_APPROVED',
          entityType: 'AllocationRequest',
          entityId: request.id,
          details: { bedId: updatedBed.id, patientId: request.patientId }
        },
        tx
      );

      return { request: await tx.allocationRequest.findUnique({ where: { id: request.id } }), bed: updatedBed };
    }

    throw ApiError.badRequest('Approval for this resource type is not supported through this endpoint.');
  });

  if ('__conflict' in result) {
    throw ApiError.conflict(
      'Recommended resource is no longer available. The request has been returned to PENDING; please re-run the allocation engine for a new recommendation.'
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// Step 3: Admin rejects a recommendation.
// ---------------------------------------------------------------------------
export async function rejectAllocation(allocationRequestId: string, adminId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.allocationRequest.findUnique({
      where: { id: allocationRequestId },
      include: { decisions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!request) throw ApiError.notFound('Allocation request not found.');
    if (request.status === 'ALLOCATED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
      throw ApiError.badRequest(`Cannot reject a request with status ${request.status}.`);
    }

    const updated = await tx.allocationRequest.update({ where: { id: request.id }, data: { status: 'REJECTED' } });
    const latestDecision = request.decisions[0];
    if (latestDecision) {
      await tx.allocationDecision.update({
        where: { id: latestDecision.id },
        data: { adminDecision: 'REJECTED', rejectionReason: reason, reviewedBy: adminId, reviewedAt: new Date() }
      });
    }
    await recordAudit(
      { userId: adminId, action: 'ALLOCATION_REJECTED', entityType: 'AllocationRequest', entityId: request.id, details: { reason } },
      tx
    );
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 4: Admin manually selects a different resource than the one recommended
// (or chooses one when the engine found nothing suitable). Preserves both the
// engine's original recommendation and the final admin decision.
// ---------------------------------------------------------------------------
export async function manualAllocation(
  allocationRequestId: string,
  resourceId: string,
  adminId: string,
  reason: string
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.allocationRequest.findUnique({
      where: { id: allocationRequestId },
      include: { decisions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!request) throw ApiError.notFound('Allocation request not found.');
    if (request.status === 'ALLOCATED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
      throw ApiError.badRequest(`Cannot manually allocate a request with status ${request.status}.`);
    }

    if (request.resourceType === 'BED') {
      const bed = await tx.bed.findUnique({ where: { id: resourceId } });
      if (!bed || bed.status !== 'AVAILABLE') {
        throw ApiError.conflict('Selected bed is not currently available.');
      }
      const updatedBed = await tx.bed.update({
        where: { id: bed.id },
        data: { status: 'OCCUPIED', currentPatientId: request.patientId }
      });
      await tx.patient.update({ where: { id: request.patientId }, data: { admissionStatus: 'ADMITTED' } });
      await tx.allocationRequest.update({ where: { id: request.id }, data: { status: 'ALLOCATED' } });

      const latestDecision = request.decisions[0];
      if (latestDecision) {
        await tx.allocationDecision.update({
          where: { id: latestDecision.id },
          data: {
            adminDecision: 'MANUAL_OVERRIDE',
            alternativeResourceId: bed.id,
            rejectionReason: reason,
            reviewedBy: adminId,
            reviewedAt: new Date()
          }
        });
      } else {
        await tx.allocationDecision.create({
          data: {
            allocationRequestId: request.id,
            recommendedResourceId: null,
            recommendationReason: 'No engine recommendation was available prior to manual allocation.',
            engineDecision: 'NO_SUITABLE_RESOURCE',
            adminDecision: 'MANUAL_OVERRIDE',
            alternativeResourceId: bed.id,
            rejectionReason: reason,
            reviewedBy: adminId,
            reviewedAt: new Date()
          }
        });
      }

      await recordAudit(
        {
          userId: adminId,
          action: 'ALLOCATION_MANUAL_OVERRIDE',
          entityType: 'AllocationRequest',
          entityId: request.id,
          details: { bedId: bed.id, reason }
        },
        tx
      );

      return { request: await tx.allocationRequest.findUnique({ where: { id: request.id } }), bed: updatedBed };
    }

    throw ApiError.badRequest('Manual allocation for this resource type is not supported through this endpoint.');
  });
}

export { isBedStillAvailable };

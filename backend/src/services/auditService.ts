import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type TxClient = Prisma.TransactionClient | PrismaClient;

interface AuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput, client: TxClient = prisma) {
  return client.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ? (input.details as Prisma.InputJsonValue) : undefined
    }
  });
}

export async function listAuditLogs(params: { entityType?: string; userId?: string; limit?: number }) {
  return prisma.auditLog.findMany({
    where: {
      entityType: params.entityType,
      userId: params.userId
    },
    include: { user: { select: { id: true, name: true, role: true, email: true } } },
    orderBy: { timestamp: 'desc' },
    take: params.limit ?? 200
  });
}

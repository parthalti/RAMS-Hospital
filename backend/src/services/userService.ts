import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from './authService';
import { generateUserId } from '../utils/idGenerator';
import { recordAudit } from './auditService';

export const listUsers = () =>
  prisma.user.findMany({
    select: { id: true, userId: true, name: true, email: true, role: true, departmentId: true, createdAt: true, department: true },
    orderBy: { createdAt: 'desc' }
  });

export async function createUser(
  data: { name: string; email: string; password: string; role: any; departmentId?: string },
  actorId: string
) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists.');

  const passwordHash = await hashPassword(data.password);
  const userId = await generateUserId(data.role);

  const user = await prisma.user.create({
    data: {
      userId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      departmentId: data.departmentId
    }
  });

  await recordAudit({ userId: actorId, action: 'USER_CREATED', entityType: 'User', entityId: user.id, details: { role: data.role } });

  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}

export const getCurrentUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, userId: true, name: true, email: true, role: true, departmentId: true, department: true }
  });
  if (!user) throw ApiError.notFound('User not found.');
  return user;
};

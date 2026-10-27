import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './auditService';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password.');

  const payload = {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
    email: user.email,
    name: user.name
  };

  const secret = process.env.JWT_SECRET as string;
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

  await recordAudit({
    userId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id
  });

  return {
    token,
    user: {
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId
    }
  };
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

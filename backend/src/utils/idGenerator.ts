import { prisma } from '../lib/prisma';

async function nextSequentialId(prefix: string, countFn: () => Promise<number>): Promise<string> {
  const count = await countFn();
  const next = count + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

export const generatePatientId = () =>
  nextSequentialId('PAT', () => prisma.patient.count());

export const generateUserId = (role: string) =>
  nextSequentialId(role.slice(0, 3).toUpperCase(), () => prisma.user.count());

export const generateBookingId = () =>
  nextSequentialId('OTB', () => prisma.oTBooking.count());

export const generateAllocationRequestId = () =>
  nextSequentialId('AR', () => prisma.allocationRequest.count());

export const generateOverrideId = () =>
  nextSequentialId('EO', () => prisma.emergencyOverride.count());

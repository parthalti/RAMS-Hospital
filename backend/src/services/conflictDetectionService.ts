import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface ConflictCheckInput {
  operationTheatreId: string;
  startTime: Date;
  endTime: Date;
  excludeBookingId?: string;
}

// Two half-open intervals [startA, endA) and [startB, endB) overlap iff
// startA < endB AND startB < endA. Under this rule a booking ending at 12:00
// does NOT conflict with one starting at 12:00 (back-to-back bookings are allowed).
export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

// Queries existing CONFIRMED / PENDING-recommended bookings for the same OT from
// the database (never trust frontend-only conflict detection) and returns any
// bookings whose time range overlaps the requested range.
export async function findConflictingBookings(input: ConflictCheckInput) {
  const activeStatuses: Prisma.OTBookingWhereInput['status'] = {
    in: ['CONFIRMED', 'RECOMMENDED', 'PENDING']
  };

  const candidates = await prisma.oTBooking.findMany({
    where: {
      operationTheatreId: input.operationTheatreId,
      status: activeStatuses,
      id: input.excludeBookingId ? { not: input.excludeBookingId } : undefined
    },
    include: { patient: true, doctor: true }
  });

  return candidates.filter((booking) =>
    intervalsOverlap(input.startTime, input.endTime, booking.startTime, booking.endTime)
  );
}

export async function hasConflict(input: ConflictCheckInput): Promise<boolean> {
  const conflicts = await findConflictingBookings(input);
  return conflicts.length > 0;
}

// Suggests alternative slots for the same OT: the same duration, later on the
// same day, checked one at a time against existing bookings, plus the same slot
// on the following two days as a fallback.
export async function suggestAlternativeSlots(
  operationTheatreId: string,
  startTime: Date,
  endTime: Date,
  maxSuggestions = 3
) {
  const durationMs = endTime.getTime() - startTime.getTime();
  const suggestions: { startTime: Date; endTime: Date }[] = [];

  // Try later same-day slots in 30-minute increments up to 18:00.
  let candidateStart = new Date(endTime);
  const dayEnd = new Date(startTime);
  dayEnd.setHours(18, 0, 0, 0);

  while (candidateStart < dayEnd && suggestions.length < maxSuggestions) {
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);
    const conflict = await hasConflict({ operationTheatreId, startTime: candidateStart, endTime: candidateEnd });
    if (!conflict) suggestions.push({ startTime: new Date(candidateStart), endTime: candidateEnd });
    candidateStart = new Date(candidateStart.getTime() + 30 * 60 * 1000);
  }

  // Fallback: same time slot on subsequent days.
  for (let dayOffset = 1; dayOffset <= 3 && suggestions.length < maxSuggestions; dayOffset++) {
    const altStart = new Date(startTime);
    altStart.setDate(altStart.getDate() + dayOffset);
    const altEnd = new Date(endTime);
    altEnd.setDate(altEnd.getDate() + dayOffset);
    const conflict = await hasConflict({ operationTheatreId, startTime: altStart, endTime: altEnd });
    if (!conflict) suggestions.push({ startTime: altStart, endTime: altEnd });
  }

  return suggestions;
}

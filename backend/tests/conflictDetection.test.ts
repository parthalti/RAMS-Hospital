import { intervalsOverlap } from '../src/services/conflictDetectionService';

describe('intervalsOverlap (OT conflict overlap rule)', () => {
  it('detects overlap when a new booking starts inside an existing one', () => {
    // Existing: 10:00-12:00, New: 11:00-13:00 -> CONFLICT
    const existingStart = new Date('2026-01-01T10:00:00Z');
    const existingEnd = new Date('2026-01-01T12:00:00Z');
    const newStart = new Date('2026-01-01T11:00:00Z');
    const newEnd = new Date('2026-01-01T13:00:00Z');
    expect(intervalsOverlap(newStart, newEnd, existingStart, existingEnd)).toBe(true);
  });

  it('does NOT flag back-to-back bookings as a conflict (end time is available for the next booking)', () => {
    // Existing: 10:00-12:00, New: 12:00-14:00 -> NO CONFLICT
    const existingStart = new Date('2026-01-01T10:00:00Z');
    const existingEnd = new Date('2026-01-01T12:00:00Z');
    const newStart = new Date('2026-01-01T12:00:00Z');
    const newEnd = new Date('2026-01-01T14:00:00Z');
    expect(intervalsOverlap(newStart, newEnd, existingStart, existingEnd)).toBe(false);
  });

  it('detects overlap when the new booking fully contains the existing one', () => {
    const existingStart = new Date('2026-01-01T10:00:00Z');
    const existingEnd = new Date('2026-01-01T11:00:00Z');
    const newStart = new Date('2026-01-01T09:00:00Z');
    const newEnd = new Date('2026-01-01T12:00:00Z');
    expect(intervalsOverlap(newStart, newEnd, existingStart, existingEnd)).toBe(true);
  });

  it('does not flag entirely separate time windows as conflicting', () => {
    const existingStart = new Date('2026-01-01T10:00:00Z');
    const existingEnd = new Date('2026-01-01T11:00:00Z');
    const newStart = new Date('2026-01-01T14:00:00Z');
    const newEnd = new Date('2026-01-01T15:00:00Z');
    expect(intervalsOverlap(newStart, newEnd, existingStart, existingEnd)).toBe(false);
  });
});

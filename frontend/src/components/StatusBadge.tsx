import React from 'react';

const COLOR_MAP: Record<string, string> = {
  AVAILABLE: 'badge-green',
  OCCUPIED: 'badge-blue',
  RESERVED: 'badge-yellow',
  MAINTENANCE: 'badge-gray',
  PENDING: 'badge-yellow',
  RECOMMENDED: 'badge-blue',
  CONFIRMED: 'badge-green',
  ALLOCATED: 'badge-green',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  CANCELLED: 'badge-gray',
  CONFLICT_PENDING_OVERRIDE: 'badge-red',
  ADMITTED: 'badge-green',
  DISCHARGED: 'badge-gray',
  OPEN: 'badge-red',
  RESOLVED: 'badge-gray',
  DRAFT: 'badge-gray',
  PUBLISHED: 'badge-green',
  LOW: 'badge-gray',
  MEDIUM: 'badge-blue',
  HIGH: 'badge-yellow',
  CRITICAL: 'badge-red',
  INFO: 'badge-blue',
  WARNING: 'badge-yellow'
};

export function StatusBadge({ status }: { status: string }) {
  const cls = COLOR_MAP[status] || 'badge-gray';
  return <span className={`badge ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}

import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { Bed } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

export function BedsPage() {
  const { user } = useAuth();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('bedType', typeFilter);
      const res = await api.get<{ data: Bed[] }>(`/beds?${params.toString()}`);
      setBeds(res.data);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load beds.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const canManage = user && ['ADMIN', 'NURSE'].includes(user.role);
  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE');

  async function release(bedId: string) {
    setActionMessage(null);
    try {
      await api.post(`/beds/${bedId}/release`);
      setActionMessage('Bed released successfully.');
      await load();
    } catch (e) {
      setActionMessage(e instanceof ApiRequestError ? e.message : 'Failed to release bed.');
    }
  }

  async function reassign(bedId: string) {
    const targetBedId = reassignTarget[bedId];
    if (!targetBedId) return;
    setActionMessage(null);
    try {
      await api.post(`/beds/${bedId}/reassign`, { targetBedId });
      setActionMessage('Patient reassigned successfully.');
      await load();
    } catch (e) {
      setActionMessage(e instanceof ApiRequestError ? e.message : 'Failed to reassign bed.');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Beds</h1>
        <p className="text-sm text-slate-500">Live bed inventory across all wards.</p>
      </div>

      <div className="flex gap-3">
        <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="RESERVED">Reserved</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
        <select className="input w-40" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All bed types</option>
          <option value="GENERAL">General</option>
          <option value="ICU">ICU</option>
          <option value="ISOLATION">Isolation</option>
        </select>
      </div>

      {actionMessage && <p className="text-xs text-slate-500">{actionMessage}</p>}

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState label="Loading beds..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : beds.length === 0 ? (
          <EmptyState message="No beds match these filters." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Bed</th>
                <th className="table-th">Ward</th>
                <th className="table-th">Type</th>
                <th className="table-th">Department</th>
                <th className="table-th">Status</th>
                <th className="table-th">Patient</th>
                {canManage && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {beds.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{b.bedNumber}</td>
                  <td className="table-td">{b.ward}</td>
                  <td className="table-td">{b.bedType}</td>
                  <td className="table-td">{b.department?.name}</td>
                  <td className="table-td">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="table-td">{b.currentPatient?.name || '-'}</td>
                  {canManage && (
                    <td className="table-td">
                      {b.status === 'OCCUPIED' && (
                        <div className="flex items-center gap-2">
                          <button className="btn btn-secondary" onClick={() => release(b.id)}>
                            Release
                          </button>
                          <select
                            className="input w-32"
                            value={reassignTarget[b.id] || ''}
                            onChange={(e) => setReassignTarget({ ...reassignTarget, [b.id]: e.target.value })}
                          >
                            <option value="">Move to...</option>
                            {availableBeds
                              .filter((ab) => ab.bedType === b.bedType)
                              .map((ab) => (
                                <option key={ab.id} value={ab.id}>
                                  {ab.bedNumber}
                                </option>
                              ))}
                          </select>
                          <button className="btn btn-primary" disabled={!reassignTarget[b.id]} onClick={() => reassign(b.id)}>
                            Move
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

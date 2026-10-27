import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { EmergencyOverride } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

export function EmergencyOverridesPage() {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<EmergencyOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: EmergencyOverride[] }>('/emergency-requests');
      setOverrides(res.data);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load emergency override requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canDecide = user?.role === 'ADMIN';

  async function decide(id: string, approve: boolean) {
    const reason = window.prompt(`Reason for ${approve ? 'approving' : 'rejecting'} this override:`);
    if (!reason) return;
    setBusyId(id);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>(`/emergency-requests/${id}/${approve ? 'approve' : 'reject'}`, { reason });
      setMessage(res.message);
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to record decision.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Emergency Overrides</h1>
        <p className="text-sm text-slate-500">
          Emergency OT requests that conflict with an existing booking. Approving bumps the conflicting booking; rejecting
          leaves it untouched.
        </p>
      </div>

      {message && <p className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{message}</p>}

      <div className="space-y-3">
        {loading ? (
          <LoadingState label="Loading emergency requests..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : overrides.length === 0 ? (
          <EmptyState message="No emergency override requests." />
        ) : (
          overrides.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-slate-800">{o.overrideId}</p>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-sm text-slate-600 mb-1">{o.conflictDetails}</p>
              <p className="text-xs text-slate-400">Recommended action: {o.recommendedAction}</p>
              {canDecide && o.status === 'PENDING' && (
                <div className="flex items-center gap-2 mt-3">
                  <button className="btn btn-success" disabled={busyId === o.id} onClick={() => decide(o.id, true)}>
                    Approve Override
                  </button>
                  <button className="btn btn-danger" disabled={busyId === o.id} onClick={() => decide(o.id, false)}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { Alert } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

export function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Alert[] }>('/alerts');
      setAlerts(res.data);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load alerts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string) {
    setMessage(null);
    try {
      await api.put(`/alerts/${id}/resolve`);
      setMessage('Alert resolved.');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to resolve alert.');
    }
  }

  async function evaluate() {
    setMessage(null);
    try {
      await api.post('/alerts/evaluate');
      setMessage('Alert evaluation re-run against current occupancy.');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to evaluate alerts.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Alerts</h1>
          <p className="text-sm text-slate-500">Threshold-based resource alerts, generated from live occupancy data.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button className="btn btn-secondary" onClick={evaluate}>
            Re-evaluate Now
          </button>
        )}
      </div>

      {message && <p className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{message}</p>}

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState label="Loading alerts..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : alerts.length === 0 ? (
          <EmptyState message="No alerts." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Type</th>
                <th className="table-th">Message</th>
                <th className="table-th">Severity</th>
                <th className="table-th">Status</th>
                {user?.role === 'ADMIN' && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td className="table-td">{a.resourceType}</td>
                  <td className="table-td">{a.message}</td>
                  <td className="table-td">
                    <StatusBadge status={a.severity} />
                  </td>
                  <td className="table-td">
                    <StatusBadge status={a.status} />
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="table-td">
                      {a.status === 'OPEN' && (
                        <button className="btn btn-secondary" onClick={() => resolve(a.id)}>
                          Resolve
                        </button>
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

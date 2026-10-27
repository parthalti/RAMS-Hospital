import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { AuditLog } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: AuditLog[] }>('/audit-logs')
      .then((res) => setLogs(res.data))
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Unable to load audit logs.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500">Complete record of significant administrative actions.</p>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState label="Loading audit logs..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : logs.length === 0 ? (
          <EmptyState message="No audit log entries yet." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Timestamp</th>
                <th className="table-th">User</th>
                <th className="table-th">Action</th>
                <th className="table-th">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="table-td whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="table-td">{l.user ? `${l.user.name} (${l.user.role})` : 'System'}</td>
                  <td className="table-td font-medium">{l.action.replace(/_/g, ' ')}</td>
                  <td className="table-td">
                    {l.entityType}
                    {l.entityId ? ` #${l.entityId.slice(0, 8)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

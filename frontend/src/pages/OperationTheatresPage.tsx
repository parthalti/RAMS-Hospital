import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { OperationTheatre } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';

export function OperationTheatresPage() {
  const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: OperationTheatre[] }>('/ots')
      .then((res) => setTheatres(res.data))
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Unable to load operation theatres.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Operation Theatres</h1>
        <p className="text-sm text-slate-500">Theatre inventory and current status.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : theatres.length === 0 ? (
          <EmptyState message="No operation theatres configured." />
        ) : (
          theatres.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-slate-800">{t.theatreNumber}</p>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-xs text-slate-400">{t.department?.name}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

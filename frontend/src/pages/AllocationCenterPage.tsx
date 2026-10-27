import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { AllocationRequest, Bed } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';

export function AllocationCenterPage() {
  const [requests, setRequests] = useState<AllocationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manualBedId, setManualBedId] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectFor, setShowRejectFor] = useState<string | null>(null);
  const [showManualFor, setShowManualFor] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: AllocationRequest[] }>('/allocation-requests');
      setRequests(res.data.filter((r) => ['PENDING', 'RECOMMENDED'].includes(r.status)));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load allocation requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api
      .get<{ data: Bed[] }>('/beds/available')
      .then((res) => setAvailableBeds(res.data))
      .catch(() => {});
  }, []);

  const selected = requests.find((r) => r.id === selectedId) || null;
  const latestDecision = selected?.decisions?.[0];

  async function runEngine(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`/allocation-requests/${id}/run-engine`);
      setMessage('Allocation engine re-run. New recommendation generated.');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to run allocation engine.');
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>(`/allocation-requests/${id}/approve`);
      setMessage(res.message);
      setSelectedId(null);
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to approve allocation.');
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) {
      setMessage('A rejection reason is required.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>(`/allocation-requests/${id}/reject`, { reason: rejectReason });
      setMessage(res.message);
      setSelectedId(null);
      setShowRejectFor(null);
      setRejectReason('');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to reject allocation.');
    } finally {
      setBusy(false);
    }
  }

  async function manualAllocate(id: string) {
    if (!manualBedId || !manualReason.trim()) {
      setMessage('Select a bed and provide a reason for the manual override.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>(`/allocation-requests/${id}/manual-allocation`, {
        resourceId: manualBedId,
        reason: manualReason
      });
      setMessage(res.message);
      setSelectedId(null);
      setShowManualFor(null);
      setManualBedId('');
      setManualReason('');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to complete manual allocation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Allocation Control Center</h1>
        <p className="text-sm text-slate-500">
          The engine recommends a resource; nothing is finalized until you approve it. Approval performs a fresh availability
          check before allocating.
        </p>
      </div>

      {message && <p className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{message}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase">Pending Allocation Requests</p>
          </div>
          {loading ? (
            <LoadingState label="Loading requests..." />
          ) : error ? (
            <ErrorState message={error} />
          ) : requests.length === 0 ? (
            <EmptyState message="No pending allocation requests." />
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-th">Request</th>
                  <th className="table-th">Patient</th>
                  <th className="table-th">Priority</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className={`cursor-pointer hover:bg-slate-50 ${selectedId === r.id ? 'bg-brand-50' : ''}`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td className="table-td font-medium">
                      {r.requestId} {r.emergency && <StatusBadge status="CRITICAL" />}
                    </td>
                    <td className="table-td">{r.patient?.name}</td>
                    <td className="table-td">
                      <StatusBadge status={r.priority} />
                    </td>
                    <td className="table-td">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-4">
          {!selected ? (
            <p className="text-sm text-slate-400 text-center py-10">Select a request to review the recommendation.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Request</p>
                <p className="font-semibold text-slate-800">{selected.requestId}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Patient</p>
                  <p className="font-medium">{selected.patient?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Resource Type</p>
                  <p className="font-medium">{selected.resourceType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Priority</p>
                  <StatusBadge status={selected.priority} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {selected.status === 'PENDING' && (
                <div>
                  <p className="text-xs text-amber-600 mb-2">
                    No suitable resource found yet, or the engine has not been run. Run the allocation engine to generate a
                    recommendation.
                  </p>
                  <button className="btn btn-primary" disabled={busy} onClick={() => runEngine(selected.id)}>
                    Run Allocation Engine
                  </button>
                </div>
              )}

              {latestDecision && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Criteria Evaluated</p>
                  <ul className="space-y-1">
                    {(latestDecision.criteriaEvaluated || []).map((c, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-1.5">
                        <span className={c.passed ? 'text-emerald-500' : 'text-red-500'}>{c.passed ? '✓' : '✗'}</span>
                        <span>
                          <span className="font-medium">{c.criterion}:</span> {c.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-3 mb-1">Recommendation</p>
                  <p className="text-sm">{latestDecision.recommendationReason}</p>
                </div>
              )}

              {selected.status === 'RECOMMENDED' && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <button className="btn btn-success" disabled={busy} onClick={() => approve(selected.id)}>
                      Approve
                    </button>
                    <button className="btn btn-danger" onClick={() => setShowRejectFor(selected.id)}>
                      Reject
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowManualFor(selected.id)}>
                      Choose Another / Manual Allocation
                    </button>
                  </div>

                  {showRejectFor === selected.id && (
                    <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                      <label className="label">Rejection reason</label>
                      <input className="input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button className="btn btn-danger" disabled={busy} onClick={() => reject(selected.id)}>
                          Confirm Reject
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowRejectFor(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {showManualFor === selected.id && (
                    <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                      <label className="label">Select a different bed</label>
                      <select className="input" value={manualBedId} onChange={(e) => setManualBedId(e.target.value)}>
                        <option value="">Select bed</option>
                        {availableBeds.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bedNumber} ({b.bedType}) - {b.ward}
                          </option>
                        ))}
                      </select>
                      <label className="label">Reason for override</label>
                      <input className="input" value={manualReason} onChange={(e) => setManualReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button className="btn btn-primary" disabled={busy} onClick={() => manualAllocate(selected.id)}>
                          Confirm Manual Allocation
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowManualFor(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

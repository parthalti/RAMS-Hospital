import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { Department } from '../types';
import { LoadingState, ErrorState } from '../components/AsyncState';

interface Threshold {
  id: string;
  resourceType: string;
  metric: string;
  thresholdValue: number;
}

export function SettingsPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newDept, setNewDept] = useState('');
  const [newBed, setNewBed] = useState({ bedNumber: '', ward: '', bedType: 'GENERAL', departmentId: '' });
  const [newOT, setNewOT] = useState({ theatreNumber: '', departmentId: '' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [thresholdsRes, deptRes] = await Promise.all([
        api.get<{ data: Threshold[] }>('/alerts/thresholds/all'),
        api.get<{ data: Department[] }>('/departments')
      ]);
      setThresholds(thresholdsRes.data);
      setDepartments(deptRes.data);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateThreshold(id: string, value: number) {
    setMessage(null);
    try {
      await api.put(`/alerts/thresholds/${id}`, { thresholdValue: value });
      setMessage('Threshold updated.');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to update threshold.');
    }
  }

  async function createDepartment(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/departments', { name: newDept });
      setNewDept('');
      await load();
    } catch (e2) {
      setMessage(e2 instanceof ApiRequestError ? e2.message : 'Failed to create department.');
    }
  }

  async function createBed(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/beds', newBed);
      setNewBed({ bedNumber: '', ward: '', bedType: 'GENERAL', departmentId: '' });
      setMessage('Bed created.');
    } catch (e2) {
      setMessage(e2 instanceof ApiRequestError ? e2.message : 'Failed to create bed.');
    }
  }

  async function createOT(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/ots', newOT);
      setNewOT({ theatreNumber: '', departmentId: '' });
      setMessage('Operation theatre created.');
    } catch (e2) {
      setMessage(e2 instanceof ApiRequestError ? e2.message : 'Failed to create operation theatre.');
    }
  }

  if (loading) return <LoadingState label="Loading settings..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">System configuration: thresholds, departments, and resources.</p>
      </div>

      {message && <p className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{message}</p>}

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Alert Thresholds</h2>
        <div className="space-y-2">
          {thresholds.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="text-sm w-40">
                {t.resourceType} / {t.metric}
              </span>
              <input
                type="number"
                className="input w-24"
                defaultValue={t.thresholdValue}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== t.thresholdValue) updateThreshold(t.id, val);
                }}
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <form onSubmit={createDepartment} className="card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">New Department</h2>
          <input className="input" required placeholder="Department name" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
          <button className="btn btn-primary w-full" type="submit">
            Create
          </button>
        </form>

        <form onSubmit={createBed} className="card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">New Bed</h2>
          <input
            className="input"
            required
            placeholder="Bed number"
            value={newBed.bedNumber}
            onChange={(e) => setNewBed({ ...newBed, bedNumber: e.target.value })}
          />
          <input
            className="input"
            required
            placeholder="Ward"
            value={newBed.ward}
            onChange={(e) => setNewBed({ ...newBed, ward: e.target.value })}
          />
          <select className="input" value={newBed.bedType} onChange={(e) => setNewBed({ ...newBed, bedType: e.target.value })}>
            <option value="GENERAL">General</option>
            <option value="ICU">ICU</option>
            <option value="ISOLATION">Isolation</option>
          </select>
          <select
            className="input"
            required
            value={newBed.departmentId}
            onChange={(e) => setNewBed({ ...newBed, departmentId: e.target.value })}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary w-full" type="submit">
            Create
          </button>
        </form>

        <form onSubmit={createOT} className="card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">New Operation Theatre</h2>
          <input
            className="input"
            required
            placeholder="Theatre number"
            value={newOT.theatreNumber}
            onChange={(e) => setNewOT({ ...newOT, theatreNumber: e.target.value })}
          />
          <select
            className="input"
            required
            value={newOT.departmentId}
            onChange={(e) => setNewOT({ ...newOT, departmentId: e.target.value })}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary w-full" type="submit">
            Create
          </button>
        </form>
      </div>
    </div>
  );
}

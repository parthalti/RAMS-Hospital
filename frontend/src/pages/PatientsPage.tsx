import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, ApiRequestError } from '../services/api';
import type { Patient, Department } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

export function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    medicalCondition: '',
    departmentId: '',
    priority: 'MEDIUM',
    requiredBedType: 'GENERAL',
    emergency: false
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [patientsRes, deptRes] = await Promise.all([
        api.get<{ data: Patient[] }>('/patients'),
        api.get<{ data: Department[] }>('/departments')
      ]);
      setPatients(patientsRes.data);
      setDepartments(deptRes.data);
      if (!form.departmentId && deptRes.data[0]) setForm((f) => ({ ...f, departmentId: deptRes.data[0].id }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load patients.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdmit = user && ['NURSE', 'DOCTOR', 'ADMIN'].includes(user.role);

  async function handleAdmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/patients', { ...form, age: Number(form.age) });
      setShowForm(false);
      setForm((f) => ({ ...f, name: '', age: '', medicalCondition: '', emergency: false }));
      await load();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Failed to admit patient.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Patients</h1>
          <p className="text-sm text-slate-500">Admissions and patient records.</p>
        </div>
        {canAdmit && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            <Plus size={16} /> Admit Patient
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdmit} className="card p-4 grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Age</label>
            <input className="input" type="number" required min={0} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Medical condition</label>
            <input
              className="input"
              required
              value={form.medicalCondition}
              onChange={(e) => setForm({ ...form, medicalCondition: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Required bed type</label>
            <select className="input" value={form.requiredBedType} onChange={(e) => setForm({ ...form, requiredBedType: e.target.value })}>
              <option value="GENERAL">General</option>
              <option value="ICU">ICU</option>
              <option value="ISOLATION">Isolation</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              id="emergency"
              checked={form.emergency}
              onChange={(e) => setForm({ ...form, emergency: e.target.checked })}
            />
            <label htmlFor="emergency" className="text-sm text-slate-600">
              Emergency case
            </label>
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Admitting...' : 'Admit Patient'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            {formError && <span className="text-xs text-red-500">{formError}</span>}
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState label="Loading patients..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : patients.length === 0 ? (
          <EmptyState message="No patients found." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Patient ID</th>
                <th className="table-th">Name</th>
                <th className="table-th">Department</th>
                <th className="table-th">Required Bed</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Emergency</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium">
                    <Link to={`/patients/${p.id}`} className="text-brand-600 hover:underline">
                      {p.patientId}
                    </Link>
                  </td>
                  <td className="table-td">{p.name}</td>
                  <td className="table-td">{p.department?.name}</td>
                  <td className="table-td">{p.requiredBedType}</td>
                  <td className="table-td">
                    <StatusBadge status={p.priority} />
                  </td>
                  <td className="table-td">{p.emergency ? <StatusBadge status="CRITICAL" /> : '-'}</td>
                  <td className="table-td">
                    <StatusBadge status={p.admissionStatus} />
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

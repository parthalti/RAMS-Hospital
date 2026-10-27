import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, ApiRequestError } from '../services/api';
import type { Department, Role } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';

interface UserRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  department?: Department | null;
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'NURSE' as Role, departmentId: '' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, deptRes] = await Promise.all([
        api.get<{ data: UserRow[] }>('/users'),
        api.get<{ data: Department[] }>('/departments')
      ]);
      setUsers(usersRes.data);
      setDepartments(deptRes.data);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/users', { ...form, departmentId: form.departmentId || undefined });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'NURSE', departmentId: '' });
      await load();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500">Manage staff accounts and roles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          <Plus size={16} /> New User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-4 grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="ADMIN">Hospital Administrator</option>
              <option value="DEPARTMENT_HEAD">Department Head</option>
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse / Front Desk</option>
            </select>
          </div>
          <div>
            <label className="label">Department (optional)</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
          {formError && <p className="md:col-span-3 text-xs text-red-500">{formError}</p>}
        </form>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState label="Loading users..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : users.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">User ID</th>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="table-td">{u.userId}</td>
                  <td className="table-td font-medium">{u.name}</td>
                  <td className="table-td">{u.email}</td>
                  <td className="table-td">
                    <StatusBadge status={u.role} />
                  </td>
                  <td className="table-td">{u.department?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

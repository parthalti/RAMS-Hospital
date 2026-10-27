import React, { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { DutyRoster, Department, Shift } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

interface StaffOption {
  id: string;
  name: string;
  role: string;
}

export function RostersPage() {
  const { user } = useAuth();
  const [rosters, setRosters] = useState<DutyRoster[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newRoster, setNewRoster] = useState({ departmentId: '', weekStarting: '' });

  const [shiftFormFor, setShiftFormFor] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState({ staffId: '', date: '', startTime: '', endTime: '', shiftType: 'MORNING' });

  const canManage = user && ['DEPARTMENT_HEAD', 'ADMIN'].includes(user.role);
  const canRequestChange = user && ['DOCTOR', 'NURSE', 'DEPARTMENT_HEAD'].includes(user.role);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rostersRes, deptRes, myShiftsRes] = await Promise.all([
        api.get<{ data: DutyRoster[] }>('/rosters'),
        api.get<{ data: Department[] }>('/departments'),
        api.get<{ data: Shift[] }>('/rosters/my-shifts')
      ]);
      setRosters(rostersRes.data);
      setDepartments(deptRes.data);
      setMyShifts(myShiftsRes.data);
      if (user?.role === 'ADMIN') {
        try {
          const usersRes = await api.get<{ data: StaffOption[] }>('/users');
          setStaff(usersRes.data.filter((u) => ['DOCTOR', 'NURSE'].includes(u.role)));
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load rosters.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createRoster(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/rosters', newRoster);
      setShowCreate(false);
      setNewRoster({ departmentId: '', weekStarting: '' });
      await load();
    } catch (e2) {
      setMessage(e2 instanceof ApiRequestError ? e2.message : 'Failed to create roster.');
    }
  }

  async function addShift(rosterId: string, e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post(`/rosters/${rosterId}/shifts`, shiftForm);
      setShiftFormFor(null);
      setShiftForm({ staffId: '', date: '', startTime: '', endTime: '', shiftType: 'MORNING' });
      await load();
    } catch (e2) {
      setMessage(e2 instanceof ApiRequestError ? e2.message : 'Failed to add shift.');
    }
  }

  async function publish(rosterId: string) {
    setMessage(null);
    try {
      await api.post(`/rosters/${rosterId}/publish`);
      setMessage('Roster published.');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to publish roster.');
    }
  }

  async function requestChange(rosterId: string) {
    const reason = window.prompt('Reason for requesting a roster change:');
    if (!reason) return;
    try {
      await api.post(`/rosters/${rosterId}/change-requests`, { reason });
      setMessage('Change request submitted for department head review.');
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to submit change request.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Duty Rosters</h1>
          <p className="text-sm text-slate-500">Weekly staff scheduling by department.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
            New Roster
          </button>
        )}
      </div>

      {message && <p className="text-xs text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{message}</p>}

      {showCreate && (
        <form onSubmit={createRoster} className="card p-4 grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Department</label>
            <select
              className="input"
              required
              value={newRoster.departmentId}
              onChange={(e) => setNewRoster({ ...newRoster, departmentId: e.target.value })}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Week starting</label>
            <input
              className="input"
              type="date"
              required
              value={newRoster.weekStarting}
              onChange={(e) => setNewRoster({ ...newRoster, weekStarting: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn btn-primary">
              Create
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">My Shifts</h2>
        <div className="card overflow-hidden">
          {myShifts.length === 0 ? (
            <EmptyState message="No shifts assigned to you yet." />
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Time</th>
                  <th className="table-th">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myShifts.map((s) => (
                  <tr key={s.id}>
                    <td className="table-td">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="table-td">
                      {s.startTime} - {s.endTime}
                    </td>
                    <td className="table-td">{s.shiftType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">All Rosters</h2>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : rosters.length === 0 ? (
          <EmptyState message="No rosters created yet." />
        ) : (
          <div className="space-y-3">
            {rosters.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">{r.department?.name}</p>
                    <p className="text-xs text-slate-400">Week of {new Date(r.weekStarting).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="space-y-1 mb-2">
                  {r.shifts.map((s) => (
                    <p key={s.id} className="text-xs text-slate-600">
                      {s.staff?.name} &middot; {new Date(s.date).toLocaleDateString()} &middot; {s.startTime}-{s.endTime} (
                      {s.shiftType})
                    </p>
                  ))}
                  {r.shifts.length === 0 && <p className="text-xs text-slate-400">No shifts added yet.</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {canManage && r.status === 'DRAFT' && (
                    <>
                      <button className="btn btn-secondary" onClick={() => setShiftFormFor(shiftFormFor === r.id ? null : r.id)}>
                        Add Shift
                      </button>
                      <button className="btn btn-success" onClick={() => publish(r.id)}>
                        Publish
                      </button>
                    </>
                  )}
                  {canRequestChange && (
                    <button className="btn btn-secondary" onClick={() => requestChange(r.id)}>
                      Request Change
                    </button>
                  )}
                </div>
                {shiftFormFor === r.id && (
                  <form onSubmit={(e) => addShift(r.id, e)} className="grid md:grid-cols-3 gap-2 mt-3 bg-slate-50 rounded-lg p-3">
                    <select
                      className="input"
                      required
                      value={shiftForm.staffId}
                      onChange={(e) => setShiftForm({ ...shiftForm, staffId: e.target.value })}
                    >
                      <option value="">Select staff</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="date"
                      required
                      value={shiftForm.date}
                      onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                    />
                    <select
                      className="input"
                      value={shiftForm.shiftType}
                      onChange={(e) => setShiftForm({ ...shiftForm, shiftType: e.target.value })}
                    >
                      <option value="MORNING">Morning</option>
                      <option value="EVENING">Evening</option>
                      <option value="NIGHT">Night</option>
                    </select>
                    <input
                      className="input"
                      type="time"
                      required
                      placeholder="Start"
                      value={shiftForm.startTime}
                      onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    />
                    <input
                      className="input"
                      type="time"
                      required
                      placeholder="End"
                      value={shiftForm.endTime}
                      onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    />
                    <button type="submit" className="btn btn-primary">
                      Add
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

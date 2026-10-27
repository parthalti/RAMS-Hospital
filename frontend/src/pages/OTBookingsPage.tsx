import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, ApiRequestError } from '../services/api';
import type { OTBooking, OperationTheatre, Patient, Department } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

interface UserOption {
  id: string;
  name: string;
  role: string;
}

export function OTBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<OTBooking[]>([]);
  const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<{ alternatives?: { startTime: string; endTime: string }[] } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    departmentId: '',
    operationTheatreId: '',
    date: '',
    startTime: '',
    endTime: '',
    emergency: false,
    priority: 'MEDIUM'
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, theatresRes, patientsRes, deptRes] = await Promise.all([
        api.get<{ data: OTBooking[] }>('/ot-bookings'),
        api.get<{ data: OperationTheatre[] }>('/ots'),
        api.get<{ data: Patient[] }>('/patients'),
        api.get<{ data: Department[] }>('/departments')
      ]);
      setBookings(bookingsRes.data);
      setTheatres(theatresRes.data);
      setPatients(patientsRes.data);
      setDepartments(deptRes.data);
      if (user?.role === 'ADMIN') {
        try {
          const usersRes = await api.get<{ data: UserOption[] }>('/users');
          setDoctors(usersRes.data.filter((u) => u.role === 'DOCTOR'));
        } catch {
          /* non-admins can't list users; doctor picker falls back to self */
        }
      } else if (user && user.role === 'DOCTOR') {
        setDoctors([{ id: user.id, name: user.name, role: 'DOCTOR' }]);
        setForm((f) => ({ ...f, doctorId: user.id }));
      }
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load OT bookings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canBook = user && ['DOCTOR', 'DEPARTMENT_HEAD', 'ADMIN'].includes(user.role);
  const canDecide = user?.role === 'ADMIN';

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormInfo(null);
    setSubmitting(true);
    try {
      const startTime = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const endTime = new Date(`${form.date}T${form.endTime}:00`).toISOString();
      const res = await api.post<{ data: any; message: string }>('/ot-bookings', {
        patientId: form.patientId,
        doctorId: form.doctorId,
        departmentId: form.departmentId,
        operationTheatreId: form.operationTheatreId,
        date: new Date(form.date).toISOString(),
        startTime,
        endTime,
        emergency: form.emergency,
        priority: form.priority
      });
      setActionMessage(res.message);
      setShowForm(false);
      await load();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFormError(err.message);
        setFormInfo((err.details as any) || null);
      } else {
        setFormError('Failed to create OT booking.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmBooking(id: string) {
    setActionMessage(null);
    try {
      await api.post(`/ot-bookings/${id}/confirm`);
      setActionMessage('Booking confirmed.');
      await load();
    } catch (e) {
      setActionMessage(e instanceof ApiRequestError ? e.message : 'Failed to confirm booking.');
    }
  }

  async function rejectBooking(id: string) {
    const reason = window.prompt('Reason for rejecting this booking:');
    if (!reason) return;
    setActionMessage(null);
    try {
      await api.post(`/ot-bookings/${id}/reject`, { reason });
      setActionMessage('Booking rejected.');
      await load();
    } catch (e) {
      setActionMessage(e instanceof ApiRequestError ? e.message : 'Failed to reject booking.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">OT Bookings</h1>
          <p className="text-sm text-slate-500">Requests are checked for scheduling conflicts against live data.</p>
        </div>
        {canBook && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            <Plus size={16} /> Request OT Slot
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-4 grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">Patient</label>
            <select className="input" required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patientId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Doctor</label>
            <select className="input" required value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Operation Theatre</label>
            <select
              className="input"
              required
              value={form.operationTheatreId}
              onChange={(e) => setForm({ ...form, operationTheatreId: e.target.value })}
            >
              <option value="">Select theatre</option>
              {theatres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.theatreNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
          <div>
            <label className="label">Start time</label>
            <input className="input" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div>
            <label className="label">End time</label>
            <input className="input" type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input type="checkbox" id="ot-emergency" checked={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.checked })} />
            <label htmlFor="ot-emergency" className="text-sm text-slate-600">
              Emergency request
            </label>
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Checking availability...' : 'Submit Request'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
          {formError && (
            <div className="md:col-span-3 text-xs text-red-500">
              <p>{formError}</p>
              {formInfo?.alternatives && formInfo.alternatives.length > 0 && (
                <div className="mt-1">
                  <p className="font-medium">Suggested alternative slots:</p>
                  <ul className="list-disc list-inside">
                    {formInfo.alternatives.map((a, idx) => (
                      <li key={idx}>
                        {new Date(a.startTime).toLocaleString()} &ndash; {new Date(a.endTime).toLocaleTimeString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!form.emergency && (
                <p className="mt-1 text-slate-500">
                  If this is a genuine emergency, check "Emergency request" and resubmit to route this through the emergency override
                  workflow.
                </p>
              )}
            </div>
          )}
        </form>
      )}

      {actionMessage && <p className="text-xs text-slate-500">{actionMessage}</p>}

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState label="Loading OT bookings..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : bookings.length === 0 ? (
          <EmptyState message="No OT bookings yet." />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-th">Booking</th>
                <th className="table-th">Patient</th>
                <th className="table-th">Theatre</th>
                <th className="table-th">Window</th>
                <th className="table-th">Emergency</th>
                <th className="table-th">Status</th>
                {canDecide && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{b.bookingId}</td>
                  <td className="table-td">{b.patient?.name}</td>
                  <td className="table-td">{b.operationTheatre?.theatreNumber}</td>
                  <td className="table-td">
                    {new Date(b.startTime).toLocaleString()} &ndash; {new Date(b.endTime).toLocaleTimeString()}
                  </td>
                  <td className="table-td">{b.emergency ? <StatusBadge status="CRITICAL" /> : '-'}</td>
                  <td className="table-td">
                    <StatusBadge status={b.status} />
                  </td>
                  {canDecide && (
                    <td className="table-td">
                      {b.status === 'RECOMMENDED' && (
                        <div className="flex items-center gap-2">
                          <button className="btn btn-success" onClick={() => confirmBooking(b.id)}>
                            Confirm
                          </button>
                          <button className="btn btn-danger" onClick={() => rejectBooking(b.id)}>
                            Reject
                          </button>
                        </div>
                      )}
                      {b.status === 'CONFLICT_PENDING_OVERRIDE' && (
                        <span className="text-xs text-slate-400">See Emergency Overrides</span>
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

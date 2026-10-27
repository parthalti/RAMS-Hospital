import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiRequestError } from '../services/api';
import type { Patient } from '../types';
import { LoadingState, ErrorState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

export function PatientDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ data: any }>(`/patients/${id}`);
      setPatient(res.data);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Unable to load patient.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function requestBedAllocation() {
    setRequesting(true);
    setMessage(null);
    try {
      await api.post('/allocation-requests', { patientId: id, resourceType: 'BED' });
      setMessage('Allocation request created and evaluated by the allocation engine. See the Allocation Control Center for the recommendation.');
      await load();
    } catch (e) {
      setMessage(e instanceof ApiRequestError ? e.message : 'Failed to create allocation request.');
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !patient) return <ErrorState message={error || 'Patient not found.'} />;

  const canRequest = user && ['NURSE', 'DOCTOR', 'DEPARTMENT_HEAD', 'ADMIN'].includes(user.role);

  return (
    <div className="space-y-4">
      <Link to="/patients" className="text-xs text-brand-600 hover:underline">
        &larr; Back to patients
      </Link>
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{patient.name}</h1>
            <p className="text-xs text-slate-400">{patient.patientId}</p>
          </div>
          <StatusBadge status={patient.admissionStatus} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Age / Gender</p>
            <p className="font-medium">{patient.age} / {patient.gender}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Department</p>
            <p className="font-medium">{patient.department?.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Required Bed</p>
            <p className="font-medium">{patient.requiredBedType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Priority</p>
            <StatusBadge status={patient.priority} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-slate-400">Medical Condition</p>
          <p className="text-sm mt-1">{patient.medicalCondition}</p>
        </div>
        {canRequest && patient.admissionStatus === 'PENDING' && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button className="btn btn-primary" disabled={requesting} onClick={requestBedAllocation}>
              {requesting ? 'Submitting to allocation engine...' : 'Request Bed Allocation'}
            </button>
            {message && <p className="text-xs text-slate-500 mt-2">{message}</p>}
          </div>
        )}
      </div>

      {patient.allocationRequests?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Allocation Requests</h2>
          <div className="space-y-2">
            {patient.allocationRequests.map((ar: any) => (
              <div key={ar.id} className="border border-slate-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{ar.requestId}</p>
                  <p className="text-xs text-slate-400">{ar.resourceType} allocation request</p>
                </div>
                <StatusBadge status={ar.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { api } from '../services/api';

type Role = 'DOCTOR' | 'NURSE';

interface Department {
  id: string;
  name: string;
}

interface StaffingRequirement {
  id: string;
  departmentId: string;
  role: Role;
  requiredCount: number;
  department: Department;
}

interface StaffingResult {
  departmentId: string;
  departmentName: string;
  role: Role;
  requiredCount: number;
  scheduledCount: number;
  shortage: number;
  covered: boolean;
  date: string;
}

interface StaffingStatus {
  date: string;
  totalRequirements: number;
  coveredRequirements: number;
  shortageRequirements: number;
  totalShortage: number;
  results: StaffingResult[];
}

interface DepartmentsResponse {
  success: boolean;
  data: Department[];
}

interface RequirementsResponse {
  success: boolean;
  data: StaffingRequirement[];
}

interface StatusResponse {
  success: boolean;
  data: StaffingStatus;
}

export function StaffingPage() {
  const [requirements, setRequirements] = useState<StaffingRequirement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [status, setStatus] = useState<StaffingStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState<Role>('DOCTOR');
  const [requiredCount, setRequiredCount] = useState('1');

  const [error, setError] = useState('');

  async function loadData(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const [
        requirementsResponse,
        statusResponse,
        departmentsResponse
      ] = await Promise.all([
        api.get<RequirementsResponse>('/staffing'),
        api.get<StatusResponse>('/staffing/status'),
        api.get<DepartmentsResponse>('/departments')
      ]);

      setRequirements(requirementsResponse.data);
      setStatus(statusResponse.data);
      setDepartments(departmentsResponse.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load staffing information.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const requirementMap = useMemo(() => {
    const map = new Set<string>();

    requirements.forEach((requirement) => {
      map.add(
        `${requirement.departmentId}-${requirement.role}`
      );
    });

    return map;
  }, [requirements]);

  async function createRequirement(
    event: React.FormEvent
  ) {
    event.preventDefault();

    const count = Number(requiredCount);

    if (!departmentId) {
      setError('Please select a department.');
      return;
    }

    if (!Number.isInteger(count) || count < 0) {
      setError(
        'Required staff count must be a non-negative integer.'
      );
      return;
    }

    if (
      requirementMap.has(
        `${departmentId}-${role}`
      )
    ) {
      setError(
        `A ${role.toLowerCase()} requirement already exists for this department.`
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.post('/staffing', {
        departmentId,
        role,
        requiredCount: count
      });

      setDepartmentId('');
      setRole('DOCTOR');
      setRequiredCount('1');
      setShowForm(false);

      await loadData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create staffing requirement.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateRequirement(
    requirement: StaffingRequirement
  ) {
    const value = window.prompt(
      `Required ${requirement.role.toLowerCase()} count for ${requirement.department.name}:`,
      String(requirement.requiredCount)
    );

    if (value === null) {
      return;
    }

    const count = Number(value);

    if (!Number.isInteger(count) || count < 0) {
      setError(
        'Required staff count must be a non-negative integer.'
      );
      return;
    }

    setError('');

    try {
      await api.put(
        `/staffing/${requirement.id}`,
        {
          requiredCount: count
        }
      );

      await loadData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update staffing requirement.'
      );
    }
  }

  async function deleteRequirement(
    requirement: StaffingRequirement
  ) {
    const confirmed = window.confirm(
      `Delete the ${requirement.role.toLowerCase()} staffing requirement for ${requirement.department.name}?`
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await api.delete(
        `/staffing/${requirement.id}`
      );

      await loadData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete staffing requirement.'
      );
    }
  }

  const shortageCount =
    status?.shortageRequirements ?? 0;

  const totalShortage =
    status?.totalShortage ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-slate-500">
          Loading staffing control...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Automated Administration
          </p>

          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Staffing Control
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Configure department staffing requirements and
            monitor today's published roster coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? 'animate-spin'
                  : ''
              }
            />
            Refresh
          </button>

          <button
            onClick={() => {
              setShowForm(true);
              setError('');
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Add Requirement
          </button>

        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">

          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>

          <button
            onClick={() => setError('')}
            className="ml-auto"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">

            <p className="text-xs font-medium text-slate-500">
              Requirements
            </p>

            <Users
              size={18}
              className="text-brand-500"
            />

          </div>

          <p className="text-2xl font-bold text-slate-900 mt-2">
            {status?.totalRequirements ?? 0}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">

          <p className="text-xs font-medium text-slate-500">
            Covered
          </p>

          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {status?.coveredRequirements ?? 0}
          </p>

        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">

          <p className="text-xs font-medium text-slate-500">
            Shortage Areas
          </p>

          <p className="text-2xl font-bold text-amber-600 mt-2">
            {shortageCount}
          </p>

        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">

          <p className="text-xs font-medium text-slate-500">
            Total Shortage
          </p>

          <p className="text-2xl font-bold text-red-600 mt-2">
            {totalShortage}
          </p>

        </div>

      </div>

      {/* REQUIREMENTS */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">

          <div>
            <h2 className="font-semibold text-slate-900">
              Staffing Requirements
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Minimum staff required for each department.
            </p>
          </div>

          <span className="text-xs text-slate-400">
            {requirements.length} configured
          </span>

        </div>

        {requirements.length === 0 ? (

          <div className="p-10 text-center">

            <Users
              size={32}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-medium text-slate-700">
              No staffing requirements configured
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Add Doctor or Nurse requirements
              for your departments.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Department
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Role
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Required
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {requirements.map(
                  (requirement) => (
                    <tr
                      key={requirement.id}
                      className="border-b border-slate-100 last:border-0"
                    >

                      <td className="px-5 py-4 font-medium text-slate-800">
                        {requirement.department.name}
                      </td>

                      <td className="px-5 py-4">

                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          {requirement.role}
                        </span>

                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {requirement.requiredCount}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              void updateRequirement(
                                requirement
                              )
                            }
                            className="btn btn-secondary text-xs"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              void deleteRequirement(
                                requirement
                              )
                            }
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* COVERAGE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        <div className="px-5 py-4 border-b border-slate-200">

          <h2 className="font-semibold text-slate-900">
            Today's Staffing Coverage
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Based on published duty rosters.
          </p>

        </div>

        {!status ||
        status.results.length === 0 ? (

          <div className="p-10 text-center text-sm text-slate-500">
            No staffing requirements have been
            configured yet.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Department
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Role
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Required
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Scheduled
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Shortage
                  </th>

                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Status
                  </th>

                </tr>
              </thead>

              <tbody>

                {status.results.map(
                  (item) => (
                    <tr
                      key={`${item.departmentId}-${item.role}`}
                      className="border-b border-slate-100 last:border-0"
                    >

                      <td className="px-5 py-4 font-medium text-slate-800">
                        {item.departmentName}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {item.role}
                      </td>

                      <td className="px-5 py-4">
                        {item.requiredCount}
                      </td>

                      <td className="px-5 py-4">
                        {item.scheduledCount}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={
                            item.shortage > 0
                              ? 'font-bold text-red-600'
                              : 'font-medium text-slate-600'
                          }
                        >
                          {item.shortage}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        {item.covered ? (

                          <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            Covered
                          </span>

                        ) : (

                          <span className="inline-flex px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                            Shortage
                          </span>

                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ADD REQUIREMENT MODAL */}
      {showForm && (

        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  Add Staffing Requirement
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Define the minimum staff needed.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowForm(false)
                }
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={createRequirement}
              className="p-6 space-y-5"
            >

              <div>

                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Department
                </label>

                <select
                  value={departmentId}
                  onChange={(event) =>
                    setDepartmentId(
                      event.target.value
                    )
                  }
                  className="input w-full"
                  required
                >

                  <option value="">
                    Select department
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={department.id}
                        value={department.id}
                      >
                        {department.name}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Staff Role
                </label>

                <select
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as Role
                    )
                  }
                  className="input w-full"
                >

                  <option value="DOCTOR">
                    Doctor
                  </option>

                  <option value="NURSE">
                    Nurse
                  </option>

                </select>

              </div>

              <div>

                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Required Count
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={requiredCount}
                  onChange={(event) =>
                    setRequiredCount(
                      event.target.value
                    )
                  }
                  className="input w-full"
                  required
                />

              </div>

              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving
                    ? 'Saving...'
                    : 'Create Requirement'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}
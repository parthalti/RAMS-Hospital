import React, { useEffect, useState } from 'react';
import {
  BedDouble,
  HeartPulse,
  Scissors,
  Users,
  AlertTriangle,
  Siren,
  Zap,
  RefreshCw,
  CheckCircle2,
  Clock3,
  Activity,
  XCircle
} from 'lucide-react';

import { api, ApiRequestError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type AutomationRun = {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  trigger: 'MANUAL' | 'BACKGROUND';
  startedAt: string;
  finishedAt?: string | null;

  resourceAlertsCreated: number;
  allocationRequestsProcessed: number;
  recommendationsGenerated: number;
  staleRecommendationsReprocessed: number;
  criticalAlertsCreated: number;
  noResourceAlertsCreated: number;

  errorMessage?: string | null;
  createdAt: string;
};

type AutomationResult = {
  startedAt: string;
  finishedAt: string;

  resourceAlertsCreated: number;
  allocationRequestsProcessed: number;
  recommendationsGenerated: number;
  staleRecommendationsReprocessed: number;
  criticalAlertsCreated: number;
  noResourceAlertsCreated: number;
};

type AllocationRequestPreview = {
  id: string;
  requestId: string;
  status: string;
  priority: string;
  emergency: boolean;
  patient?: {
    patientId?: string;
    name?: string;
  };
};

type AlertPreview = {
  id: string;
  alertType: string;
  resourceType: string;
  message: string;
  severity: string;
  status: string;
};

function StatCard({
  icon,
  label,
  value,
  subtitle
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="text-2xl font-bold text-slate-800 mt-1">
            {value}
          </p>

          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getRunDuration(run: AutomationRun) {
  if (!run.finishedAt) {
    return 'Running';
  }

  const start = new Date(run.startedAt).getTime();
  const end = new Date(run.finishedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return '—';
  }

  const seconds = Math.max(0, Math.round((end - start) / 1000));

  if (seconds < 1) {
    return '<1s';
  }

  return `${seconds}s`;
}

function getStatusClasses(status: AutomationRun['status']) {
  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (status === 'FAILED') {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function getSeverityClasses(severity: string) {
  const value = severity.toUpperCase();

  if (value === 'CRITICAL') {
    return 'bg-red-50 text-red-700';
  }

  if (value === 'WARNING') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-blue-50 text-blue-700';
}

export function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<any>(null);

  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [latestRun, setLatestRun] = useState<AutomationRun | null>(null);

  const [pendingAllocations, setPendingAllocations] = useState<
    AllocationRequestPreview[]
  >([]);

  const [openAlerts, setOpenAlerts] = useState<AlertPreview[]>([]);

  const [loading, setLoading] = useState(true);
  const [automationLoading, setAutomationLoading] = useState(true);
  const [adminDataLoading, setAdminDataLoading] = useState(true);

  const [automationRunning, setAutomationRunning] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  async function loadSummary() {
    const res = await api.get<{ data: any }>('/dashboard/summary');
    setSummary(res.data);
  }

  async function loadAutomationHistory() {
    setAutomationLoading(true);

    try {
      const [runsResponse, latestResponse] = await Promise.all([
        api.get<{ data: AutomationRun[] }>('/automation/runs?limit=10'),
        api.get<{ data: AutomationRun | null }>('/automation/runs/latest')
      ]);

      setRuns(runsResponse.data || []);
      setLatestRun(latestResponse.data || null);
    } catch (e) {
      console.error('Failed to load automation history:', e);
    } finally {
      setAutomationLoading(false);
    }
  }

  async function loadAdminData() {
    setAdminDataLoading(true);

    try {
      const [allocationResponse, alertsResponse] = await Promise.all([
        api.get<{ data: AllocationRequestPreview[] }>(
          '/allocation-requests'
        ),
        api.get<{ data: AlertPreview[] }>('/alerts')
      ]);

      const allocations = allocationResponse.data || [];
      const alerts = alertsResponse.data || [];

      setPendingAllocations(
        allocations.filter(
          request =>
            request.status === 'PENDING' ||
            request.status === 'RECOMMENDED'
        )
      );

      setOpenAlerts(
        alerts.filter(alert => alert.status === 'OPEN')
      );
    } catch (e) {
      console.error('Failed to load admin dashboard data:', e);
    } finally {
      setAdminDataLoading(false);
    }
  }

  async function refreshDashboard() {
    setLoading(true);
    setError(null);

    try {
      await loadSummary();

      if (isAdmin) {
        await Promise.all([
          loadAutomationHistory(),
          loadAdminData()
        ]);
      }
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : 'Unable to load dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function runAutomation() {
    if (automationRunning) return;

    setAutomationRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        data: AutomationResult;
        run: AutomationRun;
      }>('/automation/run');

      setMessage(
        'Manual automation cycle completed successfully.'
      );

      setLatestRun(response.run);

      await Promise.all([
        loadAutomationHistory(),
        loadAdminData(),
        loadSummary()
      ]);
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? e.message
          : 'Failed to run automation.'
      );

      await loadAutomationHistory();
    } finally {
      setAutomationRunning(false);
    }
  }

  useEffect(() => {
    void refreshDashboard();
  }, [user?.role]);

  /*
   * Refresh the automation history every 10 seconds.
   *
   * The backend itself runs automation every 60 seconds.
   * This makes the dashboard notice new background runs
   * without requiring the user to press Refresh.
   */
  useEffect(() => {
    if (!isAdmin) return;

    const interval = window.setInterval(() => {
      void loadAutomationHistory();
      void loadAdminData();
      void loadSummary();
    }, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAdmin]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading hospital dashboard...
        </div>
      </div>
    );
  }

  const beds = summary?.beds || {};
  const icu = summary?.icu || {};
  const isolation = summary?.isolation || {};
  const operationTheatres = summary?.operationTheatres || {};
  const staff = summary?.staff || {};
  const allocation = summary?.allocation || {};
  const alerts = summary?.alerts || {};

  const lastCompletedRun =
    runs.find(run => run.status === 'COMPLETED') || null;

  const hasRecentRun = Boolean(latestRun);

  return (
    <div className="space-y-5">

      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {user?.name || 'Admin'}
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Live resource status across the hospital.
          </p>
        </div>

        <button
          onClick={() => void refreshDashboard()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* ========================================================= */}
      {/* AUTOMATED ADMIN CONTROL */}
      {/* ========================================================= */}

      {isAdmin && (
        <section className="card overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-800">
                  Automated Admin Control
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Background monitoring, allocation analysis and
                  hospital event detection.
                </p>
              </div>
            </div>

            <button
              onClick={() => void runAutomation()}
              disabled={automationRunning}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              <Zap
                className={`w-4 h-4 ${
                  automationRunning ? 'animate-pulse' : ''
                }`}
              />

              {automationRunning
                ? 'Running Automation...'
                : 'Run Automation'}
            </button>
          </div>

          <div className="p-5">

            {/* STATUS ROW */}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />

                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Automation
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      automationRunning
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />

                  <span className="font-semibold text-slate-800">
                    {automationRunning
                      ? 'Running'
                      : 'Running Automatically'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1">
                  Background cycle every 60 seconds
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Last Run
                </p>

                <p className="text-lg font-bold text-slate-800 mt-2">
                  {hasRecentRun
                    ? formatTime(latestRun?.startedAt)
                    : '—'}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {latestRun
                    ? latestRun.trigger === 'BACKGROUND'
                      ? 'Automatic background cycle'
                      : 'Manual administrator run'
                    : 'No automation history yet'}
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Last Result
                </p>

                <div className="flex items-center gap-2 mt-2">
                  {latestRun?.status === 'FAILED' ? (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-700">
                        Failed
                      </span>
                    </>
                  ) : latestRun?.status === 'RUNNING' ? (
                    <>
                      <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                      <span className="font-semibold text-amber-700">
                        Running
                      </span>
                    </>
                  ) : latestRun ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="font-semibold text-emerald-700">
                        Completed
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-slate-500">
                      Waiting
                    </span>
                  )}
                </div>

                {latestRun && (
                  <p className="text-xs text-slate-500 mt-1">
                    Duration: {getRunDuration(latestRun)}
                  </p>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Next Automatic Check
                </p>

                <p className="text-lg font-bold text-slate-800 mt-2">
                  ~60 sec
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Server-side scheduler
                </p>
              </div>

            </div>

            {/* LAST RUN DETAILS */}

            {lastCompletedRun && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

                <div className="flex items-center gap-2 mb-3">
                  <Clock3 className="w-4 h-4 text-slate-500" />

                  <p className="text-sm font-semibold text-slate-700">
                    Latest Completed Automation
                  </p>

                  <span
                    className={`ml-auto text-xs px-2 py-1 rounded-full border ${getStatusClasses(
                      lastCompletedRun.status
                    )}`}
                  >
                    {lastCompletedRun.trigger}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">

                  <div>
                    <p className="text-xs text-slate-400">
                      Requests
                    </p>

                    <p className="font-semibold text-slate-800 mt-1">
                      {lastCompletedRun.allocationRequestsProcessed}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Recommendations
                    </p>

                    <p className="font-semibold text-blue-600 mt-1">
                      {lastCompletedRun.recommendationsGenerated}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Resource Alerts
                    </p>

                    <p className="font-semibold text-slate-800 mt-1">
                      {lastCompletedRun.resourceAlertsCreated}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Critical Alerts
                    </p>

                    <p className="font-semibold text-red-600 mt-1">
                      {lastCompletedRun.criticalAlertsCreated}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      No-resource Alerts
                    </p>

                    <p className="font-semibold text-amber-600 mt-1">
                      {lastCompletedRun.noResourceAlertsCreated}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Completed
                    </p>

                    <p className="font-semibold text-slate-800 mt-1">
                      {formatTime(lastCompletedRun.finishedAt)}
                    </p>
                  </div>

                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* AUTOMATION ACTIVITY */}
      {/* ========================================================= */}

      {isAdmin && (
        <section className="card overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">
                Automation Activity
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Recent background and administrator-triggered automation cycles.
              </p>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {runs.length} recent runs
            </span>
          </div>

          {automationLoading ? (
            <div className="p-8 flex items-center justify-center text-sm text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading automation history...
            </div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-8 h-8 mx-auto text-slate-300" />

              <p className="text-sm font-medium text-slate-600 mt-3">
                No automation activity yet.
              </p>

              <p className="text-xs text-slate-400 mt-1">
                The background scheduler will create the first run automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {runs.map(run => (
                <div
                  key={run.id}
                  className="px-5 py-4 hover:bg-slate-50 transition"
                >

                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">

                    <div className="flex items-center gap-3 min-w-[210px]">

                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          run.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-600'
                            : run.status === 'FAILED'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {run.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : run.status === 'FAILED' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {run.trigger === 'BACKGROUND'
                            ? 'Background Automation'
                            : 'Manual Automation'}
                        </p>

                        <p className="text-xs text-slate-400">
                          {formatDateTime(run.startedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase">
                          Requests
                        </p>

                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {run.allocationRequestsProcessed}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase">
                          Recommendations
                        </p>

                        <p className="text-sm font-semibold text-blue-600 mt-0.5">
                          {run.recommendationsGenerated}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase">
                          Alerts
                        </p>

                        <p className="text-sm font-semibold text-red-600 mt-0.5">
                          {run.criticalAlertsCreated +
                            run.noResourceAlertsCreated +
                            run.resourceAlertsCreated}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase">
                          Stale Reprocessed
                        </p>

                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {run.staleRecommendationsReprocessed}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase">
                          Duration
                        </p>

                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {getRunDuration(run)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 uppercase">
                          Status
                        </p>

                        <span
                          className={`inline-flex mt-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${getStatusClasses(
                            run.status
                          )}`}
                        >
                          {run.status}
                        </span>
                      </div>

                    </div>
                  </div>

                  {run.status === 'FAILED' &&
                    run.errorMessage && (
                      <div className="mt-3 ml-12 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                        {run.errorMessage}
                      </div>
                    )}

                </div>
              ))}

            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* ADMIN PENDING / ALERTS */}
      {/* ========================================================= */}

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Pending allocations */}

          <section className="card overflow-hidden">

            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">

              <div>
                <h2 className="font-semibold text-slate-800">
                  Pending Allocations
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Requests requiring administrative review.
                </p>
              </div>

              <span className="min-w-7 h-7 px-2 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-semibold">
                {pendingAllocations.length}
              </span>

            </div>

            {adminDataLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading allocations...
              </div>
            ) : pendingAllocations.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />

                <p className="text-sm font-medium text-slate-600 mt-3">
                  No pending allocations
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  The allocation queue is clear.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {pendingAllocations.slice(0, 5).map(request => (
                  <div
                    key={request.id}
                    className="px-4 py-3 hover:bg-slate-50 transition"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {request.requestId}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {request.patient?.name ||
                            request.patient?.patientId ||
                            'Patient'}
                        </p>

                        <div className="flex items-center gap-2 mt-2">

                          <span className="text-[11px] uppercase text-slate-400">
                            BED
                          </span>

                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              request.priority === 'CRITICAL'
                                ? 'bg-red-50 text-red-700'
                                : request.priority === 'HIGH'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {request.priority}
                          </span>

                          {request.emergency && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                              EMERGENCY
                            </span>
                          )}

                        </div>
                      </div>

                      <span
                        className={`text-[11px] px-2 py-1 rounded ${
                          request.status === 'RECOMMENDED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {request.status}
                      </span>

                    </div>

                  </div>
                ))}

              </div>
            )}

            {pendingAllocations.length > 5 && (
              <div className="px-4 py-3 border-t border-slate-200 text-center">
                <a
                  href="/allocation-center"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View all allocation requests →
                </a>
              </div>
            )}

          </section>

          {/* Alerts */}

          <section className="card overflow-hidden">

            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">

              <div>
                <h2 className="font-semibold text-slate-800">
                  Open Alerts
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Issues detected by hospital monitoring.
                </p>
              </div>

              <span className="min-w-7 h-7 px-2 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-xs font-semibold">
                {openAlerts.length}
              </span>

            </div>

            {adminDataLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading alerts...
              </div>
            ) : openAlerts.length === 0 ? (
              <div className="p-8 text-center">

                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />

                <p className="text-sm font-medium text-slate-700 mt-3">
                  No open alerts
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Hospital resources are currently within monitored thresholds.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {openAlerts.slice(0, 5).map(alert => (
                  <div
                    key={alert.id}
                    className="px-4 py-3 hover:bg-slate-50 transition"
                  >

                    <div className="flex items-start gap-3">

                      <div className="mt-0.5">
                        {alert.severity === 'CRITICAL' ? (
                          <Siren className="w-4 h-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">

                        <div className="flex items-center justify-between gap-2">

                          <p className="text-sm font-medium text-slate-800">
                            {alert.alertType}
                          </p>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${getSeverityClasses(
                              alert.severity
                            )}`}
                          >
                            {alert.severity}
                          </span>

                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          {alert.message}
                        </p>

                        <p className="text-[11px] text-slate-400 mt-1">
                          Resource: {alert.resourceType}
                        </p>

                      </div>

                    </div>

                  </div>
                ))}

              </div>
            )}

            {openAlerts.length > 5 && (
              <div className="px-4 py-3 border-t border-slate-200 text-center">
                <a
                  href="/alerts"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View all alerts →
                </a>
              </div>
            )}

          </section>

        </div>
      )}

      {/* ========================================================= */}
      {/* HOSPITAL RESOURCE STATISTICS */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

        <StatCard
          icon={<BedDouble className="w-5 h-5" />}
          label="Beds"
          value={
            beds.total !== undefined
              ? `${beds.available ?? 0}/${beds.total}`
              : '—'
          }
          subtitle="Available / Total"
        />

        <StatCard
          icon={<HeartPulse className="w-5 h-5" />}
          label="ICU"
          value={
            icu.total !== undefined
              ? `${icu.available ?? 0}/${icu.total}`
              : '—'
          }
          subtitle="Available / Total"
        />

        <StatCard
          icon={<BedDouble className="w-5 h-5" />}
          label="Isolation"
          value={
            isolation.total !== undefined
              ? `${isolation.available ?? 0}/${isolation.total}`
              : '—'
          }
          subtitle="Available / Total"
        />

        <StatCard
          icon={<Scissors className="w-5 h-5" />}
          label="Operation Theatres"
          value={
            operationTheatres.total !== undefined
              ? `${operationTheatres.available ?? 0}/${operationTheatres.total}`
              : '—'
          }
          subtitle="Available / Total"
        />

        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Staff"
          value={
            staff.total !== undefined
              ? staff.total
              : '—'
          }
          subtitle="Registered staff"
        />

      </div>

      {/* ========================================================= */}
      {/* ALLOCATION + ALERT SUMMARY */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="card p-5">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-800">
                Allocation Status
              </h2>

              <p className="text-xs text-slate-500">
                Current resource allocation workflow.
              </p>
            </div>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

            <div>
              <p className="text-xs text-slate-400">
                Pending
              </p>

              <p className="text-xl font-bold text-amber-600 mt-1">
                {allocation.pending ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Recommended
              </p>

              <p className="text-xl font-bold text-blue-600 mt-1">
                {allocation.recommended ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Approved
              </p>

              <p className="text-xl font-bold text-emerald-600 mt-1">
                {allocation.approved ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Rejected
              </p>

              <p className="text-xl font-bold text-red-600 mt-1">
                {allocation.rejected ?? 0}
              </p>
            </div>

          </div>

        </div>

        <div className="card p-5">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-800">
                Alert Status
              </h2>

              <p className="text-xs text-slate-500">
                Current hospital monitoring status.
              </p>
            </div>

          </div>

          <div className="mt-5 flex items-end justify-between">

            <div>
              <p className="text-xs text-slate-400">
                Open Alerts
              </p>

              <p className="text-3xl font-bold text-red-600 mt-1">
                {alerts.open ?? openAlerts.length ?? 0}
              </p>
            </div>

            <a
              href="/alerts"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Manage alerts →
            </a>

          </div>

        </div>

      </div>

    </div>
  );
}
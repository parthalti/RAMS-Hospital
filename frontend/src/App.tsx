import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { BedsPage } from './pages/BedsPage';
import { OperationTheatresPage } from './pages/OperationTheatresPage';
import { OTBookingsPage } from './pages/OTBookingsPage';
import { AllocationCenterPage } from './pages/AllocationCenterPage';
import { StaffingPage } from './pages/StaffingPage';
import { EmergencyOverridesPage } from './pages/EmergencyOverridesPage';
import { RostersPage } from './pages/RostersPage';
import { AlertsPage } from './pages/AlertsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>

      {/* Login */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* Protected application */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        {/* Patients */}
        <Route
          path="/patients"
          element={<PatientsPage />}
        />

        <Route
          path="/patients/:id"
          element={<PatientDetailPage />}
        />

        {/* Beds */}
        <Route
          path="/beds"
          element={<BedsPage />}
        />

        {/* Operation Theatres */}
        <Route
          path="/operation-theatres"
          element={<OperationTheatresPage />}
        />

        {/* OT Bookings */}
        <Route
          path="/ot-bookings"
          element={<OTBookingsPage />}
        />

        {/* Allocation Control Center */}
        <Route
          path="/allocation-center"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AllocationCenterPage />
            </ProtectedRoute>
          }
        />

        {/* Staffing Control */}
        <Route
          path="/staffing"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <StaffingPage />
            </ProtectedRoute>
          }
        />

        {/* Emergency Overrides */}
        <Route
          path="/emergency-overrides"
          element={
            <ProtectedRoute roles={['ADMIN', 'DEPARTMENT_HEAD']}>
              <EmergencyOverridesPage />
            </ProtectedRoute>
          }
        />

        {/* Duty Rosters */}
        <Route
          path="/rosters"
          element={<RostersPage />}
        />

        {/* Alerts */}
        <Route
          path="/alerts"
          element={
            <ProtectedRoute roles={['ADMIN', 'DEPARTMENT_HEAD']}>
              <AlertsPage />
            </ProtectedRoute>
          }
        />

        {/* Audit Logs */}
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Users */}
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

      </Route>

      {/* Default */}
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />

    </Routes>
  );
}
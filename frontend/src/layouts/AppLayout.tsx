import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  Users,
  UsersRound,
  Scissors,
  CalendarClock,
  ClipboardList,
  AlertTriangle,
  Siren,
  FileClock,
  UserCog,
  Settings,
  LogOut,
  HeartPulse
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE']
  },
  {
    to: '/patients',
    label: 'Patients',
    icon: Users,
    roles: ['ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE']
  },
  {
    to: '/beds',
    label: 'Beds',
    icon: BedDouble,
    roles: ['ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE']
  },
  {
    to: '/operation-theatres',
    label: 'Operation Theatres',
    icon: Scissors,
    roles: ['ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE']
  },
  {
    to: '/ot-bookings',
    label: 'OT Bookings',
    icon: CalendarClock,
    roles: ['ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE']
  },
  {
    to: '/allocation-center',
    label: 'Allocation Control Center',
    icon: ClipboardList,
    roles: ['ADMIN']
  },
  {
    to: '/staffing',
    label: 'Staffing Control',
    icon: UsersRound,
    roles: ['ADMIN']
  },
  {
    to: '/emergency-overrides',
    label: 'Emergency Overrides',
    icon: Siren,
    roles: ['ADMIN', 'DEPARTMENT_HEAD']
  },
  {
    to: '/rosters',
    label: 'Duty Rosters',
    icon: CalendarClock,
    roles: ['ADMIN', 'DEPARTMENT_HEAD', 'DOCTOR', 'NURSE']
  },
  {
    to: '/alerts',
    label: 'Alerts',
    icon: AlertTriangle,
    roles: ['ADMIN', 'DEPARTMENT_HEAD']
  },
  {
    to: '/audit-logs',
    label: 'Audit Logs',
    icon: FileClock,
    roles: ['ADMIN']
  },
  {
    to: '/users',
    label: 'Users',
    icon: UserCog,
    roles: ['ADMIN']
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['ADMIN']
  }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const normalizedRole = String(user.role).trim().toUpperCase() as Role;

  const items = NAV_ITEMS.filter((item) =>
    item.roles.includes(normalizedRole)
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">

        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <HeartPulse className="text-brand-500" size={22} />

          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">
              RAMS-Hospital
            </p>

            <p className="text-[10px] text-slate-400 leading-tight">
              Resource Allocation System
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">

          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}

        </nav>

        {/* User section */}
        <div className="border-t border-slate-200 p-3">

          <div className="flex items-center gap-2 mb-2 px-1">

            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user.name}
              </p>

              <p className="text-[10px] text-slate-400">
                {normalizedRole.replace('_', ' ')}
              </p>
            </div>

          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn btn-secondary w-full text-xs"
          >
            <LogOut size={14} />
            Sign out
          </button>

        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
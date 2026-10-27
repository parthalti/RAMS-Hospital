import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiRequestError } from '../services/api';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@rams.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/dashboard');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const demoAccounts = [
    { role: 'Admin', email: 'admin@rams.com' },
    { role: 'Department Head', email: 'head@rams.com' },
    { role: 'Doctor', email: 'doctor@rams.com' },
    { role: 'Nurse', email: 'nurse@rams.com' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <HeartPulse className="text-brand-500" size={28} />
          <h1 className="text-xl font-bold text-slate-800">RAMS-Hospital</h1>
        </div>
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <div className="card p-4 mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Demo accounts (password: Password123!)</p>
          <div className="space-y-1">
            {demoAccounts.map((d) => (
              <button
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword('Password123!');
                }}
                className="w-full text-left text-xs text-brand-600 hover:underline"
              >
                {d.role}: {d.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

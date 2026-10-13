import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { LogIn, AlertCircle, Sparkles, Shield, Building2, User } from 'lucide-react';

export const LoginPage = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') onNavigate('admin-dashboard');
      else if (user.role === 'ngo') onNavigate('ngo-dashboard');
      else onNavigate('donor-dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
    setLoading(true);
    try {
      const user = await login(demoEmail, 'password123');
      if (user.role === 'admin') onNavigate('admin-dashboard');
      else if (user.role === 'ngo') onNavigate('ngo-dashboard');
      else onNavigate('donor-dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-xs text-gray-500 mt-1">
            Sign in to manage your donations, NGO requests, or administrative reviews
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.org"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
            Quick Test Accounts (Seeded)
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleDemoLogin('donor@example.com')}
              className="p-2 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 font-medium flex items-center space-x-1.5 transition-all"
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sarah (Donor)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('hope@relief.org')}
              className="p-2 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 font-medium flex items-center space-x-1.5 transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hope Relief (Approved)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('sunshine@animals.org')}
              className="p-2 rounded-xl border border-amber-200 hover:bg-amber-50 text-amber-900 font-medium flex items-center space-x-1.5 transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Sunshine (Pending)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('admin@ngoconnect.org')}
              className="p-2 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 font-medium flex items-center space-x-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Oversight</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Don't have an account yet?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-emerald-700 font-bold hover:underline"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
};

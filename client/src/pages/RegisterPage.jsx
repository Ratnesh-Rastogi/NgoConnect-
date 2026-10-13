import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { UserPlus, Building2, User, AlertCircle, Info } from 'lucide-react';

export const RegisterPage = ({ onNavigate }) => {
  const { register } = useAuth();
  const [role, setRole] = useState('donor'); // 'donor' | 'ngo'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    // NGO fields
    orgName: '',
    regNumber: '',
    description: '',
    category: 'Healthcare',
    contactPhone: '',
    address: '',
    city: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        role,
        name: formData.name,
        email: formData.email,
        password: formData.password
      };

      if (role === 'ngo') {
        payload.orgName = formData.orgName;
        payload.regNumber = formData.regNumber;
        payload.description = formData.description;
        payload.category = formData.category;
        payload.contactPhone = formData.contactPhone;
        payload.address = formData.address;
        payload.city = formData.city;
      }

      const user = await register(payload);
      if (user.role === 'ngo') onNavigate('ngo-dashboard');
      else onNavigate('donor-dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8">
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Join NGOConnect AI</h2>
          <p className="text-xs text-gray-500 mt-1">
            Free community access for donors and non-profit organizations
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setRole('donor')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              role === 'donor'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Individual Donor</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('ngo')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              role === 'ngo'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>NGO / Non-Profit</span>
          </button>
        </div>

        {role === 'ngo' && (
          <div className="mb-6 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">NGO Verification Protocol</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                New NGO registrations start in <span className="font-bold">PENDING</span> status. Once approved by the administrator, you will be able to publish resource requests and receive donations.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {role === 'ngo' ? 'Representative Name *' : 'Your Full Name *'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@organization.org"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* NGO Organization Specific Fields */}
          {role === 'ngo' && (
            <div className="space-y-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.orgName}
                    onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                    placeholder="e.g. Hope Relief Foundation"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.regNumber}
                    onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                    placeholder="e.g. NGO-DEL-2023-019"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  >
                    <option value="Healthcare">Healthcare</option>
                    <option value="Food Relief">Food Relief</option>
                    <option value="Shelter">Shelter</option>
                    <option value="Education">Education</option>
                    <option value="Disaster Relief">Disaster Relief</option>
                    <option value="Animal Welfare">Animal Welfare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Headquarters Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, locality, postal code"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mission & Description *</label>
                <textarea
                  required
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your organization's mission and regular beneficiaries..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Already registered?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-emerald-700 font-bold hover:underline"
          >
            Sign In here
          </button>
        </div>
      </div>
    </div>
  );
};

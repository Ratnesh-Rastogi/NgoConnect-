import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Package, PlusCircle, RefreshCw, AlertCircle, MapPin, Calendar, CheckCircle2 } from 'lucide-react';

export const MyResourcesPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchMyResources = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/resources/my');
      setResources(res.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your resource listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyResources();
  }, []);

  const handleWithdraw = async (resourceId) => {
    if (!window.confirm('Are you sure you want to withdraw this donation listing? This action cannot be undone.')) {
      return;
    }

    try {
      await api.patch(`/resources/${resourceId}/withdraw`);
      setActionMsg('Listing withdrawn successfully');
      setTimeout(() => setActionMsg(''), 3000);
      fetchMyResources();
    } catch (err) {
      setError(err.message || 'Failed to withdraw listing');
    }
  };

  // Quick stats
  const totalListings = resources.length;
  const activeListings = resources.filter((r) => r.status === 'ACTIVE').length;
  const totalUnits = resources.reduce((acc, r) => acc + (r.quantityTotal || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 mb-2">
            <Package className="w-3.5 h-3.5" />
            <span>Donor Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            My Donation Listings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage the surplus resources you have made available for verified NGO partners.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('create-resource')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-emerald-200 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List New Donation</span>
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Total Listings</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalListings}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Active Listings</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{activeListings}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Total Units Contributed</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{totalUnits.toLocaleString()}</p>
        </div>
      </div>

      {/* Notifications */}
      {actionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Listings List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-gray-500">Loading your listings...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-3">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No listings created yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Share supplies, food, medicines, or equipment with grassroots NGOs that need them.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('create-resource')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Listing</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                      {item.category?.name || 'General'}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                </div>

                {item.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleWithdraw(item.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                  >
                    Withdraw Listing
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600 pt-3 border-t border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[11px]">Available / Total:</span>
                  <span className="font-bold text-gray-900">
                    {item.quantityAvailable} / {item.quantityTotal} {item.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Location:</span>
                  <span className="font-medium text-gray-800">
                    {item.city}, {item.state}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Expiry:</span>
                  <span className="font-medium text-gray-800">
                    {item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString('en-IN')
                      : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Created:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(item.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

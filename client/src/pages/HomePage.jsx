import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { RequestCard } from '../components/RequestCard.jsx';
import { DonationModal } from '../components/DonationModal.jsx';
import { Search, Filter, ShieldCheck, Heart, Sparkles, AlertCircle } from 'lucide-react';

export const HomePage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('');

  // Selected request for donation modal
  const [pledgeTarget, setPledgeTarget] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;
      if (urgency) params.urgency = urgency;

      const res = await api.get('/requests', { params });
      setRequests(res.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load resource requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [category, urgency]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handlePledgeClick = (request) => {
    if (!user) {
      onNavigate?.('login');
      return;
    }
    if (user.role !== 'donor') {
      alert('Only registered Donors can make resource donations. Please sign in as a donor.');
      return;
    }
    setPledgeTarget(request);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-600/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-100 border border-emerald-400/30">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Verified Non-Profit Resource Distribution</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Connect Resources With Verified Needs.
          </h1>
          <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
            NGOConnect AI connects donors directly with approved NGOs. Real-time quantity reservation ensures no surplus or wasted shipments. 100% free core giving for all.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate?.('urgent-help')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Need help urgently?</span>
            </button>
            <button
              onClick={() => onNavigate?.('ai-matcher')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Smart AI Matcher</span>
            </button>
            <button
              onClick={() => onNavigate?.('ngos')}
              className="bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-400/40 text-white font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all"
            >
              Browse Approved NGOs
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search needs by keyword (e.g. blankets, water, medicines)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-gray-700"
          >
            <option value="">All Categories</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Food">Food Relief</option>
            <option value="Shelter">Shelter</option>
            <option value="Education">Education</option>
            <option value="Disaster Relief">Disaster Relief</option>
          </select>

          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-gray-700"
          >
            <option value="">All Urgencies</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <button
            onClick={fetchRequests}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-all"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Requests Grid */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Fetching verified resource needs...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 space-y-3">
          <Heart className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">No matching resource requests found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try adjusting your search keywords or category filters to discover active community relief requests.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onPledge={handlePledgeClick}
            />
          ))}
        </div>
      )}

      {/* Donation Modal */}
      {pledgeTarget && (
        <DonationModal
          request={pledgeTarget}
          onClose={() => setPledgeTarget(null)}
          onSuccess={() => {
            setPledgeTarget(null);
            fetchRequests();
            alert('Your donation was recorded successfully! Real-time quantity has been reserved.');
          }}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { UrgencyBadge } from '../components/UrgencyBadge.jsx';
import { DonationModal } from '../components/DonationModal.jsx';
import { Sparkles, Building2, MapPin, ArrowRight, Package, CheckCircle, AlertCircle } from 'lucide-react';

export const AiRecommendationsPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [category, setCategory] = useState('Healthcare');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [location, setLocation] = useState('');

  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selected request for donation
  const [pledgeTarget, setPledgeTarget] = useState(null);

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Please specify the resource item you have available to donate.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/match', {
        category,
        itemName: itemName.trim(),
        quantity: parseInt(quantity, 10),
        location: location.trim() || undefined
      });
      setMatches(res.data.data || []);
    } catch (err) {
      setError(err.message || 'AI matching failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePledgeClick = (req) => {
    if (!user) {
      onNavigate('login');
      return;
    }
    if (user.role !== 'donor') {
      alert('Only registered Donors can make resource donations.');
      return;
    }
    setPledgeTarget(req);
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-200">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Algorithmic Need Prioritization</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">AI Smart Resource Matcher</h1>
        <p className="text-xs text-gray-500 max-w-lg mx-auto">
          Specify what supplies you have available to donate. Our AI engine scores real-time urgency, category relevance, and location proximity across verified non-profits.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-md p-6 sm:p-8">
        <form onSubmit={handleMatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Resource Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
              >
                <option value="Healthcare">Healthcare / Medical</option>
                <option value="Food">Food & Rations</option>
                <option value="Shelter">Shelter & Bedding</option>
                <option value="Education">Education & Books</option>
                <option value="Disaster Relief">Disaster Relief</option>
                <option value="Clothing">Clothing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Specific Item / Keywords *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Antibiotics, Thermal Blankets, Water Chlorine Tablets"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quantity Available to Donate *
              </label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Your Location / Dispatch City (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Delhi, Mumbai, Patna"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-200 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Analyzing Active Needs...' : 'Find Highest-Impact NGO Matches'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Match Results */}
      {matches !== null && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-base font-bold text-gray-900">
              Ranked Impact Recommendations ({matches.length})
            </h2>
            <span className="text-xs text-gray-500">Sorted by match score & priority</span>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 p-8 space-y-2">
              <p className="text-xs text-gray-500">
                No active requests closely match this specific query. Try searching with broader keywords.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map(({ request: req, matchScore, matchReason, remainingNeeded }) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-5 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                        {matchScore}% Match
                      </div>
                      <UrgencyBadge urgency={req.urgency} />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {req.category}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900">{req.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">{req.description}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{req.ngo?.orgName}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{req.location}</span>
                      </span>
                      <span>•</span>
                      <span>
                        Needed: <strong className="text-gray-900">{remainingNeeded}</strong> {req.unit}
                      </span>
                    </div>

                    <p className="text-[11px] text-purple-700 font-medium bg-purple-50/70 px-2.5 py-1 rounded-lg border border-purple-100">
                      AI Match Rationale: {matchReason}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={() => handlePledgeClick(req)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200 flex items-center space-x-1.5 transition-all"
                    >
                      <span>Donate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Donation Modal */}
      {pledgeTarget && (
        <DonationModal
          request={pledgeTarget}
          onClose={() => setPledgeTarget(null)}
          onSuccess={() => {
            setPledgeTarget(null);
            alert('Donation registered! Reserved in real time.');
          }}
        />
      )}
    </div>
  );
};

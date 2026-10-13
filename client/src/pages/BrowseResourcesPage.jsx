import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ResourceCard } from '../components/ResourceCard.jsx';
import { ClaimResourceModal } from '../components/ClaimResourceModal.jsx';
import { Search, Filter, PlusCircle, PackageCheck, RefreshCw } from 'lucide-react';

export const BrowseResourcesPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Claim modal state
  const [activeClaimResource, setActiveClaimResource] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch {
      // non-critical failure, fallback empty
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (searchCity.trim()) params.city = searchCity.trim();
      if (searchKeyword.trim()) params.search = searchKeyword.trim();

      const res = await api.get('/resources', { params });
      setResources(res.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load available resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchResources();
  }, [selectedCategory, searchCity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResources();
  };

  const isApprovedNgo = user?.role === 'ngo' && user?.ngoProfile?.verificationStatus === 'APPROVED';
  const canListResource = user && (user.role === 'donor' || isApprovedNgo);

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 mb-2">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Community Resource Listings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Available Donations
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
            Browse surplus resources, medical inventory, and dry rations listed by donors and partner NGOs across India.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canListResource && onNavigate && (
            <button
              onClick={() => onNavigate('create-resource')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-emerald-200 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List a Donation</span>
            </button>
          )}
          {user && onNavigate && (
            <button
              onClick={() => onNavigate('my-resources')}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-xl transition-all"
            >
              My Listings
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Search by title or description..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-gray-700 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="sm:col-span-3">
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Filter by City (e.g. Delhi, Mumbai)"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Search Action */}
          <div className="sm:col-span-1 flex items-center">
            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-colors"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* Main Resource Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-gray-500">Loading donation listings...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
          {error}
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-3">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No donation listings found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            There are currently no active listings matching your filters. Check back soon or list a donation if you have surplus items.
          </p>
          {canListResource && onNavigate && (
            <button
              onClick={() => onNavigate('create-resource')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List First Donation</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((item) => (
            <ResourceCard
              key={item.id}
              resource={item}
              isOwner={user?.id === item.owner?.id}
              isApprovedNgo={isApprovedNgo}
              onClaim={(res) => setActiveClaimResource(res)}
            />
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {activeClaimResource && (
        <ClaimResourceModal
          resource={activeClaimResource}
          onClose={() => setActiveClaimResource(null)}
          onSuccess={() => {
            fetchResources();
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { buildWhatsAppLink } from '../utils/formatters.js';
import {
  AlertCircle,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  Clock,
  ExternalLink,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';

export const UrgentHelpPage = ({ onNavigate }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [stateInput, setStateInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [ngos, setNgos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Load category chips on mount
  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data.data || []))
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  const fetchUrgentNgos = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (selectedCategories.length > 0) {
        params.category = selectedCategories;
      }
      if (stateInput.trim()) {
        params.state = stateInput.trim();
      }
      if (cityInput.trim()) {
        params.city = cityInput.trim();
      }
      if (emergencyOnly) {
        params.emergency = 'true';
      }

      const res = await api.get('/ngos/search', { params });
      setNgos(res.data.data || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching urgent NGOs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrgentNgos(1);
  }, [selectedCategories, emergencyOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUrgentNgos(1);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setStateInput('');
    setCityInput('');
    setEmergencyOnly(false);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || stateInput.trim() !== '' || cityInput.trim() !== '' || emergencyOnly;

  const isValidHttpUrl = (url) => url && /^https?:\/\/.+/i.test(url.trim());

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Life-Threatening Emergency Notice (Mandatory top alert) */}
      <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 text-rose-950 shadow-xs">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed">
          <p className="font-bold text-rose-900">
            In a medical or life-threatening emergency, call your local emergency number first (112 in India).
          </p>
          <p className="text-rose-700 text-xs mt-0.5">
            This directory connects you directly with verified non-profits and humanitarian organizations offering rapid relief, food, shelter, and helplines.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>Urgent Help Finder</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Search verified community non-profits by emergency availability, location, and services offered.
          </p>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-sm space-y-5">
        {/* Category Multi-select Chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Type of Help Needed</span>
            </label>
            {selectedCategories.length > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {selectedCategories.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategories((prev) =>
                      isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                    );
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* State, City & Emergency toggle */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-3 border-t border-gray-100 items-end">
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">State (Filter)</label>
            <input
              type="text"
              placeholder="e.g. Delhi, Maharashtra, Bihar"
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">City (Preference / Ranking)</label>
            <input
              type="text"
              placeholder="e.g. New Delhi, Mumbai, Patna"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-3">
            <label className="flex items-center space-x-2 cursor-pointer p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors flex-1 select-none">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Emergency Only</span>
              </span>
            </label>

            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 mt-3 font-medium">Finding immediate help near you...</p>
        </div>
      ) : ngos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200/80 p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">No organizations found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              We couldn't find any approved non-profits matching all your current filters. Try removing the emergency filter or clearing state/city preferences.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center text-xs text-gray-500 font-medium px-1">
            <span>
              Showing {ngos.length} of {pagination.total} organization{pagination.total === 1 ? '' : 's'}
            </span>
            {cityInput && (
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Ranked with {cityInput} first
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ngos.map((ngo) => (
              <div
                key={ngo.id}
                className="bg-white rounded-3xl border border-gray-200/90 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {ngo.category}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ngo.emergencyAvailable && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>Emergency</span>
                        </span>
                      )}
                      {ngo.available24x7 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>24/7</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{ngo.orgName}</h3>
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed mt-1">{ngo.description}</p>
                  </div>

                  {/* Services offered list */}
                  {ngo.services && ngo.services.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Services Offered</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ngo.services.map((svc) => (
                          <span
                            key={svc.id}
                            className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-100"
                          >
                            {svc.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service Area Note */}
                  {ngo.serviceAreaNote && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-[11px] text-slate-700">
                      <span className="font-bold text-slate-900">Coverage: </span>
                      <span>{ngo.serviceAreaNote}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-100">
                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {ngo.showFullAddress && ngo.address
                        ? `${ngo.address}, ${ngo.city}${ngo.state ? `, ${ngo.state}` : ''}`
                        : `${ngo.city}${ngo.state ? `, ${ngo.state}` : ''}`}
                    </span>
                  </div>

                  {/* Large Urgent Action Buttons (Call & WhatsApp) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {ngo.publicPhone ? (
                      <a
                        href={`tel:${ngo.publicPhone}`}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-400 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>No Phone</span>
                      </button>
                    )}

                    {ngo.whatsappNumber ? (
                      <a
                        href={buildWhatsAppLink(ngo.whatsappNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-400 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>No WhatsApp</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary Channels (Email & Website) */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    {ngo.publicEmail ? (
                      <a
                        href={`mailto:${ngo.publicEmail}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline truncate max-w-[50%]"
                        title={ngo.publicEmail}
                      >
                        <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">{ngo.publicEmail}</span>
                      </a>
                    ) : (
                      <span />
                    )}

                    {isValidHttpUrl(ngo.website) && (
                      <a
                        href={ngo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:underline shrink-0"
                      >
                        <Globe className="w-3 h-3 text-purple-600" />
                        <span>Website</span>
                        <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchUrgentNgos(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 font-medium px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchUrgentNgos(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

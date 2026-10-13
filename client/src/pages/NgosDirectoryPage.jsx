import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Building2, MapPin, ShieldCheck, Search } from 'lucide-react';

export const NgosDirectoryPage = () => {
  const [ngos, setNgos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNgos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ngos', {
        params: search.trim() ? { search: search.trim() } : {}
      });
      setNgos(res.data.data || []);
    } catch (err) {
      console.error('Failed to load NGOs directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgos();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approved Non-Profit Directory</h1>
          <p className="text-xs text-gray-500 mt-1">
            All listed organizations have undergone administrative credential verification
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchNgos();
          }}
          className="relative w-full sm:w-72"
        >
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by NGO name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </form>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : ngos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 text-xs text-gray-500">
          No approved non-profit organizations found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ngos.map((ngo) => (
            <div
              key={ngo.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-gray-100 text-gray-700">
                    {ngo.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 leading-snug">{ngo.orgName}</h3>
                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{ngo.description}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{ngo.city}</span>
                </span>
                <span className="text-[11px] text-gray-400">
                  Joined {new Date(ngo.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

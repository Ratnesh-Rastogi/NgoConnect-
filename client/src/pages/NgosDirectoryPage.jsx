import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { buildWhatsAppLink } from '../utils/formatters.js';
import { NgoDetailModal } from '../components/NgoDetailModal.jsx';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Search,
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Facebook,
  Instagram,
  ArrowRight
} from 'lucide-react';

export const NgosDirectoryPage = ({ onNavigate }) => {
  const [ngos, setNgos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNgoId, setSelectedNgoId] = useState(null);

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
          {ngos.map((ngo) => {
            const hasContacts =
              ngo.publicPhone ||
              ngo.publicEmail ||
              ngo.whatsappNumber ||
              ngo.website ||
              ngo.facebookUrl ||
              ngo.instagramUrl;

            return (
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

                  {/* Public Contact Channels */}
                  {hasContacts && (
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                      {ngo.publicPhone && (
                        <a
                          href={`tel:${ngo.publicPhone}`}
                          title={`Call ${ngo.publicPhone}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium transition-colors"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{ngo.publicPhone}</span>
                        </a>
                      )}

                      {ngo.publicEmail && (
                        <a
                          href={`mailto:${ngo.publicEmail}`}
                          title={`Email ${ngo.publicEmail}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-medium transition-colors"
                        >
                          <Mail className="w-3 h-3 text-blue-600" />
                          <span>{ngo.publicEmail}</span>
                        </a>
                      )}

                      {ngo.whatsappNumber && (
                        <a
                          href={buildWhatsAppLink(ngo.whatsappNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp Chat"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 text-[11px] font-medium transition-colors"
                        >
                          <MessageCircle className="w-3 h-3 text-green-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {ngo.website && (
                        <a
                          href={ngo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={ngo.website}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-medium transition-colors"
                        >
                          <Globe className="w-3 h-3 text-purple-600" />
                          <span>Website</span>
                        </a>
                      )}

                      {ngo.facebookUrl && (
                        <a
                          href={ngo.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Facebook Profile"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-medium transition-colors"
                        >
                          <Facebook className="w-3 h-3 text-sky-600" />
                          <span>Facebook</span>
                        </a>
                      )}

                      {ngo.instagramUrl && (
                        <a
                          href={ngo.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Instagram Profile"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-800 text-[11px] font-medium transition-colors"
                        >
                          <Instagram className="w-3 h-3 text-pink-600" />
                          <span>Instagram</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1 max-w-[65%] truncate" title={ngo.showFullAddress && ngo.address ? `${ngo.address}, ${ngo.city}` : ngo.city}>
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {ngo.showFullAddress && ngo.address
                        ? `${ngo.address}, ${ngo.city}${ngo.state ? `, ${ngo.state}` : ''}`
                        : `${ngo.city}${ngo.state ? `, ${ngo.state}` : ''}`}
                    </span>
                  </span>

                  <button
                    onClick={() => setSelectedNgoId(ngo.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedNgoId && (
        <NgoDetailModal
          ngoId={selectedNgoId}
          onClose={() => setSelectedNgoId(null)}
          onDonate={(req) => {
            if (onNavigate) {
              onNavigate('browse-resources');
            }
          }}
        />
      )}
    </div>
  );
};

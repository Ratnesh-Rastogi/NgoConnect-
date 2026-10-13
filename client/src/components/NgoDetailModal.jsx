import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { buildWhatsAppLink } from '../utils/formatters.js';
import {
  X,
  Building2,
  MapPin,
  ShieldCheck,
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Facebook,
  Instagram,
  Package,
  Calendar,
  ExternalLink
} from 'lucide-react';

export const NgoDetailModal = ({ ngoId, onClose, onDonate }) => {
  const [ngo, setNgo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNgoDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/ngos/${ngoId}`);
        setNgo(res.data.data);
      } catch (err) {
        setError(err.message || 'Failed to load organization details');
      } finally {
        setLoading(false);
      }
    };

    if (ngoId) {
      fetchNgoDetails();
    }
  }, [ngoId]);

  if (!ngoId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-200/80 text-gray-700">
                  {ngo?.category}
                </span>
                {ngo?.verificationStatus === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified NGO</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{ngo?.orgName || 'Loading NGO...'}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400 mt-3 font-medium">Fetching organization profile...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium text-center">
              {error}
            </div>
          ) : ngo ? (
            <>
              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About the Organization</h4>
                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                  {ngo.description}
                </p>
              </div>

              {/* Location & Address */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Location & Address</h4>
                <div className="flex items-start space-x-2 text-xs text-gray-700 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    {ngo.showFullAddress && ngo.address ? (
                      <div>
                        <p className="font-semibold text-gray-900">{ngo.address}</p>
                        <p className="text-gray-500 mt-0.5">
                          {ngo.city}
                          {ngo.state ? `, ${ngo.state}` : ''}
                        </p>
                      </div>
                    ) : (
                      <p className="font-semibold text-gray-900">
                        {ngo.city}
                        {ngo.state ? `, ${ngo.state}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Public Contact Details */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                  Public Contact Channels
                </h4>
                {ngo.publicPhone ||
                ngo.publicEmail ||
                ngo.whatsappNumber ||
                ngo.website ||
                ngo.facebookUrl ||
                ngo.instagramUrl ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ngo.publicPhone && (
                      <a
                        href={`tel:${ngo.publicPhone}`}
                        className="flex items-center space-x-2.5 p-3 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs font-semibold text-gray-800 group"
                      >
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium">Telephone / Call</p>
                          <p className="text-emerald-700">{ngo.publicPhone}</p>
                        </div>
                      </a>
                    )}

                    {ngo.publicEmail && (
                      <a
                        href={`mailto:${ngo.publicEmail}`}
                        className="flex items-center space-x-2.5 p-3 rounded-2xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs font-semibold text-gray-800 group"
                      >
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-700 group-hover:scale-105 transition-transform">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium">Official Public Email</p>
                          <p className="text-blue-700">{ngo.publicEmail}</p>
                        </div>
                      </a>
                    )}

                    {ngo.whatsappNumber && (
                      <a
                        href={buildWhatsAppLink(ngo.whatsappNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2.5 p-3 rounded-2xl border border-gray-200 hover:border-green-300 hover:bg-green-50/50 transition-all text-xs font-semibold text-gray-800 group"
                      >
                        <div className="p-2 rounded-xl bg-green-100 text-green-700 group-hover:scale-105 transition-transform">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium">WhatsApp Community Chat</p>
                          <p className="text-green-700">{ngo.whatsappNumber}</p>
                        </div>
                      </a>
                    )}

                    {ngo.website && (
                      <a
                        href={ngo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2.5 p-3 rounded-2xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-xs font-semibold text-gray-800 group"
                      >
                        <div className="p-2 rounded-xl bg-purple-100 text-purple-700 group-hover:scale-105 transition-transform">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 font-medium">Official Website</p>
                          <p className="text-purple-700 truncate">{ngo.website}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    )}

                    {ngo.facebookUrl && (
                      <a
                        href={ngo.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2.5 p-3 rounded-2xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all text-xs font-semibold text-gray-800 group"
                      >
                        <div className="p-2 rounded-xl bg-sky-100 text-sky-700 group-hover:scale-105 transition-transform">
                          <Facebook className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 font-medium">Facebook Page</p>
                          <p className="text-sky-700 truncate">{ngo.facebookUrl}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    )}

                    {ngo.instagramUrl && (
                      <a
                        href={ngo.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2.5 p-3 rounded-2xl border border-gray-200 hover:border-pink-300 hover:bg-pink-50/50 transition-all text-xs font-semibold text-gray-800 group"
                      >
                        <div className="p-2 rounded-xl bg-pink-100 text-pink-700 group-hover:scale-105 transition-transform">
                          <Instagram className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 font-medium">Instagram Profile</p>
                          <p className="text-pink-700 truncate">{ngo.instagramUrl}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl">
                    No public contact channels provided by this organization.
                  </p>
                )}
              </div>

              {/* Active Resource Requests */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                  Current Needs & Resource Requests ({ngo.requests?.length || 0})
                </h4>
                {!ngo.requests || ngo.requests.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-400">
                    No active resource requests at the moment.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {ngo.requests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl border border-gray-200/80 bg-white hover:border-emerald-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              {req.category}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              {req.urgency}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-900">{req.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Seeking {req.quantityNeeded - req.quantityFulfilled} {req.unit} (Fulfilled:{' '}
                            {req.quantityFulfilled})
                          </p>
                        </div>

                        {onDonate && (
                          <button
                            onClick={() => {
                              onClose();
                              onDonate(req);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
                          >
                            Donate
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

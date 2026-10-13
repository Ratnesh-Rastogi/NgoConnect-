import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { UrgencyBadge } from '../components/UrgencyBadge.jsx';
import { RequestModal } from '../components/RequestModal.jsx';
import {
  Building2,
  PlusCircle,
  Package,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Truck,
  Trash2
} from 'lucide-react';

export const NgoDashboard = () => {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'transfers'
  const [requests, setRequests] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const verificationStatus = user?.ngoProfile?.verificationStatus || 'PENDING';
  const isApproved = verificationStatus === 'APPROVED';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, trRes] = await Promise.all([
        api.get('/requests/my/all'),
        api.get('/transfers/my/ngo')
      ]);
      setRequests(reqRes.data.data || []);
      setTransfers(trRes.data.data || []);
    } catch (err) {
      console.error('Error fetching NGO dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    refreshProfile();
  }, []);

  const handleConfirmReceived = async (transferId) => {
    try {
      await api.patch(`/transfers/${transferId}/status`, {
        status: 'RECEIVED'
      });
      fetchData();
    } catch (err) {
      alert(`Failed to confirm receipt: ${err.message}`);
    }
  };

  const handleCancelTransfer = async (transferId) => {
    if (!confirm('Cancel this transfer? Reserved quantity will be returned to your request.')) return;
    try {
      await api.patch(`/transfers/${transferId}/status`, {
        status: 'CANCELLED'
      });
      fetchData();
    } catch (err) {
      alert(`Failed to cancel transfer: ${err.message}`);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to delete this resource request?')) return;
    try {
      await api.delete(`/requests/${requestId}`);
      fetchData();
    } catch (err) {
      alert(`Failed to delete request: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Verification Status Banner */}
      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">
              NGO Verification Status: {verificationStatus}
            </p>
            <p className="text-amber-700 leading-relaxed">
              {verificationStatus === 'PENDING'
                ? 'Your registration is awaiting approval by the platform administrator. Once APPROVED, you will be able to publish resource requests and receive donations.'
                : 'Your organization account is currently restricted. Please contact platform support.'}
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-900">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-bold">Verified Non-Profit Partner</p>
              <p className="text-[11px] text-emerald-700">
                {user?.ngoProfile?.orgName} is fully approved to post relief requests and accept donations.
              </p>
            </div>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            APPROVED
          </span>
        </div>
      )}

      {/* Header & New Request Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NGO Management Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your open resource needs and confirm received donor transfers
          </p>
        </div>

        <button
          onClick={() => {
            if (!isApproved) {
              alert('Only APPROVED NGOs can create resource requests. Your status is currently ' + verificationStatus);
              return;
            }
            setShowRequestModal(true);
          }}
          disabled={!isApproved}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all ${
            isApproved
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Resource Request</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'requests'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Our Resource Requests ({requests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'transfers'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Incoming Transfers & Fulfillments ({transfers.length})</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Package className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No resource requests created yet.</p>
              {isApproved && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Create your first request &rarr;
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((req) => {
                const fulfilled = req.quantityFulfilled || 0;
                const reserved = req.quantityReserved || 0;
                const needed = req.quantityNeeded || 0;
                const pct = Math.min(100, Math.round((fulfilled / needed) * 100));

                return (
                  <div key={req.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {req.category}
                          </span>
                          <UrgencyBadge urgency={req.urgency} />
                          <StatusBadge status={req.status} />
                        </div>

                        <h3 className="text-sm font-bold text-gray-900">{req.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{req.description}</p>

                        <div className="w-72 mt-2">
                          <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                            <span>Fulfilled: <strong>{fulfilled}</strong> / {needed} {req.unit}</span>
                            {reserved > 0 && <span className="text-amber-700 font-medium">{reserved} in-transit</span>}
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div style={{ width: `${pct}%` }} className="bg-emerald-500" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Transfers Received */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-xs">
              No donor transfers pledged yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transfers.map((t) => (
                <div key={t.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {t.request?.title || 'Resource Request'}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>

                      <p className="text-xs text-gray-600">
                        Donor: <strong className="text-gray-900">{t.donor?.name}</strong> • Pledged:{' '}
                        <strong className="text-emerald-700">{t.quantity}</strong> {t.request?.unit || 'units'}
                      </p>

                      {t.trackingInfo && (
                        <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Tracking: {t.trackingInfo}</span>
                        </p>
                      )}

                      {t.donorNote && (
                        <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg">
                          "{t.donorNote}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {t.status !== 'RECEIVED' && t.status !== 'CANCELLED' && (
                        <>
                          <button
                            onClick={() => handleConfirmReceived(t.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200 flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Received</span>
                          </button>
                          <button
                            onClick={() => handleCancelTransfer(t.id)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {t.status === 'RECEIVED' && (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Delivered & Verified</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <RequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

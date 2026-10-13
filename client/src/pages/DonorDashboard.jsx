import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TransferTimeline } from '../components/TransferTimeline.jsx';
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  ExternalLink,
  Layers
} from 'lucide-react';

export const DonorDashboard = ({ onNavigate }) => {
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDispatchId, setActiveDispatchId] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [transfersRes, statsRes] = await Promise.all([
        api.get('/transfers/my/donor'),
        api.get('/dashboard/donor')
      ]);
      setTransfers(transfersRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (transferId, newStatus, trackingInfo) => {
    try {
      await api.patch(`/transfers/${transferId}/status`, {
        status: newStatus,
        trackingInfo: trackingInfo || undefined
      });
      setActiveDispatchId(null);
      setTrackingInput('');
      fetchData();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Metrics from scoped dashboard endpoint, falling back to local list counts
  const totalQuantityDonated = stats?.totalQuantityDonated ?? transfers.reduce((sum, t) => sum + (t.status !== 'CANCELLED' ? t.quantity : 0), 0);
  const completedDeliveries = stats?.completedDeliveries ?? transfers.filter((t) => t.status === 'RECEIVED').length;
  const inTransitCount = stats?.inTransitCount ?? transfers.filter((t) => t.status === 'IN_TRANSIT').length;
  const myDonationsCount = stats?.myDonationsCount ?? transfers.length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track and manage your resource donations, shipments, and delivery timelines
          </p>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          Explore More Needs
        </button>
      </div>

      {/* Metrics Row (Scoped to current donor) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Units Donated</p>
            <p className="text-2xl font-extrabold text-gray-900">{totalQuantityDonated}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Completed Deliveries</p>
            <p className="text-2xl font-extrabold text-purple-700">{completedDeliveries}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">In Transit</p>
            <p className="text-2xl font-extrabold text-blue-700">{inTransitCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-gray-100 text-gray-700">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Donation Transfers</p>
            <p className="text-2xl font-extrabold text-gray-900">{myDonationsCount}</p>
          </div>
        </div>
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">Your Donations & Dispatches</h2>
          <span className="text-xs text-gray-500">{transfers.length} records</span>
        </div>

        {error && (
          <div className="m-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Loading donation records...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Package className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">You haven't made any resource donations yet.</p>
            <button
              onClick={() => onNavigate('home')}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Browse active requests to make your first donation &rarr;
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transfers.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50/60 transition-colors space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">
                        {item.request?.title || item.resource?.title || 'Resource Transfer'}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1 text-gray-700 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{item.ngo?.orgName}</span>
                      </span>
                      <span>•</span>
                      <span>
                        Donated: <strong className="text-gray-900">{item.quantity}</strong> {item.request?.unit || 'units'}
                      </span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    {item.donorNote && (
                      <p className="text-xs text-gray-600 italic bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/50 mt-1">
                        Note: "{item.donorNote}"
                      </p>
                    )}

                    {item.trackingInfo && (
                      <p className="text-xs font-medium text-blue-700 flex items-center gap-1 mt-1">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch info: {item.trackingInfo}</span>
                      </p>
                    )}

                    {item.receivedAt && (
                      <p className="text-xs font-medium text-emerald-700 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Received and verified by NGO on {new Date(item.receivedAt).toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions according to role & state */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'PENDING' && (
                      <>
                        {activeDispatchId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Courier / tracking info"
                              value={trackingInput}
                              onChange={(e) => setTrackingInput(e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 w-44"
                            />
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'IN_TRANSIT', trackingInput)}
                              className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setActiveDispatchId(null)}
                              className="px-2 py-1 text-gray-500 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveDispatchId(item.id)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center space-x-1"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dispatch Shipment</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm('Cancel this donation? Reserved quantity will be released back to the request.')) {
                              handleUpdateStatus(item.id, 'CANCELLED');
                            }
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-xl text-xs font-semibold"
                        >
                          Cancel Donation
                        </button>
                      </>
                    )}

                    {item.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => {
                          if (confirm('Cancel this in-transit transfer?')) {
                            handleUpdateStatus(item.id, 'CANCELLED');
                          }
                        }}
                        className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold"
                      >
                        Cancel Shipment
                      </button>
                    )}
                  </div>
                </div>

                {/* Transfer Lifecycle Event Timeline */}
                <TransferTimeline events={item.events} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

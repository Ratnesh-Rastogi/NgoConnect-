import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { UrgencyBadge } from '../components/UrgencyBadge.jsx';
import { RequestModal } from '../components/RequestModal.jsx';
import { TransferTimeline } from '../components/TransferTimeline.jsx';
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
  Trash2,
  FileText,
  Upload,
  RefreshCw,
  FileCheck,
  ArrowUpRight,
  TrendingUp,
  BarChart2
} from 'lucide-react';

export const NgoDashboard = () => {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'transfers' | 'documents'
  const [requests, setRequests] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [docType, setDocType] = useState('Registration Certificate');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docError, setDocError] = useState(null);
  const [docSuccess, setDocSuccess] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const fileInputRef = useRef(null);

  const verificationStatus = user?.ngoProfile?.verificationStatus || 'PENDING';
  const verificationNotes = user?.ngoProfile?.verificationNotes;
  const isApproved = verificationStatus === 'APPROVED';
  const isRejected = verificationStatus === 'REJECTED';
  const isPending = verificationStatus === 'PENDING';
  const canModifyDocuments = isPending || isRejected;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, trRes, statsRes] = await Promise.all([
        api.get('/requests/my/all'),
        api.get('/transfers/my/ngo'),
        api.get('/dashboard/ngo').catch(() => ({ data: { data: null } }))
      ]);
      setRequests(reqRes.data.data || []);
      setTransfers(trRes.data.data || []);
      setStats(statsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching NGO dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await api.get('/ngos/my/documents');
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error('Error fetching NGO documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDocuments();
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

  const handleFileChange = (e) => {
    setDocError(null);
    setDocSuccess(null);
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDocError('File size exceeds the 5MB limit.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setDocError('Please choose a file to upload.');
      return;
    }

    if (!canModifyDocuments) {
      setDocError(`Document uploads are not permitted while status is ${verificationStatus}.`);
      return;
    }

    setUploading(true);
    setDocError(null);
    setDocSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('docType', docType);

      await api.post('/ngos/my/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setDocSuccess(`Successfully uploaded "${selectedFile.name}".`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (err) {
      setDocError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId, originalName) => {
    if (!confirm(`Are you sure you want to remove "${originalName}"?`)) return;

    setDocError(null);
    setDocSuccess(null);
    try {
      await api.delete(`/ngos/my/documents/${docId}`);
      setDocSuccess(`Document "${originalName}" deleted.`);
      await fetchDocuments();
    } catch (err) {
      setDocError(err.message || 'Failed to delete document.');
    }
  };

  const handleResubmit = async () => {
    if (documents.length === 0) {
      alert('You must upload at least one verification document before resubmitting.');
      return;
    }

    if (!confirm('Are you ready to resubmit your organization for administrator review?')) return;

    setResubmitting(true);
    setDocError(null);
    setDocSuccess(null);
    try {
      await api.post('/ngos/my/resubmit');
      setDocSuccess('Verification resubmitted successfully! Your status is now PENDING.');
      await refreshProfile();
      await fetchDocuments();
    } catch (err) {
      setDocError(err.message || 'Failed to resubmit verification.');
    } finally {
      setResubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Verification Status Banners */}
      {isRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-900 shadow-xs">
          <div className="flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-rose-900 flex items-center gap-2">
                <span>Verification Rejected by Platform Administrator</span>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  REJECTED
                </span>
              </p>
              {verificationNotes && (
                <div className="bg-white/80 border border-rose-200/80 rounded-xl p-2.5 mt-1.5 text-rose-950 font-medium leading-relaxed">
                  <span className="font-bold text-rose-700">Reason: </span>
                  {verificationNotes}
                </div>
              )}
              <p className="text-rose-700 leading-relaxed pt-1">
                Please review the feedback above, update your documentation under the{' '}
                <strong className="underline cursor-pointer" onClick={() => setActiveTab('documents')}>
                  Documents tab
                </strong>
                , and click resubmit.
              </p>
            </div>
          </div>
          {activeTab !== 'documents' && (
            <button
              onClick={() => setActiveTab('documents')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
            >
              Manage Documents & Resubmit
            </button>
          )}
        </div>
      )}

      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold flex items-center gap-2">
                <span>NGO Verification Status: PENDING</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  PENDING
                </span>
              </p>
              <p className="text-amber-700 leading-relaxed">
                Your registration is awaiting approval by the platform administrator. Ensure you have uploaded your official documents (registration, 12A/80G, FCRA, etc.) for admin review.
              </p>
            </div>
          </div>
          {activeTab !== 'documents' && (
            <button
              onClick={() => setActiveTab('documents')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              Check Documents ({documents.length})
            </button>
          )}
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

      {verificationStatus === 'SUSPENDED' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-900">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Organization Status: SUSPENDED</p>
            {verificationNotes && <p className="text-red-700">Reason: {verificationNotes}</p>}
            <p className="text-red-600">Please reach out to platform administrators for resolution.</p>
          </div>
        </div>
      )}

      {/* Header & New Request Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NGO Management Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your open resource needs, confirm received donor transfers, and manage official credentials
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

      {/* NGO Scoped Aggregate Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Open Resource Needs</p>
            <p className="text-2xl font-extrabold text-gray-900">
              {stats?.openRequestsCount ?? requests.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-medium text-gray-500">Fulfilment Rate</p>
              <span className="text-xs font-bold text-blue-700">{stats?.fulfilmentRate ?? 0}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, stats?.fulfilmentRate ?? 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">In-Transit Donations</p>
            <p className="text-2xl font-extrabold text-purple-700">
              {stats?.transfersByStatus?.IN_TRANSIT ?? transfers.filter((t) => t.status === 'IN_TRANSIT').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Completed Transfers</p>
            <p className="text-2xl font-extrabold text-emerald-700">
              {stats?.transfersByStatus?.RECEIVED ?? transfers.filter((t) => t.status === 'RECEIVED').length}
            </p>
          </div>
        </div>
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

          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'documents'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Verification & Documents ({documents.length})</span>
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
              No donations received yet.
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
                        Donor: <strong className="text-gray-900">{t.donor?.name}</strong> • Donated:{' '}
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

                  {/* Transfer Lifecycle Timeline */}
                  <TransferTimeline events={t.events} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Verification & Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Status & Resubmit Overview Card */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
              <div>
                <div className="flex items-center space-x-2.5">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-900">{user?.ngoProfile?.orgName}</h2>
                  <StatusBadge status={verificationStatus} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Registration Number: <strong className="font-mono text-gray-700">{user?.ngoProfile?.regNumber || 'N/A'}</strong> • City: <strong>{user?.ngoProfile?.city || 'N/A'}</strong>
                </p>
              </div>

              {/* Resubmit button for REJECTED status */}
              {isRejected && (
                <div className="flex flex-col sm:items-end gap-1.5">
                  <button
                    onClick={handleResubmit}
                    disabled={resubmitting || documents.length === 0}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all ${
                      documents.length > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resubmitting ? 'animate-spin' : ''}`} />
                    <span>{resubmitting ? 'Resubmitting...' : 'Resubmit for Verification'}</span>
                  </button>
                  {documents.length === 0 && (
                    <span className="text-[11px] text-rose-600 font-medium">
                      Upload at least 1 document to resubmit
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Alerts */}
            {docError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3.5 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{docError}</span>
              </div>
            )}
            {docSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{docSuccess}</span>
              </div>
            )}

            {/* Document Upload Form */}
            {canModifyDocuments ? (
              <form onSubmit={handleUploadDocument} className="bg-gray-50/70 border border-gray-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Upload Official Verification Document
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Document Type
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Registration Certificate">Registration Certificate (Trust / Society / Sec 8)</option>
                      <option value="12A / 80G Certificate">12A / 80G Tax Exemption Certificate</option>
                      <option value="FCRA Registration">FCRA Registration Certificate</option>
                      <option value="PAN Card / Tax ID">PAN Card / Tax Registration</option>
                      <option value="Annual Audited Report">Annual Audited Financial Statements</option>
                      <option value="Other Verification Document">Other Official Verification Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Choose File (PDF, JPG, PNG - Max 5MB)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                      className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-gray-200 rounded-xl bg-white p-1"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                  <p className="text-[11px] text-gray-500">
                    File signatures (magic bytes) are strictly validated by the server before storage.
                  </p>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                      selectedFile && !uploading
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-600 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Document modifications are locked while status is <strong>{verificationStatus}</strong>.
                  Contact platform support if official credentials need updating.
                </span>
              </div>
            )}

            {/* Uploaded Documents List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Uploaded Documents ({documents.length})</span>
                </h3>
                <span className="text-[11px] text-gray-500">
                  Visible to platform administrators during review
                </span>
              </div>

              {loadingDocs ? (
                <div className="text-center py-8">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl p-6">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-600">No documents uploaded yet.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Upload official proof of non-profit registration to expedite administrative verification.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-900">{doc.originalName}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                              {doc.docType}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Size: {formatFileSize(doc.fileSize)} • Uploaded:{' '}
                            {new Date(doc.createdAt).toLocaleDateString()} at{' '}
                            {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {canModifyDocuments && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.originalName)}
                          className="text-xs p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors self-end sm:self-auto"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { UrgencyBadge } from '../components/UrgencyBadge.jsx';
import { RequestModal } from '../components/RequestModal.jsx';
import { TransferTimeline } from '../components/TransferTimeline.jsx';
import { buildWhatsAppLink } from '../utils/formatters.js';
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
  BarChart2,
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Facebook,
  Instagram,
  Save,
  Eye,
  MapPin,
  LifeBuoy
} from 'lucide-react';

export const NgoDashboard = () => {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'transfers' | 'documents' | 'profile'
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

  // Available categories for service selection
  const [availableCategories, setAvailableCategories] = useState([]);

  // Profile & Contact Details State
  const [profileForm, setProfileForm] = useState({
    publicEmail: user?.ngoProfile?.publicEmail || '',
    publicPhone: user?.ngoProfile?.publicPhone || '',
    whatsappNumber: user?.ngoProfile?.whatsappNumber || '',
    website: user?.ngoProfile?.website || '',
    facebookUrl: user?.ngoProfile?.facebookUrl || '',
    instagramUrl: user?.ngoProfile?.instagramUrl || '',
    showFullAddress: Boolean(user?.ngoProfile?.showFullAddress),
    orgName: user?.ngoProfile?.orgName || '',
    description: user?.ngoProfile?.description || '',
    category: user?.ngoProfile?.category || '',
    city: user?.ngoProfile?.city || '',
    state: user?.ngoProfile?.state || '',
    address: user?.ngoProfile?.address || '',
    emergencyAvailable: Boolean(user?.ngoProfile?.emergencyAvailable),
    available24x7: Boolean(user?.ngoProfile?.available24x7),
    serviceAreaNote: user?.ngoProfile?.serviceAreaNote || '',
    serviceCategoryIds: user?.ngoProfile?.services ? user.ngoProfile.services.map((s) => s.id || s.categoryId) : []
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setAvailableCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.ngoProfile) {
      setProfileForm({
        publicEmail: user.ngoProfile.publicEmail || '',
        publicPhone: user.ngoProfile.publicPhone || '',
        whatsappNumber: user.ngoProfile.whatsappNumber || '',
        website: user.ngoProfile.website || '',
        facebookUrl: user.ngoProfile.facebookUrl || '',
        instagramUrl: user.ngoProfile.instagramUrl || '',
        showFullAddress: Boolean(user.ngoProfile.showFullAddress),
        orgName: user.ngoProfile.orgName || '',
        description: user.ngoProfile.description || '',
        category: user.ngoProfile.category || '',
        city: user.ngoProfile.city || '',
        state: user.ngoProfile.state || '',
        address: user.ngoProfile.address || '',
        emergencyAvailable: Boolean(user.ngoProfile.emergencyAvailable),
        available24x7: Boolean(user.ngoProfile.available24x7),
        serviceAreaNote: user.ngoProfile.serviceAreaNote || '',
        serviceCategoryIds: user.ngoProfile.services ? user.ngoProfile.services.map((s) => s.id || s.categoryId) : []
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const payload = {
        publicEmail: profileForm.publicEmail.trim() || null,
        publicPhone: profileForm.publicPhone.trim() || null,
        whatsappNumber: profileForm.whatsappNumber.trim() || null,
        website: profileForm.website.trim() || null,
        facebookUrl: profileForm.facebookUrl.trim() || null,
        instagramUrl: profileForm.instagramUrl.trim() || null,
        showFullAddress: Boolean(profileForm.showFullAddress),
        emergencyAvailable: Boolean(profileForm.emergencyAvailable),
        available24x7: Boolean(profileForm.available24x7),
        serviceAreaNote: profileForm.serviceAreaNote.trim() || null,
        serviceCategoryIds: profileForm.serviceCategoryIds || []
      };
      if (profileForm.orgName?.trim()) payload.orgName = profileForm.orgName.trim();
      if (profileForm.description?.trim()) payload.description = profileForm.description.trim();
      if (profileForm.category?.trim()) payload.category = profileForm.category.trim();
      if (profileForm.city?.trim()) payload.city = profileForm.city.trim();
      if (profileForm.state?.trim()) payload.state = profileForm.state.trim();
      if (profileForm.address?.trim()) payload.address = profileForm.address.trim();

      await api.put('/ngos/my/profile', payload);
      setProfileSuccess('Contact details & organization profile saved successfully!');
      await refreshProfile();
    } catch (err) {
      setProfileError(err.message || 'Failed to update contact details.');
    } finally {
      setSavingProfile(false);
    }
  };

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

          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Contact Details & Profile</span>
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

      {/* Tab 4: Contact Details & Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editor Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>Public Contact Channels & Profile</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure official contact channels and social links to make it easy for donors and partners to reach your team.
              </p>
            </div>

            {/* Privacy notice banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Privacy & Separation of Credentials</span>
              </div>
              <p>
                • Your public email and phone are strictly separate from your login credentials (<span className="font-mono text-emerald-700">{user?.email}</span>) and registration documents.
              </p>
              <p>
                • Public contact details are displayed in the directory only once your organization has been <strong>APPROVED</strong>.
              </p>
              <p>
                • You can choose below whether to reveal your full street address or keep it limited to city and state.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Public Contact Details Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Public Contact Channels
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Public Official Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={profileForm.publicEmail}
                        onChange={(e) => setProfileForm({ ...profileForm, publicEmail: e.target.value })}
                        placeholder="e.g. info@hoperelief-public.org"
                        maxLength={120}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Click-to-email link. Max 120 characters.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Public Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={profileForm.publicPhone}
                        onChange={(e) => setProfileForm({ ...profileForm, publicPhone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        maxLength={20}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Click-to-call link. Digits, +, spaces, dashes (max 20).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      WhatsApp Number
                    </label>
                    <div className="relative">
                      <MessageCircle className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={profileForm.whatsappNumber}
                        onChange={(e) => setProfileForm({ ...profileForm, whatsappNumber: e.target.value })}
                        placeholder="e.g. 9876543210"
                        maxLength={20}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Auto-formats to wa.me (10 digits prefix 91).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Official Website URL
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                        placeholder="https://example.org"
                        maxLength={200}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Must start with http:// or https:// (max 200).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Facebook URL
                    </label>
                    <div className="relative">
                      <Facebook className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={profileForm.facebookUrl}
                        onChange={(e) => setProfileForm({ ...profileForm, facebookUrl: e.target.value })}
                        placeholder="https://facebook.com/myngo"
                        maxLength={200}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Must start with http:// or https:// (max 200).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Instagram URL
                    </label>
                    <div className="relative">
                      <Instagram className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={profileForm.instagramUrl}
                        onChange={(e) => setProfileForm({ ...profileForm, instagramUrl: e.target.value })}
                        placeholder="https://instagram.com/myngo"
                        maxLength={200}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Must start with http:// or https:// (max 200).</p>
                  </div>
                </div>

                {/* Show Full Address Toggle */}
                <div className="pt-2">
                  <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={profileForm.showFullAddress}
                      onChange={(e) => setProfileForm({ ...profileForm, showFullAddress: e.target.checked })}
                      className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-gray-900">Show Full Street Address Publicly</span>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        When checked, donors can view your full street address on directory cards. When unchecked, only your city and state are publicly revealed.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Urgent Help & Services Offered Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <LifeBuoy className="w-3.5 h-3.5 text-rose-600" />
                    <span>Urgent Help & Services Offered</span>
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {profileForm.serviceCategoryIds.length} / 10 selected
                  </span>
                </div>

                {/* Services multi-select chips */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Services / Help Types Offered
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat) => {
                      const isSelected = profileForm.serviceCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setProfileForm({
                                ...profileForm,
                                serviceCategoryIds: profileForm.serviceCategoryIds.filter((id) => id !== cat.id)
                              });
                            } else {
                              if (profileForm.serviceCategoryIds.length >= 10) {
                                alert('You can select at most 10 services.');
                                return;
                              }
                              setProfileForm({
                                ...profileForm,
                                serviceCategoryIds: [...profileForm.serviceCategoryIds, cat.id]
                              });
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    These allow people in distress to discover your organization via the Urgent Help Finder.
                  </p>
                </div>

                {/* Emergency Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={profileForm.emergencyAvailable}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyAvailable: e.target.checked })}
                      className="mt-0.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                        <span>Emergency Response Available</span>
                      </span>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Highlight your NGO on Urgent Help Finder for crisis and rapid response relief.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={profileForm.available24x7}
                      onChange={(e) => setProfileForm({ ...profileForm, available24x7: e.target.checked })}
                      className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-gray-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>24/7 Helpline / Availability</span>
                      </span>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Indicates that phone or community response is reachable around the clock.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Service Area Note */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Service Area / Coverage Note (Optional)
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {profileForm.serviceAreaNote.length} / 200
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={200}
                    value={profileForm.serviceAreaNote}
                    onChange={(e) => setProfileForm({ ...profileForm, serviceAreaNote: e.target.value })}
                    placeholder="e.g. 24/7 rescue vans across Delhi-NCR and Faridabad border"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Specific neighborhoods, coverage areas, or operational instructions for beneficiaries.
                  </p>
                </div>
              </div>

              {/* Organization Profile Details */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Organization Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={profileForm.orgName}
                      onChange={(e) => setProfileForm({ ...profileForm, orgName: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={profileForm.category}
                      onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="e.g. 104 Hope Enclave, MG Road"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={profileForm.state}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Mission</label>
                    <textarea
                      rows={3}
                      value={profileForm.description}
                      onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'Saving Details...' : 'Save Contact Details & Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Directory Preview */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8">
            <div className="flex items-center space-x-2 text-xs font-bold text-gray-700">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Live Public Directory Preview</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Real-time representation of how donors and visitors see your organization card in the directory.
            </p>

            {/* Preview Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-md transition-all space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-gray-100 text-gray-700">
                    {profileForm.category || 'Category'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {profileForm.emergencyAvailable && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>Emergency</span>
                      </span>
                    )}
                    {profileForm.available24x7 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>24/7</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  {profileForm.orgName || 'Your Organization Name'}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                  {profileForm.description || 'Your organization mission and relief goals will be displayed here.'}
                </p>

                {/* Services Tags & Coverage Note in Preview */}
                {profileForm.serviceCategoryIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {availableCategories
                      .filter((c) => profileForm.serviceCategoryIds.includes(c.id))
                      .map((c) => (
                        <span key={c.id} className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">
                          {c.name}
                        </span>
                      ))}
                  </div>
                )}

                {profileForm.serviceAreaNote && (
                  <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                    Coverage: {profileForm.serviceAreaNote}
                  </p>
                )}

                {/* Contact Action Badges */}
                <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                  {profileForm.publicPhone && (
                    <a
                      href={`tel:${profileForm.publicPhone}`}
                      title={`Call ${profileForm.publicPhone}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium transition-colors"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{profileForm.publicPhone}</span>
                    </a>
                  )}

                  {profileForm.publicEmail && (
                    <a
                      href={`mailto:${profileForm.publicEmail}`}
                      title={`Email ${profileForm.publicEmail}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-medium transition-colors"
                    >
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span>{profileForm.publicEmail}</span>
                    </a>
                  )}

                  {profileForm.whatsappNumber && (
                    <a
                      href={buildWhatsAppLink(profileForm.whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp Chat"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 text-[11px] font-medium transition-colors"
                    >
                      <MessageCircle className="w-3 h-3 text-green-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {profileForm.website && (
                    <a
                      href={profileForm.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={profileForm.website}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-medium transition-colors"
                    >
                      <Globe className="w-3 h-3 text-purple-600" />
                      <span>Website</span>
                    </a>
                  )}

                  {profileForm.facebookUrl && (
                    <a
                      href={profileForm.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Facebook Profile"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-medium transition-colors"
                    >
                      <Facebook className="w-3 h-3 text-sky-600" />
                      <span>Facebook</span>
                    </a>
                  )}

                  {profileForm.instagramUrl && (
                    <a
                      href={profileForm.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Instagram Profile"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-800 text-[11px] font-medium transition-colors"
                    >
                      <Instagram className="w-3 h-3 text-pink-600" />
                      <span>Instagram</span>
                    </a>
                  )}

                  {!profileForm.publicPhone &&
                    !profileForm.publicEmail &&
                    !profileForm.whatsappNumber &&
                    !profileForm.website &&
                    !profileForm.facebookUrl &&
                    !profileForm.instagramUrl && (
                      <span className="text-[11px] text-gray-400 italic">
                        No contact channels entered yet.
                      </span>
                    )}
                </div>
              </div>

              {/* Location footer in preview */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1 max-w-[75%] truncate">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {profileForm.showFullAddress && profileForm.address
                      ? `${profileForm.address}, ${profileForm.city || 'City'}${profileForm.state ? `, ${profileForm.state}` : ''}`
                      : `${profileForm.city || 'City'}${profileForm.state ? `, ${profileForm.state}` : ''}`}
                  </span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  {profileForm.showFullAddress ? 'Full Address' : 'City & State Only'}
                </span>
              </div>
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

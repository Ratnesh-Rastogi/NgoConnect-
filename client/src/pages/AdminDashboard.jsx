import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  UserCheck,
  Eye,
  X,
  ExternalLink,
  History,
  FileCheck,
  Download,
  AlertCircle
} from 'lucide-react';

export const AdminDashboard = () => {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedNgo, setSelectedNgo] = useState(null);

  const fetchNgos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/ngos/admin/all', { params });
      setNgos(res.data.data || []);
    } catch (err) {
      console.error('Failed to load NGOs for admin oversight:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgos();
  }, [filterStatus]);

  const pendingCount = ngos.filter((n) => n.verificationStatus === 'PENDING').length;
  const approvedCount = ngos.filter((n) => n.verificationStatus === 'APPROVED').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Administrator Governance & Verification</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Review uploaded credentials, stream verification documents, and audit organizational status changes
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Pending Review</p>
            <p className="text-2xl font-extrabold text-amber-700">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Approved Organizations</p>
            <p className="text-2xl font-extrabold text-emerald-700">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-gray-100 text-gray-700">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Registered</p>
            <p className="text-2xl font-extrabold text-gray-900">{ngos.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">Registered NGO Queue</h2>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-500">Status Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : ngos.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-xs">
            No NGOs found for selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[10px] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Reg No & Category</th>
                  <th className="px-6 py-3">Contact Details</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ngos.map((ngo) => (
                  <tr key={ngo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{ngo.orgName}</div>
                      <div className="text-gray-500 text-[11px] max-w-xs line-clamp-1">{ngo.description}</div>
                      {ngo.verificationNotes && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                          Note: {ngo.verificationNotes}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-mono text-gray-700">{ngo.regNumber}</div>
                      <div className="text-gray-500">{ngo.category} • {ngo.city}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div>{ngo.contactPhone}</div>
                      <div className="text-gray-500 text-[11px] truncate max-w-[200px]">{ngo.address}</div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={ngo.verificationStatus} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedNgo(ngo)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Review & Verify</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Review Drawer / Modal */}
      {selectedNgo && (
        <AdminReviewModal
          ngo={selectedNgo}
          onClose={() => setSelectedNgo(null)}
          onSuccess={() => {
            fetchNgos();
          }}
        />
      )}
    </div>
  );
};

// Admin Review Modal Component
const AdminReviewModal = ({ ngo, onClose, onSuccess }) => {
  const [documents, setDocuments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Document Streaming State
  const [activeDoc, setActiveDoc] = useState(null);
  const [streamingBlobUrl, setStreamingBlobUrl] = useState(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(null);

  // Decision state
  const [decisionAction, setDecisionAction] = useState('APPROVED'); // 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const prevBlobRef = useRef(null);

  const fetchNgoData = async () => {
    setLoadingDocs(true);
    setLoadingReviews(true);

    try {
      const [docsRes, reviewsRes] = await Promise.all([
        api.get(`/ngos/admin/${ngo.id}/documents`),
        api.get(`/ngos/admin/${ngo.id}/reviews`)
      ]);
      setDocuments(docsRes.data.data || []);
      setReviews(reviewsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching admin review details:', err);
    } finally {
      setLoadingDocs(false);
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchNgoData();

    // Default note depending on current status
    if (ngo.verificationStatus === 'PENDING') {
      setDecisionAction('APPROVED');
      setNotes('Approved after reviewing organizational credentials.');
    } else if (ngo.verificationStatus === 'APPROVED') {
      setDecisionAction('SUSPENDED');
      setNotes('');
    } else {
      setDecisionAction('APPROVED');
      setNotes('Approved after resubmission.');
    }

    return () => {
      if (prevBlobRef.current) {
        URL.revokeObjectURL(prevBlobRef.current);
      }
    };
  }, [ngo.id]);

  const handleStreamDocument = async (doc) => {
    setLoadingStream(true);
    setStreamError(null);
    setActiveDoc(doc);

    if (streamingBlobUrl) {
      URL.revokeObjectURL(streamingBlobUrl);
      setStreamingBlobUrl(null);
    }

    try {
      const res = await api.get(`/ngos/admin/documents/${doc.id}/stream`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      prevBlobRef.current = blobUrl;
      setStreamingBlobUrl(blobUrl);
    } catch (err) {
      setStreamError(err.message || 'Failed to stream document.');
    } finally {
      setLoadingStream(false);
    }
  };

  const handleCloseStream = () => {
    if (streamingBlobUrl) {
      URL.revokeObjectURL(streamingBlobUrl);
      setStreamingBlobUrl(null);
    }
    setActiveDoc(null);
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    // Rule 5: Admin APPROVED blocked if NGO has no documents
    if (decisionAction === 'APPROVED' && documents.length === 0) {
      setActionError('Cannot approve NGO without any uploaded verification documents.');
      return;
    }

    // Rule: Reject requires a reason
    const trimmedNotes = notes.trim();
    if (decisionAction === 'REJECTED' && !trimmedNotes) {
      setActionError('A rejection reason is required when rejecting an NGO.');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/ngos/admin/${ngo.id}/status`, {
        verificationStatus: decisionAction,
        verificationNotes: trimmedNotes || undefined
      });

      setActionSuccess(`Status successfully updated to ${decisionAction}.`);
      await fetchNgoData();
      onSuccess();
    } catch (err) {
      setActionError(err.message || 'Failed to update verification status.');
    } finally {
      setSubmitting(false);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-8 border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-gray-900">{ngo.orgName}</h2>
              <StatusBadge status={ngo.verificationStatus} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registration No: <strong className="font-mono text-gray-800">{ngo.regNumber}</strong> • Category: <strong>{ngo.category}</strong> • City: <strong>{ngo.city}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NGO Details */}
        <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2 border border-gray-200/70">
          <p className="text-gray-700 leading-relaxed">
            <strong className="text-gray-900 font-semibold">Description: </strong>
            {ngo.description || 'No description provided.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 pt-1 border-t border-gray-200/60">
            <div><strong>Contact Phone:</strong> {ngo.contactPhone || 'N/A'}</div>
            <div><strong>Address:</strong> {ngo.address || 'N/A'}</div>
          </div>
          {ngo.verificationNotes && (
            <div className="text-[11px] text-amber-900 bg-amber-100/70 rounded-lg p-2 mt-2">
              <strong>Current Verification Note: </strong> {ngo.verificationNotes}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Verification Documents ({documents.length})</span>
            </h3>
            <span className="text-[11px] text-gray-400">Streamed securely through admin API</span>
          </div>

          {loadingDocs ? (
            <div className="text-center py-6">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No Documents Uploaded</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  This NGO has not uploaded any verification documents. Platform governance rules prohibit approving an NGO without documents.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc) => {
                const isViewing = activeDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isViewing
                        ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {doc.docType}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate" title={doc.originalName}>
                        {doc.originalName}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleStreamDocument(doc)}
                      disabled={loadingStream && isViewing}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                        isViewing
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isViewing ? 'Viewing Document' : 'View / Stream'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Document Stream Preview Panel */}
          {activeDoc && (
            <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-3 mt-4 border border-gray-800">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold truncate max-w-sm">{activeDoc.originalName}</span>
                  <span className="text-[10px] text-gray-400 font-mono">({activeDoc.mimeType})</span>
                </div>
                <div className="flex items-center space-x-3">
                  {streamingBlobUrl && (
                    <a
                      href={streamingBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <span>Full Window</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={handleCloseStream}
                    className="text-gray-400 hover:text-white p-1 rounded-lg"
                    title="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loadingStream ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-400">Streaming document securely from private storage...</p>
                </div>
              ) : streamError ? (
                <div className="py-12 text-center text-rose-400 text-xs">
                  {streamError}
                </div>
              ) : streamingBlobUrl ? (
                <div className="bg-white rounded-xl overflow-hidden min-h-[360px] flex items-center justify-center p-1">
                  {activeDoc.mimeType === 'application/pdf' ? (
                    <iframe
                      src={streamingBlobUrl}
                      className="w-full h-[420px] rounded-lg"
                      title={activeDoc.originalName}
                    />
                  ) : activeDoc.mimeType?.startsWith('image/') ? (
                    <img
                      src={streamingBlobUrl}
                      alt={activeDoc.originalName}
                      className="max-h-[420px] max-w-full object-contain mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="text-center p-8 text-gray-600 text-xs">
                      <p>Preview not directly embedded for this format.</p>
                      <a
                        href={streamingBlobUrl}
                        download={activeDoc.originalName}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download to view</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Verification Reviews History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>Review Audit Log ({reviews.length})</span>
            </h3>
            <span className="text-[11px] text-gray-400">Complete historical decision trail</span>
          </div>

          {loadingReviews ? (
            <div className="text-center py-4">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No previous verification decisions logged.</p>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto text-xs">
              {reviews.map((r) => (
                <div key={r.id} className="p-3 bg-gray-50/50 hover:bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-700">
                        {r.fromStatus || 'INIT'} &rarr; <span className="font-bold text-gray-900">{r.toStatus}</span>
                      </span>
                      <span className="text-[10px] text-gray-400">
                        by {r.reviewerName || 'NGO Resubmission'}
                      </span>
                    </div>
                    {r.notes && (
                      <p className="text-[11px] text-gray-600 italic">"{r.notes}"</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Decision Form */}
        <form onSubmit={handleDecisionSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Record Administrative Verification Decision
          </h3>

          {actionError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">Decision Action</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecisionAction('APPROVED')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  decisionAction === 'APPROVED'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Approve Organization
              </button>
              <button
                type="button"
                onClick={() => setDecisionAction('REJECTED')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  decisionAction === 'REJECTED'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Reject (Needs Reason)
              </button>
              <button
                type="button"
                onClick={() => setDecisionAction('SUSPENDED')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  decisionAction === 'SUSPENDED'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Suspend Organization
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Review Notes / Reason {decisionAction === 'REJECTED' && <span className="text-rose-600">* (Mandatory)</span>}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                decisionAction === 'REJECTED'
                  ? 'Specify required adjustments, invalid certificates, or missing proofs...'
                  : 'Add notes about credentials reviewed...'
              }
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${
                decisionAction === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : decisionAction === 'REJECTED'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <span>{submitting ? 'Updating...' : `Confirm ${decisionAction}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  UserCheck
} from 'lucide-react';

export const AdminDashboard = () => {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

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

  const handleUpdateStatus = async (ngoId, newStatus) => {
    const note = prompt(`Enter verification note for setting status to ${newStatus}:`, 'Verified by Admin');
    if (note === null) return; // user cancelled

    setUpdatingId(ngoId);
    try {
      await api.patch(`/ngos/admin/${ngoId}/status`, {
        verificationStatus: newStatus,
        verificationNotes: note || undefined
      });
      fetchNgos();
    } catch (err) {
      alert(`Failed to update NGO status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

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
          Review credentials, approve legitimate non-profits, and monitor resource requests
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
                      <div className="flex items-center justify-end space-x-1.5">
                        {ngo.verificationStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(ngo.id, 'APPROVED')}
                            disabled={updatingId === ngo.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all"
                          >
                            Approve
                          </button>
                        )}

                        {ngo.verificationStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateStatus(ngo.id, 'REJECTED')}
                            disabled={updatingId === ngo.id}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-700 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Reject
                          </button>
                        )}

                        {ngo.verificationStatus === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(ngo.id, 'SUSPENDED')}
                            disabled={updatingId === ngo.id}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-amber-50 text-gray-700 hover:text-amber-700 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

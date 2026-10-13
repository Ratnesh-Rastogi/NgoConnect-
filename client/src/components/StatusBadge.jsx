import React from 'react';

export const StatusBadge = ({ status, type = 'general' }) => {
  const statusStyles = {
    // Verification
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
    SUSPENDED: 'bg-gray-100 text-gray-800 border-gray-300',

    // Request
    OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    PARTIAL: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    FULFILLED: 'bg-purple-100 text-purple-800 border-purple-300',

    // Transfer
    IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-300',
    RECEIVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    CANCELLED: 'bg-red-100 text-red-800 border-red-300'
  };

  const style = statusStyles[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  const label = status ? status.replace('_', ' ') : 'UNKNOWN';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};

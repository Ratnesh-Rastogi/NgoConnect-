import React, { useState } from 'react';
import { api } from '../api/client.js';
import { X, Heart, AlertCircle, CheckCircle } from 'lucide-react';

export const DonationModal = ({ request, onClose, onSuccess }) => {
  const needed = request.quantityNeeded || 0;
  const fulfilled = request.quantityFulfilled || 0;
  const reserved = request.quantityReserved || 0;
  const remaining = Math.max(0, needed - fulfilled - reserved);

  const [quantity, setQuantity] = useState(remaining > 0 ? Math.min(10, remaining) : 1);
  const [donorNote, setDonorNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Please specify a positive donation quantity.');
      return;
    }

    if (parsedQty > remaining) {
      setError(`Cannot reserve more than the remaining needed quantity (${remaining} ${request.unit}).`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/transfers', {
        requestId: request.id,
        quantity: parsedQty,
        donorNote: donorNote.trim() || undefined
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to submit donation pledge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Heart className="w-4 h-4 fill-emerald-600" />
            </div>
            <h2 className="font-bold text-gray-900 text-base">Pledge Resource Donation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">{request.title}</h4>
            <p className="text-xs text-gray-500">
              Receiving NGO: <span className="font-medium text-gray-700">{request.ngo?.orgName}</span>
            </p>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex justify-between items-center">
            <span>Remaining Unreserved Needed:</span>
            <span className="font-bold text-sm text-emerald-900">
              {remaining} {request.unit}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Pledged Quantity ({request.unit}) *
            </label>
            <input
              type="number"
              min="1"
              max={remaining}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              required
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Quantity will be reserved instantly to avoid over-fulfillment.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Donor Note / Logistics Plan (Optional)
            </label>
            <textarea
              rows="3"
              value={donorNote}
              onChange={(e) => setDonorNote(e.target.value)}
              placeholder="e.g. Can dispatch 20 units via courier tomorrow from Gurgaon..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || remaining <= 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting Pledge...' : 'Confirm Pledge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

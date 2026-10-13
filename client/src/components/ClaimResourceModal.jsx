import React, { useState } from 'react';
import { api } from '../api/client.js';
import { X, PackageCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ClaimResourceModal = ({ resource, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState(1);
  const [claimNote, setClaimNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!resource) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qtyNum = parseInt(quantity, 10);
    if (!qtyNum || qtyNum <= 0) {
      setError('Please specify a valid quantity greater than 0.');
      return;
    }
    if (qtyNum > resource.quantityAvailable) {
      setError(`Cannot claim more than the available quantity (${resource.quantityAvailable} ${resource.unit}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/resources/${resource.id}/claim`, {
        quantity: qtyNum,
        claimNote: claimNote.trim() || undefined
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to claim resource. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Resource Claimed Successfully!</h3>
            <p className="text-sm text-gray-500">
              A transfer record has been initiated. The donor will be notified to coordinate shipment.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 mb-2">
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Claim Donation Listing</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{resource.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Offered by <span className="font-medium text-gray-700">{resource.owner?.name || 'Verified Donor'}</span> in{' '}
                <span className="font-medium text-gray-700">{resource.city}, {resource.state}</span>
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center text-xs">
              <span className="text-gray-600 font-medium">Available to Claim:</span>
              <span className="font-bold text-gray-900 text-sm">
                {resource.quantityAvailable} <span className="text-gray-500 font-normal text-xs">{resource.unit}</span>
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Quantity Needed ({resource.unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={resource.quantityAvailable}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Claim what your NGO directly requires for distribution.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Distribution Plan or Note for Donor (Optional)
              </label>
              <textarea
                rows="3"
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                placeholder="Share how this donation will be delivered or utilized..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-gray-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm shadow-emerald-200"
              >
                {isSubmitting ? 'Confirming Claim...' : 'Confirm Claim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { StatusBadge } from './StatusBadge.jsx';
import { MapPin, User, Package, Calendar, AlertTriangle } from 'lucide-react';

export const ResourceCard = ({
  resource,
  onClaim,
  isOwner = false,
  isApprovedNgo = false,
  onWithdraw
}) => {
  const isAvailable = resource.status === 'ACTIVE' && resource.quantityAvailable > 0;
  const isExpired = resource.expiryDate && new Date(resource.expiryDate) < new Date();

  const formattedExpiry = resource.expiryDate
    ? new Date(resource.expiryDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : null;

  const pct = Math.round((resource.quantityAvailable / resource.quantityTotal) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
      <div>
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
            {resource.category?.name || 'General Resource'}
          </span>
          <StatusBadge status={resource.status} />
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2 mb-2">
          {resource.title}
        </h3>
        <p className="text-xs text-gray-600 line-clamp-3 mb-4 leading-relaxed">
          {resource.description}
        </p>

        {/* Meta details */}
        <div className="space-y-1.5 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-700 font-medium">
            <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{resource.owner?.name || 'Community Donor'}</span>
            {isOwner && (
              <span className="ml-1 text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{resource.city}, {resource.state}</span>
          </div>
          {formattedExpiry && (
            <div className={`flex items-center gap-1.5 ${isExpired ? 'text-rose-600 font-semibold' : ''}`}>
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Expires {formattedExpiry}</span>
              {isExpired && <span className="text-[10px] bg-rose-100 px-1 rounded">(Expired)</span>}
            </div>
          )}
        </div>

        {/* Quantity progress */}
        <div className="mb-4">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-gray-500" />
              <span>Available</span>
            </span>
            <span className="font-bold text-gray-900">
              {resource.quantityAvailable} / {resource.quantityTotal}{' '}
              <span className="text-gray-500 font-normal">{resource.unit}</span>
            </span>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${pct}%` }}
              className={`h-full transition-all duration-300 ${
                pct > 40 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-300'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2">
        {isOwner ? (
          <div className="flex gap-2">
            {resource.status === 'ACTIVE' && onWithdraw && (
              <button
                onClick={() => onWithdraw(resource.id)}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                Withdraw Listing
              </button>
            )}
          </div>
        ) : isApprovedNgo ? (
          <button
            onClick={() => onClaim(resource)}
            disabled={!isAvailable || isExpired}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              !isAvailable || isExpired
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99] shadow-sm shadow-emerald-200'
            }`}
          >
            <span>
              {!isAvailable
                ? 'Fully Claimed'
                : isExpired
                ? 'Listing Expired'
                : 'Claim Quantity'}
            </span>
          </button>
        ) : (
          <div className="text-center py-1.5 text-[11px] text-gray-400 font-medium bg-gray-50 rounded-xl">
            {isAvailable ? 'Verified NGOs can claim' : 'Unavailable'}
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { UrgencyBadge } from './UrgencyBadge.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { MapPin, Building2, Package, CheckCircle2, Clock } from 'lucide-react';

export const RequestCard = ({ request, onPledge, isOwner = false }) => {
  const needed = request.quantityNeeded || 0;
  const fulfilled = request.quantityFulfilled || 0;
  const reserved = request.quantityReserved || 0;
  const remaining = Math.max(0, needed - fulfilled - reserved);

  const fulfilledPct = Math.min(100, Math.round((fulfilled / needed) * 100));
  const reservedPct = Math.min(100 - fulfilledPct, Math.round((reserved / needed) * 100));

  const isClosed = request.status === 'FULFILLED' || request.status === 'CANCELLED' || remaining === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
      <div>
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
              {request.category}
            </span>
            <UrgencyBadge urgency={request.urgency} />
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2 mb-2">
          {request.title}
        </h3>
        <p className="text-xs text-gray-600 line-clamp-3 mb-4 leading-relaxed">
          {request.description}
        </p>

        {/* NGO & Location Info */}
        <div className="space-y-1.5 text-xs text-gray-500 mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{request.ngo?.orgName || 'Verified NGO'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{request.location}</span>
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="mb-4">
          <div className="flex justify-between items-baseline text-xs mb-1.5">
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-gray-500" />
              <span>Progress</span>
            </span>
            <span className="font-bold text-gray-900">
              {fulfilled} / {needed} <span className="text-gray-500 font-normal">{request.unit}</span>
            </span>
          </div>

          {/* Dual Segment Progress Bar: Fulfilled (Green) + Reserved (Amber) */}
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${fulfilledPct}%` }}
              className="bg-emerald-500 transition-all duration-300"
              title={`Fulfilled: ${fulfilled}`}
            />
            <div
              style={{ width: `${reservedPct}%` }}
              className="bg-amber-400 transition-all duration-300"
              title={`Reserved in transit: ${reserved}`}
            />
          </div>

          <div className="flex justify-between text-[11px] text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Fulfilled ({fulfilled})</span>
            </span>
            {reserved > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>Reserved ({reserved})</span>
              </span>
            )}
            <span className="font-medium text-gray-700">
              {remaining > 0 ? `${remaining} needed` : 'Fully covered!'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2">
        {onPledge && !isOwner && (
          <button
            onClick={() => onPledge(request)}
            disabled={isClosed}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              isClosed
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99] shadow-sm shadow-emerald-200'
            }`}
          >
            <span>{isClosed ? 'Request Fully Allocated' : 'Pledge Donation'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

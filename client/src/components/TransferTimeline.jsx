import React from 'react';
import { Clock, CheckCircle2, Truck, XCircle, User, FileText } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';

export const TransferTimeline = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-[11px] text-gray-400 italic py-2">
        No lifecycle events recorded yet.
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'IN_TRANSIT':
        return <Truck className="w-3.5 h-3.5 text-blue-600" />;
      case 'CANCELLED':
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'PENDING':
      default:
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="flex items-center space-x-1.5 mb-2.5 text-xs font-bold text-gray-800">
        <Clock className="w-3.5 h-3.5 text-gray-500" />
        <span>Transfer Status Timeline ({events.length})</span>
      </div>

      <div className="space-y-3 relative pl-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
        {events.map((event, index) => {
          const isLatest = index === events.length - 1;

          return (
            <div key={event.id || index} className="relative flex items-start space-x-3 text-xs">
              {/* Dot */}
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 -ml-3.5 ring-4 ring-white ${
                  isLatest ? 'bg-emerald-600' : 'bg-gray-400'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Event Content */}
              <div className="flex-1 bg-gray-50/80 rounded-xl p-2.5 border border-gray-200/60 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5">
                    {getStatusIcon(event.toStatus)}
                    <span className="font-bold text-gray-900">
                      {event.fromStatus ? `${event.fromStatus} → ` : 'Created as '}
                    </span>
                    <StatusBadge status={event.toStatus} />
                  </div>

                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(event.createdAt).toLocaleDateString()} at{' '}
                    {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-600">
                  <span className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <span>
                      {event.changedBy?.name || 'User'} ({event.changedBy?.role || 'system'})
                    </span>
                  </span>

                  {event.note && (
                    <span className="text-gray-700 italic bg-white px-2 py-0.5 rounded border border-gray-200/50">
                      "{event.note}"
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

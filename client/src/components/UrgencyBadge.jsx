import React from 'react';

export const UrgencyBadge = ({ urgency }) => {
  const styles = {
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/20',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/20',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-500/20',
    LOW: 'bg-slate-50 text-slate-700 border-slate-300 ring-slate-500/20'
  };

  const currentStyle = styles[urgency] || styles.MEDIUM;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current animate-pulse" />
      {urgency}
    </span>
  );
};

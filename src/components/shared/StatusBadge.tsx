import React from 'react';
import { getStatusMeta } from '../../utils/statusConfig';

const toneClasses: Record<string, string> = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  orange: 'bg-amber-100 text-amber-800 border-amber-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  emerald: 'bg-green-100 text-green-900 border-green-200',
  red: 'bg-rose-100 text-rose-800 border-rose-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
};

export const StatusBadge: React.FC<{ status?: string; className?: string }> = ({ status, className = '' }) => {
  const meta = getStatusMeta(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${toneClasses[meta.tone] || toneClasses.gray} ${className}`}>
      {meta.label}
    </span>
  );
};

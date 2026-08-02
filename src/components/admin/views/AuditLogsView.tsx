import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User 
} from 'lucide-react';
import { AuditLog } from '../../../types';
import { formatDate } from '../../../utils/calculator';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((l) => {
    return (
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleExportCsv = () => {
    const headers = 'ID,Timestamp,User Email,User Role,Action,Entity Type,Entity ID,Details,IP Address\n';
    const rows = filteredLogs.map(l => 
      `"${l.id}","${l.timestamp}","${l.userEmail}","${l.userRole}","${l.action}","${l.entityType}","${l.entityId}","${l.details.replace(/"/g, '""')}","${l.ipAddress}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Statutory System Audit Trail & Compliance Log
          </h2>
          <p className="text-xs text-slate-500">Immutable audit records of all administrative actions, underwriting approvals, document edits & settings modifications.</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export Audit Trail CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search audit trail by user email, action name, loan ID, or IP..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Officer / User</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Entity Target</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    No audit log records match search filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{log.userEmail}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono">{log.userRole}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] font-extrabold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">{log.entityType} ({log.entityId})</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{log.details}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{log.ipAddress}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


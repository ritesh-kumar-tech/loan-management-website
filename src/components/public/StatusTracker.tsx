import React, { useState } from 'react';
import { api } from '../../services/api';
import { LoanApplication } from '../../types';
import { formatINR, formatDate } from '../../utils/calculator';
import { Search, Clock, CheckCircle2, AlertCircle, FileText, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import { generateApplicationAcknowledgement, generateSanctionLetter } from '../../utils/pdfGenerator';
import { CompanySettings } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { getStatusMeta } from '../../utils/statusConfig';

interface StatusTrackerProps {
  settings: CompanySettings;
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ settings }) => {
  const [identifierInput, setIdentifierInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim() || !otpInput.trim()) return;
    setLoading(true);
    setError(null);
    setApplication(null);

    try {
      const result = await api.trackApplication({
        identifier: identifierInput.trim(),
        otp: otpInput.trim(),
      });
      if (result.success && result.application) {
        setApplication(result.application);
      } else {
        setError(result.error || 'No verified loan application found for those details.');
      }
    } catch {
      setError('An error occurred while fetching application status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <Search className="w-3.5 h-3.5" /> Live Status Lookup
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Track Loan Application Status</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your Application ID or registered mobile/email, then verify with OTP to check limited status details.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-7">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Application ID or Registered Mobile/Email *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. LN-2026-000101 or 9876543210"
              value={identifierInput}
              onChange={(e) => setIdentifierInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-sm"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              OTP *
            </label>
            <input
              type="text"
              required
              inputMode="numeric"
              placeholder="Demo OTP 123456"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-sm font-mono"
            />
          </div>

          <div className="sm:col-span-12">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Checking...' : <><Search className="w-4 h-4" /> Verify and Track</>}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
      </div>

      {application && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Application Reference</span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-mono tracking-wider">{application.id}</h2>
              <p className="text-xs text-slate-500 mt-1">Submitted on: {formatDate(application.createdAt)}</p>
            </div>
            <div>
              <StatusBadge status={application.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl text-sm border border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block">Applicant Name</span>
              <span className="font-bold text-slate-900">{application.personalInfo.fullName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Loan Product</span>
              <span className="font-bold text-slate-900">{application.productTitle}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Requested Amount</span>
              <span className="font-bold text-slate-900">{formatINR(application.requestedAmount)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Requested Tenure</span>
              <span className="font-bold text-slate-900">{application.requestedTenureMonths} Months</span>
            </div>
          </div>

          {/* Status Timeline */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">Application Progress Timeline</h4>
            <div className="space-y-4">
              {application.statusHistory.map((hist, idx) => (
                <div key={idx} className="flex items-start gap-4 text-sm">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300">
                    ✓
                  </div>
                  <div className="flex-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 uppercase text-xs">{getStatusMeta(hist.status).label}</span>
                      <span className="text-xs text-slate-400">{formatDate(hist.date)}</span>
                    </div>
                    {hist.note && <p className="text-xs text-slate-600 mt-1">{hist.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download Official Documents */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
            <button
              onClick={() => generateApplicationAcknowledgement(application, settings)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Acknowledgement PDF
            </button>
            {application.status === 'approved' && (
              <button
                onClick={() => generateSanctionLetter(application, settings)}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download Official Sanction Letter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



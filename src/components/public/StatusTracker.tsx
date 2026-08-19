import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LoanApplication, LoanAccount, CompanySettings } from '../../types';
import { formatINR, formatDate } from '../../utils/calculator';
import { Search, AlertCircle, ArrowRight, Download } from 'lucide-react';
import { generateApplicationAcknowledgement, generateSanctionLetter } from '../../utils/pdfGenerator';
import { StatusBadge } from '../shared/StatusBadge';
import { getStatusMeta } from '../../utils/statusConfig';

interface StatusTrackerProps {
  settings: CompanySettings;
  onVerifiedCustomer?: (app: LoanApplication, loanAccount?: LoanAccount) => void;
}

const TRACK_IDENTIFIER_STORAGE_KEY = 'dhani_track_status_identifier';
const TRACK_LAST_CHECK_STORAGE_KEY = 'dhani_track_status_last_checked_at';
// Auto re-check is a convenience (keep the status fresh on refresh), not a
// user-initiated search - it should never be the thing that burns through
// the tracking rate limit. Skipping it when the last check was recent means
// repeated refreshes stop spamming the endpoint on their own.
const AUTO_RECHECK_MIN_INTERVAL_MS = 60 * 1000;

export const StatusTracker: React.FC<StatusTrackerProps> = ({ settings, onVerifiedCustomer }) => {
  const [identifierInput, setIdentifierInput] = useState(
    () => localStorage.getItem(TRACK_IDENTIFIER_STORAGE_KEY) || ''
  );
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [loanAccount, setLoanAccount] = useState<LoanAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAutoCheckedRef = React.useRef(false);

  const lookup = async (identifier: string) => {
    setLoading(true);
    setError(null);
    localStorage.setItem(TRACK_LAST_CHECK_STORAGE_KEY, String(Date.now()));

    try {
      const res = await api.trackApplication({ identifier });

      if (res.success && res.application) {
        setApplication(res.application);
        setLoanAccount(res.loanAccount || null);
        if (onVerifiedCustomer) {
          onVerifiedCustomer(res.application, res.loanAccount);
        }
      } else {
        setError(res.error || "We couldn't find an application with those details.");
      }
    } catch {
      setError("We couldn't find an application with those details.");
    } finally {
      setLoading(false);
    }
  };

  // Re-run the last lookup automatically on refresh so the status shown is
  // current, instead of just leaving the field pre-filled and unsubmitted.
  // Guarded so it only actually fires once per real mount (StrictMode's dev
  // double-invoke would otherwise send two requests per refresh) and so it
  // skips entirely if the last check was very recent - refreshing the page
  // several times in a row shouldn't count as several separate lookups.
  useEffect(() => {
    if (hasAutoCheckedRef.current) return;
    hasAutoCheckedRef.current = true;

    const saved = localStorage.getItem(TRACK_IDENTIFIER_STORAGE_KEY);
    if (!saved) return;

    const lastCheckedAt = Number(localStorage.getItem(TRACK_LAST_CHECK_STORAGE_KEY) || 0);
    if (Date.now() - lastCheckedAt < AUTO_RECHECK_MIN_INTERVAL_MS) return;

    lookup(saved);
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim()) {
      setError('Please enter your Application ID or registered mobile number.');
      return;
    }
    localStorage.setItem(TRACK_IDENTIFIER_STORAGE_KEY, identifierInput.trim());
    await lookup(identifierInput.trim());
  };

  const handleReset = () => {
    setApplication(null);
    setLoanAccount(null);
    setError(null);
    setIdentifierInput('');
    localStorage.removeItem(TRACK_IDENTIFIER_STORAGE_KEY);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <Search className="w-3.5 h-3.5" /> Customer Loan Tracking Portal
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Track Loan Application Status</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your Application ID or registered mobile number to view your application status.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md mb-8">
        {!application && (
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Application ID or Registered Mobile Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. LN-2026-000101 or 9876543210"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-sm font-semibold text-slate-900"
                />
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Use only your application ID or the mobile number used in the application.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Checking Application Database...' : <><Search className="w-4 h-4" /> Track Application <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div>{error}</div>
              <button
                type="button"
                onClick={handleReset}
                className="mt-2 font-bold underline hover:text-rose-900 cursor-pointer"
              >
                Clear and try a different ID
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VERIFIED APPLICATION RESULT DISPLAY */}
      {application && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Application Reference</span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-mono tracking-wider">{application.id}</h2>
              <p className="text-xs text-slate-500 mt-1">Submitted on: {formatDate(application.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={application.status} />
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                Search Again
              </button>
              {onVerifiedCustomer && (
                <button
                  onClick={() => onVerifiedCustomer(application, loanAccount || undefined)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  Go to Full Portal <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl text-xs border border-slate-100">
            <div>
              <span className="text-slate-400 block">Applicant Name</span>
              <span className="font-bold text-slate-900 text-sm">{application.personalInfo.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Loan Scheme</span>
              <span className="font-bold text-slate-900 text-sm">{application.productTitle}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Requested Amount</span>
              <span className="font-bold text-slate-900 text-sm">{formatINR(application.requestedAmount)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Requested Tenure</span>
              <span className="font-bold text-slate-900 text-sm">{application.requestedTenureMonths} Months</span>
            </div>
          </div>

          {/* Status Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Application Progress Timeline</h4>
            <div className="space-y-3">
              {application.statusHistory.map((hist, idx) => (
                <div key={idx} className="flex items-start gap-4 text-xs">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300">
                    ✓
                  </div>
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 uppercase text-[11px]">{getStatusMeta(hist.status).label}</span>
                      <span className="text-[11px] text-slate-400">{formatDate(hist.date)}</span>
                    </div>
                    {hist.note && <p className="text-slate-600 mt-1">{hist.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Documents PDF Downloads */}
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
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
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

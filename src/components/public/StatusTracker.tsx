import React, { useState } from 'react';
import { api } from '../../services/api';
import { LoanApplication, LoanAccount, CompanySettings } from '../../types';
import { formatINR, formatDate } from '../../utils/calculator';
import { Search, Clock, CheckCircle2, AlertCircle, FileText, ArrowRight, ShieldCheck, Download, KeyRound, Lock, UserCheck } from 'lucide-react';
import { generateApplicationAcknowledgement, generateSanctionLetter } from '../../utils/pdfGenerator';
import { StatusBadge } from '../shared/StatusBadge';
import { getStatusMeta } from '../../utils/statusConfig';

interface StatusTrackerProps {
  settings: CompanySettings;
  onVerifiedCustomer?: (app: LoanApplication, loanAccount?: LoanAccount) => void;
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ settings, onVerifiedCustomer }) => {
  const [identifierInput, setIdentifierInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [stage, setStage] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{ applicationId: string; maskedMobile: string; applicantName?: string; message?: string } | null>(null);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [loanAccount, setLoanAccount] = useState<LoanAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stage 1: Verify application exists by ID or Mobile
  const handleStage1Lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim()) {
      setError('Please enter your Application ID or registered mobile number.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await api.trackApplication({
        identifier: identifierInput.trim(),
        stage: 1,
      });

      if (res.success && res.requiresOtp) {
        setLookupInfo({
          applicationId: res.applicationId || identifierInput.trim(),
          maskedMobile: res.maskedMobile || '******',
          applicantName: res.applicantName,
          message: res.message,
        });
        setStage(2);
      } else {
        setError(res.error || "We couldn't find an application with those details.");
      }
    } catch {
      setError("We couldn't send the OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Verify OTP
  const handleStage2VerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await api.trackApplication({
        identifier: identifierInput.trim(),
        otp: otpInput.trim(),
        stage: 2,
      });

      if (res.success && res.application) {
        setApplication(res.application);
        setLoanAccount(res.loanAccount || null);
        if (onVerifiedCustomer) {
          onVerifiedCustomer(res.application, res.loanAccount);
        }
      } else {
        setError(res.error || 'The OTP is incorrect or has expired.');
      }
    } catch {
      setError('The OTP is incorrect or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStage(1);
    setLookupInfo(null);
    setApplication(null);
    setLoanAccount(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <Search className="w-3.5 h-3.5" /> Customer Loan Tracking Portal
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Track Loan Application Status</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your Application ID, registered email, or registered mobile number to receive an email OTP and view your application status.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md mb-8">
        {stage === 1 ? (
          /* STAGE 1 FORM */
          <form onSubmit={handleStage1Lookup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Application ID, Registered Email, or Mobile Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. LN-2026-000101, name@email.com, or 9876543210"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-sm font-semibold text-slate-900"
                />
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">You do not need to register or log in with password to track your application.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Checking Application Database...' : <><Search className="w-4 h-4" /> Find Application & Send OTP <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          /* STAGE 2 FORM */
          <form onSubmit={handleStage2VerifyOtp} className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sky-950 block text-sm mb-0.5">
                  Application Found: {lookupInfo?.applicantName || lookupInfo?.applicationId}
                </strong>
                <p>A 6-digit OTP has been sent to the registered email <strong>{lookupInfo?.maskedMobile}</strong>. Enter it below to access your loan status portal.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Enter 6-Digit Verification OTP *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-lg font-bold tracking-widest text-slate-900 font-mono"
                />
                <KeyRound className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">The OTP expires in 5 minutes and can be used only once. Demo OTP: <strong>123456</strong>.</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Verifying OTP...' : <><ShieldCheck className="w-4 h-4" /> Verify OTP & Open Customer Portal</>}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Back / Search Again
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
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

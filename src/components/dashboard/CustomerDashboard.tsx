import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { LoanApplication, LoanAccount, PaymentSubmission, InsurancePolicy, SupportTicket, CompanySettings, User } from '../../types';
import { formatINR, formatDate } from '../../utils/calculator';
import { generateApplicationAcknowledgement, generateSanctionLetter, generateLoanAgreement, generateRepaymentSchedulePDF, generatePaymentReceiptPDF, generateInsuranceCertificatePDF } from '../../utils/pdfGenerator';
import { UpiPaymentModal } from '../payment/UpiPaymentModal';
import { StatusBadge } from '../shared/StatusBadge';
import { 
  LayoutDashboard, 
  FileText, 
  Wallet, 
  CreditCard, 
  FolderCheck, 
  LifeBuoy, 
  Download, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';

interface CustomerDashboardProps {
  settings: CompanySettings;
  user?: User | null;
  verifiedApplication?: LoanApplication | null;
  verifiedLoanAccount?: LoanAccount | null;
  onStartNewApplication: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  settings,
  user,
  verifiedApplication,
  verifiedLoanAccount,
  onStartNewApplication,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'loans' | 'payments' | 'tickets'>('overview');
  const [applications, setApplications] = useState<LoanApplication[]>(verifiedApplication ? [verifiedApplication] : []);
  const [loanAccounts, setLoanAccounts] = useState<LoanAccount[]>(verifiedLoanAccount ? [verifiedLoanAccount] : []);
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal payment
  const [selectedAccountForPayment, setSelectedAccountForPayment] = useState<LoanAccount | null>(null);
  const [selectedProcessingFeeApp, setSelectedProcessingFeeApp] = useState<LoanApplication | null>(null);
  const [selectedInsurancePolicy, setSelectedInsurancePolicy] = useState<InsurancePolicy | null>(null);

  // Repayment schedule pagination (per loan account)
  const SCHEDULE_PAGE_SIZE = 12;
  const [schedulePage, setSchedulePage] = useState<Record<string, number>>({});

  // New ticket state
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketCategory, setNewTicketCategory] = useState('Payment Query');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (user) {
        const [apps, loans, pays, policies, tkts] = await Promise.all([
          api.getApplications(user.id),
          api.getLoanAccounts(user.id),
          api.getPayments({ userId: user.id }),
          api.getInsurancePolicies({ userId: user.id }),
          api.getSupportTickets(user.id),
        ]);
        setApplications(apps);
        setLoanAccounts(loans);
        setPayments(pays);
        setInsurancePolicies(policies);
        setTickets(tkts);
      } else if (verifiedApplication) {
        // Not logged in: the customer only proved ownership of one application via
        // /api/applications/track (App ID or mobile match), so re-use that same
        // scoped, masked lookup to refresh instead of fetching every application
        // and loan account in the system and filtering client-side.
        const [trackResult, pays, policies] = await Promise.all([
          api.trackApplication({ identifier: verifiedApplication.id }),
          api.getPayments({ applicationId: verifiedApplication.id }),
          api.getInsurancePolicies({ applicationId: verifiedApplication.id }),
        ]);
        const refreshedApp = trackResult.application || verifiedApplication;
        const refreshedLoan = trackResult.loanAccount || verifiedLoanAccount || null;
        setApplications([refreshedApp]);
        setLoanAccounts(refreshedLoan ? [refreshedLoan] : []);
        setPayments(pays);
        setInsurancePolicies(policies);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, verifiedApplication?.id]);

  const primaryLoan = loanAccounts[0];
  const nextEmiInst = primaryLoan?.schedule.find((s) => s.status === 'due' || s.status === 'upcoming');

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

    await api.sendSupportMessage({
      sender: 'customer',
      text: newTicketMessage,
      category: newTicketCategory,
      subject: newTicketSubject,
      userId: user.id,
      customerName: user.fullName,
      customerEmail: user.email,
      phone: user.mobile,
      applicationId: verifiedApplication.id,
    });

    setShowNewTicketModal(false);
    setNewTicketSubject('');
    setNewTicketMessage('');
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Welcome */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Customer Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.fullName || verifiedApplication?.personalInfo?.fullName || applications[0]?.personalInfo?.fullName || 'Valued Customer'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">Manage your active loans, track applications, and make secure UPI repayments.</p>
        </div>

        <button
          onClick={onStartNewApplication}
          className="px-5 py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Apply for New Loan
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
          { id: 'applications', label: 'My Applications', icon: FileText },
          { id: 'loans', label: 'My Active Loans', icon: Wallet },
          { id: 'payments', label: 'Payments & Receipts', icon: CreditCard },
          { id: 'tickets', label: 'Support & Help Desk', icon: LifeBuoy },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900 bg-slate-50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Loan Accounts</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{loanAccounts.length}</div>
              <span className="text-xs text-emerald-600 font-semibold mt-1 block">✓ Fully Serviced</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Outstanding Principal</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatINR(loanAccounts.reduce((acc, curr) => acc + curr.outstandingPrincipal, 0))}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Across all loans</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Next Due Monthly EMI</span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                {nextEmiInst ? formatINR(nextEmiInst.emiAmount) : '₹0'}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {nextEmiInst ? `Due on ${formatDate(nextEmiInst.dueDate)}` : 'No pending EMIs'}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Repaid to Date</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {formatINR(loanAccounts.reduce((acc, curr) => acc + curr.totalPaid, 0))}
              </div>
              <span className="text-xs text-emerald-600 font-semibold mt-1 block">Verified via UPI</span>
            </div>
          </div>

          {/* Active Loan Quick Pay Box */}
          {primaryLoan && nextEmiInst && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Installment Alert</span>
                <h3 className="text-lg font-bold text-slate-900">
                  {primaryLoan.customerName} - {primaryLoan.accountNumber} ({formatINR(nextEmiInst.emiAmount)})
                </h3>
                <p className="text-xs text-slate-600">Due date: {formatDate(nextEmiInst.dueDate)}</p>
              </div>

              <button
                onClick={() => setSelectedAccountForPayment(primaryLoan)}
                className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              >
                <CreditCard className="w-4 h-4" /> Pay EMI via UPI Now
              </button>
            </div>
          )}

          {/* Recent Applications List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">Recent Applications & Status</h3>
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{app.id}</span>
                    <span className="text-xs font-semibold text-slate-600 block">{app.productTitle} • {formatINR(app.requestedAmount)}</span>
                    <span className="text-xs text-slate-400">Applied on {formatDate(app.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                    <button
                      onClick={() => generateApplicationAcknowledgement(app, settings)}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {activeTab === 'applications' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">My Loan Applications</h2>
            <button
              onClick={onStartNewApplication}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              + New Application
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {applications.map((app) => {
              const allDocsVerified = app.documents && app.documents.length > 0 && app.documents.every((d) => d.status === 'verified');
              const isFeePending = app.status === 'processing_fee_pending';
              const isFeeSubmitted = app.status === 'processing_fee_submitted';
              const isFeeVerified = app.status === 'payment_verified' || app.status === 'approved' || app.status === 'active' || app.status === 'loan_disbursed';

              return (
                <div key={app.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-400 font-mono">{app.id}</span>
                      <h3 className="text-lg font-bold text-slate-900">{app.productTitle}</h3>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  {/* Application Timeline Progress Bar */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-3">Application Progress Timeline</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 font-bold">
                        1. Submitted ✓
                      </div>
                      <div className={`p-2 rounded-lg font-bold ${allDocsVerified ? 'bg-emerald-100 text-emerald-900' : app.documents?.some(d => d.status === 'rejected') ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>
                        2. Docs {allDocsVerified ? 'Verified ✓' : 'Under Review ⏳'}
                      </div>
                      <div className={`p-2 rounded-lg font-bold ${isFeeVerified ? 'bg-emerald-100 text-emerald-900' : isFeeSubmitted ? 'bg-blue-100 text-blue-900' : isFeePending ? 'bg-amber-100 text-amber-900 shadow-2xs animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                        3. Fee {isFeeVerified ? 'Paid ✓' : isFeeSubmitted ? 'Submitted ⏳' : isFeePending ? 'Required ⚠️' : 'Pending'}
                      </div>
                      <div className={`p-2 rounded-lg font-bold ${app.status === 'approved' || app.status === 'loan_disbursed' || app.status === 'active' ? 'bg-emerald-100 text-emerald-900' : app.status === 'rejected' ? 'bg-rose-100 text-rose-900' : 'bg-slate-200 text-slate-500'}`}>
                        4. Final Review
                      </div>
                      <div className={`p-2 rounded-lg font-bold ${app.status === 'approved' || app.status === 'loan_disbursed' || app.status === 'active' ? 'bg-emerald-100 text-emerald-900 font-extrabold' : app.status === 'rejected' ? 'bg-rose-100 text-rose-900' : 'bg-slate-200 text-slate-500'}`}>
                        5. {app.status === 'approved' || app.status === 'loan_disbursed' || app.status === 'active' ? 'Loan Approved ✓' : app.status === 'rejected' ? 'Rejected' : 'Disbursement'}
                      </div>
                    </div>
                  </div>

                  {/* Processing Fee Payment Callout (If Processing Fee Pending) */}
                  {isFeePending && (
                    <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" /> Documents Verified — Processing Fee Required
                        </div>
                        <p className="text-xs text-amber-800 mt-1">
                          Your uploaded documents have been verified by our credit team. Please pay the loan application processing fee of <strong>{formatINR(app.processingFee || 2000)}</strong> to proceed to final underwriting.
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedProcessingFeeApp(app)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" /> Pay Processing Fee ({formatINR(app.processingFee || 2000)})
                      </button>
                    </div>
                  )}

                  {isFeeSubmitted && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" /> Processing Fee Payment Submitted. Awaiting credit desk confirmation.
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Requested Amount</span>
                      <strong className="text-slate-900 text-sm">{formatINR(app.requestedAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tenure</span>
                      <strong className="text-slate-900 text-sm">{app.requestedTenureMonths} Months</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">PAN Number</span>
                      <strong className="text-slate-900 text-sm">{app.personalInfo.panNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Submitted On</span>
                      <strong className="text-slate-900 text-sm">{formatDate(app.createdAt)}</strong>
                    </div>
                  </div>

                  {/* Document Verification Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">Uploaded KYC & Financial Documents</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {app.documents?.map((doc) => (
                        <div key={doc.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 block">{doc.title}</span>
                            <span className="text-[10px] text-slate-400">{doc.fileName}</span>
                            {doc.rejectionNote && <span className="text-[10px] text-rose-600 block mt-0.5">{doc.rejectionNote}</span>}
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : doc.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Official Letters */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white text-blue-700 border border-blue-100 grid place-items-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">Official Letters & Documents</span>
                          <h4 className="text-base font-black text-slate-950 mt-0.5">Loan application document center</h4>
                          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                            Download your application acknowledgement and approved sanction letter in the official format used for customer loan records.
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase w-fit ${
                        app.status === 'approved' || app.status === 'loan_disbursed' || app.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {app.status === 'approved' || app.status === 'loan_disbursed' || app.status === 'active' ? 'Sanction Available' : 'Sanction Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-xl bg-white border border-blue-100 p-3">
                        <span className="text-slate-500 block">Reference No.</span>
                        <strong className="text-slate-950 font-mono">SANC/{app.id}/2026</strong>
                      </div>
                      <div className="rounded-xl bg-white border border-blue-100 p-3">
                        <span className="text-slate-500 block">Sanctioned Amount</span>
                        <strong className="text-slate-950">{formatINR(app.approvedAmount || app.requestedAmount)}</strong>
                      </div>
                      <div className="rounded-xl bg-white border border-blue-100 p-3">
                        <span className="text-slate-500 block">Approved EMI</span>
                        <strong className="text-slate-950">{app.approvedEmi ? formatINR(app.approvedEmi) : 'After approval'}</strong>
                      </div>
                      <div className="rounded-xl bg-white border border-blue-100 p-3">
                        <span className="text-slate-500 block">Letter Validity</span>
                        <strong className="text-slate-950">15 days from issue</strong>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <p className="text-[11px] text-slate-500">
                        Subject to verification, agreement execution, and final disbursement checks.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => generateApplicationAcknowledgement(app, settings)}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-blue-100 text-xs font-extrabold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Acknowledgement PDF
                        </button>
                        {(app.status === 'approved' || app.status === 'loan_disbursed' || app.status === 'active') && (
                          <button
                            onClick={() => generateSanctionLetter(app, settings)}
                            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Official Sanction Letter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Insurance */}
                  {(() => {
                    const policy = insurancePolicies.find((p) => p.applicationId === app.id);
                    if (!policy) return null;
                    return (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800">Insurance Policy</span>
                            <h4 className="text-sm font-black text-slate-950 mt-0.5">Policy {policy.policyNumber}</h4>
                            {policy.planDescription && <p className="text-xs text-slate-600 mt-0.5">{policy.planDescription}</p>}
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase w-fit ${
                            policy.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                            policy.status === 'payment_submitted' ? 'bg-sky-100 text-sky-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {policy.status === 'active' ? 'Active' : policy.status === 'payment_submitted' ? 'Payment Under Verification' : 'Awaiting Payment'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div className="rounded-xl bg-white border border-indigo-100 p-3">
                            <span className="text-slate-500 block">Security Amount</span>
                            <strong className="text-slate-950">{formatINR(policy.securityAmount)}</strong>
                          </div>
                          <div className="rounded-xl bg-white border border-indigo-100 p-3">
                            <span className="text-slate-500 block">Insurance Charges</span>
                            <strong className="text-slate-950">{formatINR(policy.insuranceCharges)}</strong>
                          </div>
                          <div className="rounded-xl bg-white border border-indigo-100 p-3">
                            <span className="text-slate-500 block">Total Premium</span>
                            <strong className="text-slate-950">{formatINR(policy.totalAmount)}</strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {policy.status === 'issued' && (
                            <button
                              onClick={() => setSelectedInsurancePolicy(policy)}
                              className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              Pay Insurance Premium via UPI
                            </button>
                          )}
                          {policy.status === 'payment_submitted' && (
                            <span className="text-[11px] text-sky-700 font-bold">Your payment is under verification. The certificate will unlock once approved.</span>
                          )}
                          {policy.status === 'active' && (
                            <button
                              onClick={() => generateInsuranceCertificatePDF(policy, app, settings)}
                              className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" /> Download Insurance Certificate PDF
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LOANS TAB */}
      {activeTab === 'loans' && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-xl font-bold text-slate-900">My Active Loan Accounts</h2>
          <div className="grid grid-cols-1 gap-6">
            {loanAccounts.map((loan) => (
              <div key={loan.accountNumber} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 font-mono">ACCOUNT #{loan.accountNumber}</span>
                    <h3 className="text-lg font-bold text-slate-900">{loan.customerName} - {loan.loanType.toUpperCase()} LOAN</h3>
                  </div>
                  <button
                    onClick={() => setSelectedAccountForPayment(loan)}
                    className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Pay EMI via UPI
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
                  <div>
                    <span className="text-slate-400 block">Sanctioned Principal</span>
                    <strong className="text-slate-900 text-sm">{formatINR(loan.principalAmount)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Interest Rate</span>
                    <strong className="text-slate-900 text-sm">{loan.interestRate}% p.a.</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Monthly EMI</span>
                    <strong className="text-emerald-700 text-sm font-extrabold">{formatINR(loan.monthlyEmi)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Outstanding Balance</span>
                    <strong className="text-slate-900 text-sm">{formatINR(loan.outstandingPrincipal)}</strong>
                  </div>
                </div>

                {/* Repayment Schedule */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Installment Schedule</h4>
                  {(() => {
                    const page = schedulePage[loan.accountNumber] || 0;
                    const totalPages = Math.max(1, Math.ceil(loan.schedule.length / SCHEDULE_PAGE_SIZE));
                    const currentPage = Math.min(page, totalPages - 1);
                    const pageRows = loan.schedule.slice(
                      currentPage * SCHEDULE_PAGE_SIZE,
                      currentPage * SCHEDULE_PAGE_SIZE + SCHEDULE_PAGE_SIZE
                    );
                    const setPage = (next: number) =>
                      setSchedulePage((prev) => ({ ...prev, [loan.accountNumber]: Math.max(0, Math.min(totalPages - 1, next)) }));

                    return (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                              <tr>
                                <th className="py-2 px-3">Inst #</th>
                                <th className="py-2 px-3">Due Date</th>
                                <th className="py-2 px-3">EMI Amount</th>
                                <th className="py-2 px-3">Status</th>
                                <th className="py-2 px-3">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {pageRows.map((s) => {
                                const pendingPayment = payments.find(
                                  (p) =>
                                    p.loanAccountId === loan.accountNumber &&
                                    p.installmentNumber === s.installmentNumber &&
                                    p.status === 'pending_verification'
                                );
                                return (
                                  <tr key={s.installmentNumber}>
                                    <td className="py-2 px-3 font-semibold">Month {s.installmentNumber}</td>
                                    <td className="py-2 px-3">{formatDate(s.dueDate)}</td>
                                    <td className="py-2 px-3 font-bold text-slate-900">{formatINR(s.emiAmount)}</td>
                                    <td className="py-2 px-3">
                                      {pendingPayment ? (
                                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-sky-100 text-sky-800">
                                          Pending Verification
                                        </span>
                                      ) : (
                                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                          s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          {s.status}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      {s.status !== 'paid' && !pendingPayment && (
                                        <button
                                          onClick={() => setSelectedAccountForPayment(loan)}
                                          className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                                        >
                                          Pay Now
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-3 text-xs">
                            <span className="text-slate-500 font-semibold">
                              Months {currentPage * SCHEDULE_PAGE_SIZE + 1}
                              -{Math.min(loan.schedule.length, (currentPage + 1) * SCHEDULE_PAGE_SIZE)} of {loan.schedule.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPage(currentPage - 1)}
                                disabled={currentPage === 0}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Previous
                              </button>
                              <span className="text-slate-500 font-semibold">Page {currentPage + 1} of {totalPages}</span>
                              <button
                                type="button"
                                onClick={() => setPage(currentPage + 1)}
                                disabled={currentPage >= totalPages - 1}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => generateRepaymentSchedulePDF(loan, settings)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Repayment Schedule PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-xl font-bold text-slate-900">UPI Payment History & Verified Receipts</h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">UPI UTR Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.id}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">{formatINR(p.amount)}</td>
                      <td className="py-3 px-4 font-mono">{p.utrNumber}</td>
                      <td className="py-3 px-4">{formatDate(p.paymentDate)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                          p.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT TAB */}
      {activeTab === 'tickets' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Support & Help Desk Tickets</h2>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              + Create Support Ticket
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tickets.map((t) => (
              <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-mono font-bold text-xs text-slate-500">{t.id} • {t.category}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold uppercase">{t.status}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{t.subject}</h3>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  {t.messages.map((m, idx) => (
                    <div key={idx} className={`p-2 rounded-lg ${m.sender === 'customer' ? 'bg-white text-slate-800' : 'bg-emerald-50 text-emerald-900'}`}>
                      <strong>{m.sender.toUpperCase()}:</strong> {m.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedAccountForPayment && (
        <UpiPaymentModal
          settings={settings}
          loanAccountId={selectedAccountForPayment.accountNumber}
          applicationId={selectedAccountForPayment.applicationId}
          userId={user?.id || 'usr_guest'}
          customerName={user?.fullName || selectedAccountForPayment.customerName}
          amountPayable={selectedAccountForPayment.monthlyEmi}
          purpose="emi"
          installmentNumber={1}
          onClose={() => setSelectedAccountForPayment(null)}
          onPaymentSubmitted={() => {
            setSelectedAccountForPayment(null);
            loadData();
          }}
        />
      )}

      {/* Processing Fee Payment Modal */}
      {selectedProcessingFeeApp && (
        <UpiPaymentModal
          settings={settings}
          loanAccountId=""
          applicationId={selectedProcessingFeeApp.id}
          userId={user?.id || selectedProcessingFeeApp.userId}
          customerName={user?.fullName || selectedProcessingFeeApp.personalInfo.fullName}
          amountPayable={selectedProcessingFeeApp.processingFee || 2000}
          purpose="processing_fee"
          onClose={() => setSelectedProcessingFeeApp(null)}
          onPaymentSubmitted={() => {
            setSelectedProcessingFeeApp(null);
            loadData();
          }}
        />
      )}

      {/* Insurance Premium Payment Modal */}
      {selectedInsurancePolicy && (
        <UpiPaymentModal
          settings={settings}
          loanAccountId=""
          applicationId={selectedInsurancePolicy.applicationId}
          userId={user?.id || selectedInsurancePolicy.userId}
          customerName={user?.fullName || selectedInsurancePolicy.customerName}
          amountPayable={selectedInsurancePolicy.totalAmount}
          purpose="insurance"
          insurancePolicyId={selectedInsurancePolicy.id}
          onClose={() => setSelectedInsurancePolicy(null)}
          onPaymentSubmitted={() => {
            setSelectedInsurancePolicy(null);
            loadData();
          }}
        />
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Support Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newTicketCategory}
                  onChange={(e) => setNewTicketCategory(e.target.value)}
                  className="w-full p-2 rounded-xl border text-xs"
                >
                  <option value="Payment Query">Payment Query</option>
                  <option value="Document Verification">Document Verification</option>
                  <option value="Disbursement Status">Disbursement Status</option>
                  <option value="General Query">General Query</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  className="w-full p-2 rounded-xl border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Description</label>
                <textarea
                  required
                  rows={3}
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  className="w-full p-2 rounded-xl border text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



import React, { useEffect, useRef, useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Download, 
  ExternalLink,
  X, 
  ShieldCheck, 
  Calculator, 
  FileCheck2, 
  AlertTriangle, 
  Sparkles,
  Printer,
  ChevronRight,
  UserCheck,
  Building2,
  Check,
  Plus,
  Trash2
} from 'lucide-react';
import { LoanApplication, ApplicationStatus } from '../../../types';
import { formatINR, formatDate, calculateEmi, calculateFOIR } from '../../../utils/calculator';
import { 
  generateSanctionLetter, 
  generateGeneralLoanLetter,
  generateLoanAgreement, 
  generateApplicationEmiSchedulePDF,
  generateProvisionalEligibilityLetter 
} from '../../../utils/pdfGenerator';
import { StatusBadge } from '../../shared/StatusBadge';

interface ApplicationManagementViewProps {
  applications: LoanApplication[];
  settings: any;
  onUpdateStatus: (id: string, payload: any) => Promise<void>;
  onVerifyDocument: (appId: string, docId: string, status: string, note?: string) => Promise<void>;
}

export const ApplicationManagementView: React.FC<ApplicationManagementViewProps> = ({
  applications,
  settings,
  onUpdateStatus,
  onVerifyDocument,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);

  // Approval Form State
  const [approveAmount, setApproveAmount] = useState<number>(300000);
  const [approveRate, setApproveRate] = useState<number>(12.5);
  const [approveTenure, setApproveTenure] = useState<number>(24);
  const [approveNote, setApproveNote] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const [previewedDocId, setPreviewedDocId] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [docRejectNote, setDocRejectNote] = useState('');
  const [processingBaseFee, setProcessingBaseFee] = useState(2000);
  const [processingExpenses, setProcessingExpenses] = useState<{ id: string; label: string; amount: number }[]>([]);

  const filteredApps = applications.filter((app) => {
    const matchesSearch = 
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.personalInfo?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.personalInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.personalInfo?.mobile?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesProduct = productFilter === 'all' || app.productType === productFilter;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  const openReviewModal = (app: LoanApplication) => {
    setSelectedApp(app);
    setApproveAmount(app.approvedAmount || app.requestedAmount || 300000);
    setApproveRate(app.approvedRate || 12.5);
    setApproveTenure(app.approvedTenureMonths || app.requestedTenureMonths || 24);
    setApproveNote('');
    setRejectionReason('');
    setPreviewedDocId(null);
    setRejectingDocId(null);
    setDocRejectNote('');
    setProcessingBaseFee(app.processingFee || Math.round(((app.approvedAmount || app.requestedAmount || 0) * 1.5) / 100) || 2000);
    setProcessingExpenses([]);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setIsActionLoading(true);
    try {
      await onUpdateStatus(selectedApp.id, {
        status: 'approved',
        note: approveNote || 'Loan approved by Credit Committee',
        approvedAmount: Number(approveAmount),
        approvedRate: Number(approveRate),
        approvedTenureMonths: Number(approveTenure),
        processingFee: Math.round((Number(approveAmount) * 1.5) / 100),
      });
      setSelectedApp(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    setIsActionLoading(true);
    try {
      await onUpdateStatus(selectedApp.id, {
        status: 'rejected',
        note: rejectionReason || 'Failed credit underwriting criteria',
        rejectionReason: rejectionReason || 'Credit policy threshold not met',
      });
      setSelectedApp(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    if (selectedApp) modalBodyRef.current?.scrollTo({ top: 0 });
  }, [selectedApp?.id]);

  const handleDocVerify = async (docId: string, actionStatus: 'verified' | 'rejected', note?: string) => {
    if (!selectedApp) return;
    await onVerifyDocument(selectedApp.id, docId, actionStatus, note);
    const updatedDocs = selectedApp.documents.map(d => {
      if (d.id !== docId) return d;
      return actionStatus === 'verified'
        ? { ...d, status: actionStatus, rejectionNote: undefined }
        : { ...d, status: actionStatus, rejectionNote: note };
    });
    setSelectedApp({ ...selectedApp, documents: updatedDocs });
    setRejectingDocId(null);
    setDocRejectNote('');
  };

  // Preview EMI calculation in approval box
  const previewCalc = calculateEmi(approveAmount, approveRate, approveTenure, 1.5);
  const processingExpenseTotal = processingExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const processingFeeTotal = Math.max(0, Number(processingBaseFee) || 0) + processingExpenseTotal;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Credit Underwriting & Application Workspace
          </h2>
          <p className="text-xs text-slate-500">Review borrower risk profiles, income verification, document verification & sanction approvals.</p>
        </div>

        <div className="flex items-center gap-2 font-semibold text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Clock className="w-4 h-4 text-amber-500" /> {applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length} Applications Awaiting Review
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'all', label: `All (${applications.length})` },
            { id: 'submitted', label: 'Submitted' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'documents_pending', label: 'Docs Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Application ID (LN-2026-...), Applicant Name, Email, or Phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="all">All Loan Products</option>
              <option value="personal">Personal Loans</option>
              <option value="business">Business Growth Loans</option>
              <option value="home">Home Housing Loans</option>
              <option value="education">Education Loans</option>
              <option value="vehicle">Vehicle Loans</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Requested Amt</th>
                <th className="py-3 px-4">Monthly Income</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No loan applications match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{app.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{app.personalInfo?.fullName || 'Applicant'}</div>
                      <div className="text-[10px] text-slate-500">{app.personalInfo?.email} • {app.personalInfo?.mobile}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{app.productTitle}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatINR(app.requestedAmount)}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {formatINR(app.financialInfo?.monthlyIncome || 0)}/m
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(app.createdAt)}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openReviewModal(app)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review & Underwrite
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Underwriting Workspace Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 overflow-hidden">
          <div ref={modalBodyRef} className="bg-white rounded-3xl max-w-5xl w-full max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-150">
            {/* Modal Top Banner */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                    {selectedApp.id}
                  </span>
                  <StatusBadge status={selectedApp.status} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedApp.personalInfo?.fullName}</h3>
                <p className="text-xs text-slate-500">{selectedApp.productTitle} • Requested Amount: {formatINR(selectedApp.requestedAmount)} over {selectedApp.requestedTenureMonths} Months</p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Applicant Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Column: Personal & Employment */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase text-[11px] tracking-wider">
                  Personal & Employment Info
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Father / Spouse</span>
                    <span className="font-bold text-slate-800">{selectedApp.personalInfo?.fatherOrSpouseName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">PAN Number</span>
                    <span className="font-bold font-mono text-slate-800">{selectedApp.personalInfo?.panNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Aadhaar (Last 4)</span>
                    <span className="font-bold font-mono text-slate-800">XXXX-XXXX-{selectedApp.personalInfo?.aadhaarLast4}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Employment Type</span>
                    <span className="font-bold capitalize text-slate-800">{selectedApp.employmentInfo?.employmentType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Employer / Business</span>
                    <span className="font-bold text-slate-800">{selectedApp.employmentInfo?.companyOrBizName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Monthly Income</span>
                    <span className="font-extrabold text-slate-900">{formatINR(selectedApp.financialInfo?.monthlyIncome || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial & Debt Ratios */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase text-[11px] tracking-wider">
                  Financial Underwriting Ratios
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Existing EMIs</span>
                    <span className="font-bold text-slate-800">{formatINR(selectedApp.financialInfo?.existingEmis || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Salary Bank</span>
                    <span className="font-bold text-slate-800">{selectedApp.financialInfo?.bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Account Number</span>
                    <span className="font-bold font-mono text-slate-800">{selectedApp.financialInfo?.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">IFSC Code</span>
                    <span className="font-bold font-mono text-slate-800">{selectedApp.financialInfo?.ifscCode}</span>
                  </div>
                </div>

                {selectedApp.eligibilityResult && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium">
                    <span className="font-bold">Automated Credit Rule Result: </span>
                    <span className="uppercase font-extrabold">{selectedApp.eligibilityResult.status}</span> • FOIR: {selectedApp.eligibilityResult.foirPercent}%
                  </div>
                )}
              </div>
            </div>

            {/* Document Verification Section */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
                <span>Uploaded Documents Verification</span>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedApp.documents?.filter((d) => d.status === 'verified').length} of {selectedApp.documents?.length || 0} Verified
                </span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {selectedApp.documents?.map((doc) => (
                  <div key={doc.id} className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col justify-between gap-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{doc.title}</div>
                        <div className="text-[10px] text-slate-500">{doc.fileName}</div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : doc.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>

                    {previewedDocId === doc.id && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                        {doc.fileUrl ? (
                          doc.fileUrl.match(/\.(png|jpe?g|webp|gif)$/i) || doc.fileUrl.startsWith('data:image') ? (
                            <img src={doc.fileUrl} alt={doc.title} className="h-48 w-full object-contain bg-white" />
                          ) : (
                            <iframe title={doc.title} src={doc.fileUrl} className="h-48 w-full bg-white" />
                          )
                        ) : (
                          <div className="h-32 grid place-items-center text-slate-400 font-semibold">No preview file available</div>
                        )}
                      </div>
                    )}

                    {doc.rejectionNote && (
                      <div className="text-[11px] text-rose-700 font-medium bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                        Reason: {doc.rejectionNote}
                      </div>
                    )}

                    {rejectingDocId === doc.id && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 space-y-2">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Reason visible to customer</label>
                        <textarea
                          value={docRejectNote}
                          onChange={(e) => setDocRejectNote(e.target.value)}
                          rows={2}
                          placeholder="Example: Please upload the latest 6-month bank statement with all pages visible."
                          className="w-full rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-rose-300"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setRejectingDocId(null);
                              setDocRejectNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white text-slate-600 border border-slate-200 font-bold text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => docRejectNote.trim() && handleDocVerify(doc.id, 'rejected', docRejectNote.trim())}
                            disabled={!docRejectNote.trim()}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] cursor-pointer disabled:opacity-50"
                          >
                            Save Rejection
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => setPreviewedDocId(previewedDocId === doc.id ? null : doc.id)}
                        className="flex-1 min-w-24 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] cursor-pointer inline-flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> {previewedDocId === doc.id ? 'Hide' : 'View'}
                      </button>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 min-w-24 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] cursor-pointer inline-flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      )}
                      <button
                        onClick={() => handleDocVerify(doc.id, 'verified')}
                        className="flex-1 min-w-24 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => {
                          setRejectingDocId(doc.id);
                          setDocRejectNote(doc.rejectionNote || '');
                        }}
                        className="flex-1 min-w-24 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document PDF Generation Quick Tools */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-emerald-600" /> Generate Official Loan Letters
                </span>
                <span className="text-[11px] text-slate-500">Creates a new PDF from application data — not the customer's uploaded Aadhaar/PAN file</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                <PdfAction
                  title="General Loan Letter"
                  description="Customer summary and general loan processing terms."
                  onClick={() => generateGeneralLoanLetter(selectedApp, settings)}
                />
                <PdfAction
                  title="Sanction Letter"
                  description="Approved amount, EMI, conditions and validity."
                  onClick={() => generateSanctionLetter(selectedApp, settings)}
                />
                <PdfAction
                  title="Loan Agreement"
                  description="Borrower undertaking and repayment terms."
                  onClick={() => generateLoanAgreement(selectedApp, settings)}
                />
                <PdfAction
                  title="EMI Schedule"
                  description="Month-wise indicative repayment schedule."
                  onClick={() => generateApplicationEmiSchedulePDF(selectedApp, settings)}
                />
              </div>
            </div>

            {/* Processing Fee Control Section */}
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-3 text-xs">
              <h4 className="font-bold text-sky-950 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-700" /> Processing Fee Management
              </h4>

              {selectedApp.documents?.some((d) => d.status !== 'verified') ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-medium">
                  <strong>Notice:</strong> All mandatory documents must be verified before the processing fee can be requested. ({selectedApp.documents?.filter((d) => d.status !== 'verified').length} document(s) pending).
                </div>
              ) : selectedApp.status === 'documents_verified' || selectedApp.status === 'submitted' || selectedApp.status === 'under_review' ? (
                <div className="bg-white p-3 rounded-xl border border-sky-100 space-y-3">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">All Documents Verified ✓</span>
                    <span className="text-slate-500 text-[11px]">Request customer to pay loan application processing fee.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={processingBaseFee}
                      onChange={(e) => setProcessingBaseFee(Number(e.target.value))}
                      className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                      placeholder="₹2000"
                    />
                    <button
                      onClick={async () => {
                        setIsActionLoading(true);
                        try {
                          const fee = processingFeeTotal;
                          await onUpdateStatus(selectedApp.id, {
                            status: 'processing_fee_pending',
                            processingFee: fee,
                            note: `Processing fee of ₹${fee} requested by Admin.`,
                          });
                          setSelectedApp({ ...selectedApp, status: 'processing_fee_pending', processingFee: fee });
                        } finally {
                          setIsActionLoading(false);
                        }
                      }}
                      disabled={processingFeeTotal <= 0 || isActionLoading}
                      className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      Send Fee Request
                    </button>
                  </div>

                  <div className="border-t border-sky-100 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Other expenses</span>
                      <button
                        onClick={() => setProcessingExpenses([...processingExpenses, { id: `fee_${Date.now()}`, label: 'Additional expense', amount: 0 }])}
                        className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>

                    {processingExpenses.map((expense) => (
                      <div key={expense.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_32px] gap-2">
                        <input
                          value={expense.label}
                          onChange={(e) => setProcessingExpenses(processingExpenses.map((item) => item.id === expense.id ? { ...item, label: e.target.value } : item))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                          placeholder="Expense name"
                        />
                        <input
                          type="number"
                          value={expense.amount}
                          onChange={(e) => setProcessingExpenses(processingExpenses.map((item) => item.id === expense.id ? { ...item, amount: Number(e.target.value) } : item))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                          placeholder="Amount"
                        />
                        <button
                          onClick={() => setProcessingExpenses(processingExpenses.filter((item) => item.id !== expense.id))}
                          className="h-9 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 grid place-items-center cursor-pointer"
                          aria-label="Remove expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="rounded-xl bg-slate-900 text-white p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>Base Fee: <strong>{formatINR(processingBaseFee || 0)}</strong></div>
                      <div>Other Expenses: <strong>{formatINR(processingExpenseTotal)}</strong></div>
                      <div className="sm:text-right">Total Payable: <strong className="text-emerald-300">{formatINR(processingFeeTotal)}</strong></div>
                    </div>
                  </div>
                </div>
              ) : selectedApp.status === 'processing_fee_submitted' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-950">
                  <div className="font-bold text-xs">Processing Fee Payment Submitted by Customer</div>
                  <p className="text-[11px]">Amount: <strong>{formatINR(selectedApp.processingFee || 2000)}</strong>. Review payment submission proof in the Payments verification section.</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        await onUpdateStatus(selectedApp.id, {
                          status: 'payment_verified',
                          note: 'Processing fee payment verified by Admin.',
                        });
                        setSelectedApp({ ...selectedApp, status: 'payment_verified' });
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Verify Processing Fee Payment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-sky-100 text-slate-700 font-semibold flex items-center justify-between">
                  <span>Processing Fee: <strong>{formatINR(selectedApp.processingFee || 2000)}</strong></span>
                  <span className="text-emerald-700 font-bold uppercase text-[11px]">Status: {selectedApp.status.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>

            {/* Sanction & Terms Approval Form Box */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4">
              <h4 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Sanction Terms & Final Approval Decision
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Approved Amount (₹)</label>
                  <input
                    type="number"
                    value={approveAmount}
                    onChange={(e) => setApproveAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Approved Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={approveRate}
                    onChange={(e) => setApproveRate(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    value={approveTenure}
                    onChange={(e) => setApproveTenure(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm"
                  />
                </div>
              </div>

              {/* Real-time EMI Preview Calculation */}
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between text-xs font-semibold">
                <span>Calculated Monthly EMI: <strong className="text-emerald-400 font-bold">{formatINR(previewCalc.monthlyEmi)}</strong></span>
                <span>Processing Fee (1.5%): <strong className="text-slate-200">{formatINR(Math.round((approveAmount * 1.5) / 100))}</strong></span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={isActionLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Sanction Loan
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isActionLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject Loan
                  </button>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PdfAction: React.FC<{ title: string; description: string; onClick: () => void }> = ({ title, description, onClick }) => (
  <button
    onClick={onClick}
    className="group rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 p-3 text-left shadow-2xs transition-all cursor-pointer"
  >
    <span className="flex items-center justify-between gap-2">
      <span className="font-extrabold text-slate-900 text-xs">{title}</span>
      <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
    </span>
    <span className="block text-[11px] text-slate-500 mt-1 leading-snug">{description}</span>
  </button>
);



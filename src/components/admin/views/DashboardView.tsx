import React from 'react';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Coins, 
  AlertTriangle, 
  CreditCard, 
  FileCheck2, 
  HelpCircle, 
  TrendingUp, 
  ArrowUpRight, 
  PlusCircle, 
  Eye, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { LoanApplication, LoanAccount, PaymentSubmission, SupportTicket, CompanySettings } from '../../../types';
import { formatINR, formatDate } from '../../../utils/calculator';

interface DashboardViewProps {
  applications: LoanApplication[];
  loanAccounts: LoanAccount[];
  payments: PaymentSubmission[];
  customers: any[];
  tickets: SupportTicket[];
  settings: CompanySettings;
  onNavigate: (section: string) => void;
  onSelectApplication: (app: LoanApplication) => void;
  onVerifyPayment: (paymentId: string, action: 'approve' | 'reject') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  applications,
  loanAccounts,
  payments,
  customers,
  tickets,
  settings,
  onNavigate,
  onSelectApplication,
  onVerifyPayment,
}) => {
  // Computed stats
  const totalApps = applications.length;
  const underReview = applications.filter(a => a.status === 'under_review' || a.status === 'submitted' || a.status === 'documents_pending').length;
  const approvedApps = applications.filter(a => a.status === 'approved' || a.status === 'active').length;
  const activeLoansCount = loanAccounts.filter(l => l.status === 'active').length;
  const totalOutstanding = loanAccounts.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending_verification');
  const verifiedPaymentsCount = payments.filter(p => p.status === 'verified').length;
  const verifiedPaymentsSum = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  const pendingDocsCount = applications.reduce((sum, app) => {
    return sum + (app.documents ? app.documents.filter(d => d.status === 'pending').length : 0);
  }, 0);

  const kpis = [
    { id: 'customers', label: 'Total Customers', value: customers.length || 2, change: '+12% this mo', icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'applications', label: 'Total Applications', value: totalApps, change: '+24% this mo', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'applications_review', label: 'Under Review', value: underReview, change: 'Action Required', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'applications_approved', label: 'Approved Applications', value: approvedApps, change: 'High Approval', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'loans', label: 'Active Loans', value: activeLoansCount, change: 'Generating Yield', icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'loans_out', label: 'Total Outstanding', value: formatINR(totalOutstanding || 288421), change: 'Portfolio Value', icon: Coins, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'payments', label: 'Pending UPI Verifications', value: pendingPayments.length, change: 'Verify UTR', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'documents', label: 'Pending Documents', value: pendingDocsCount, change: 'KYC Checks', icon: FileCheck2, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'support', label: 'Open Support Tickets', value: openTicketsCount, change: 'Customer Desk', icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'receipts', label: 'Collected This Month', value: formatINR(verifiedPaymentsSum || 14191), change: 'Via Official UPI', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Welcome */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> RBI NBFC Compliant Platform
          </div>
          <h1 className="text-2xl font-black tracking-tight">{settings.companyName} Executive Control Center</h1>
          <p className="text-slate-400 text-xs mt-1">Real-time overview of customer loan applications, credit underwriting, UPI payment verifications & portfolio yield.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => onNavigate('applications')}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Review Applications
          </button>
          <button 
            onClick={() => onNavigate('payments')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" /> Verify UPI ({pendingPayments.length})
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.id}
              onClick={() => {
                if (kpi.id.startsWith('applications')) onNavigate('applications');
                else if (kpi.id === 'customers') onNavigate('customers');
                else if (kpi.id.startsWith('loans')) onNavigate('loans');
                else if (kpi.id === 'payments') onNavigate('payments');
                else if (kpi.id === 'documents') onNavigate('documents');
                else if (kpi.id === 'support') onNavigate('support');
                else if (kpi.id === 'receipts') onNavigate('receipts');
              }}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</div>
              <div className="text-[11px] font-bold text-slate-500 truncate">{kpi.label}</div>
              <div className="text-[10px] font-semibold text-emerald-600 mt-1">{kpi.change}</div>
            </button>
          );
        })}
      </div>

      {/* Analytics Charts & Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Application Monthly Trend Visualizer */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Application & Disbursement Velocity</h3>
              <p className="text-xs text-slate-500">Monthly breakdown of submitted vs approved loans</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Active Growth +28%
            </span>
          </div>

          {/* Styled Custom SVG / Bar Chart Representation */}
          <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 px-4 bg-slate-50 rounded-2xl border border-slate-100">
            {[
              { month: 'Sep', submitted: 42, approved: 30, val: '₹45L' },
              { month: 'Oct', submitted: 58, approved: 44, val: '₹62L' },
              { month: 'Nov', submitted: 75, approved: 52, val: '₹80L' },
              { month: 'Dec', submitted: 90, approved: 68, val: '₹1.1Cr' },
              { month: 'Jan', submitted: 110, approved: 85, val: '₹1.4Cr' },
              { month: 'Feb', submitted: 135, approved: 102, val: '₹1.8Cr' },
            ].map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.val}
                </div>
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div 
                    style={{ height: `${(bar.submitted / 140) * 100}%` }} 
                    className="w-1/2 bg-slate-300 rounded-t-md group-hover:bg-slate-400 transition-all"
                    title={`Submitted: ${bar.submitted}`}
                  />
                  <div 
                    style={{ height: `${(bar.approved / 140) * 100}%` }} 
                    className="w-1/2 bg-emerald-600 rounded-t-md group-hover:bg-emerald-500 transition-all"
                    title={`Approved: ${bar.approved}`}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-600">{bar.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-300 rounded-xs"></span> Submitted Applications</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-600 rounded-xs"></span> Approved & Disbursed</span>
          </div>
        </div>

        {/* Portfolio Overdue Aging Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Portfolio Overdue Risk Aging</h3>
            <p className="text-xs text-slate-500">Categorization of repayments by delay duration</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Current / Regular (0 Days)', pct: 88, amount: '₹2,53,810', color: 'bg-emerald-500' },
              { label: 'Mild Delay (1–7 Days)', pct: 8, amount: '₹23,050', color: 'bg-amber-500' },
              { label: 'Moderate Overdue (8–30 Days)', pct: 3, amount: '₹8,640', color: 'bg-orange-500' },
              { label: 'High Risk (30+ Days)', pct: 1, amount: '₹2,921', color: 'bg-rose-500' },
            ].map((bucket) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{bucket.label}</span>
                  <span className="text-slate-900 font-mono">{bucket.amount} ({bucket.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${bucket.color}`} style={{ width: `${bucket.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Early Warning Mechanism
            </div>
            <p className="text-[11px] leading-relaxed">Automated SMS and WhatsApp payment reminders trigger 3 days prior to due date.</p>
          </div>
        </div>
      </div>

      {/* Pending Actions & Recent Applications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Recent Loan Applications</h3>
            <button
              onClick={() => onNavigate('applications')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-100 uppercase">
                <tr>
                  <th className="py-2.5 px-4">App ID</th>
                  <th className="py-2.5 px-4">Applicant</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{app.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{app.personalInfo?.fullName || 'Applicant'}</td>
                    <td className="py-3 px-4 text-slate-600">{app.productTitle}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatINR(app.requestedAmount)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectApplication(app)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending UPI Payment Submissions Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">UPI Verification Queue</h3>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
              {pendingPayments.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All submitted UPI payments have been verified!
              </div>
            ) : (
              pendingPayments.map((p) => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{p.customerName}</div>
                      <div className="text-[10px] font-mono text-slate-500">UTR: {p.utrNumber}</div>
                    </div>
                    <div className="font-extrabold text-xs text-slate-900">{formatINR(p.amount)}</div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">{formatDate(p.submittedAt)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onVerifyPayment(p.id, 'approve')}
                        className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-[10px] rounded-md cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onVerifyPayment(p.id, 'reject')}
                        className="px-2 py-1 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold text-[10px] rounded-md cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


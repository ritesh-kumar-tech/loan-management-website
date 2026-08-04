import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck2,
  FileText,
  LifeBuoy,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LoanApplication, LoanAccount, PaymentSubmission, SupportTicket, CompanySettings } from '../../../types';
import { formatINR, formatDate } from '../../../utils/calculator';
import { StatusBadge } from '../../shared/StatusBadge';

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

const palette = ['#0B5ED7', '#059669', '#0891B2', '#6366F1', '#F59E0B', '#EF4444'];

const toMonthKey = (date: string) => new Date(date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

export const DashboardView: React.FC<DashboardViewProps> = ({
  applications,
  loanAccounts,
  payments,
  customers,
  tickets,
  onNavigate,
  onSelectApplication,
}) => {
  const [trendRange, setTrendRange] = useState('last_6_months');
  const [collectionRange, setCollectionRange] = useState('monthly');

  const activeLoans = loanAccounts.filter((loan) => loan.status === 'active');
  const pendingPayments = payments.filter((payment) => payment.status === 'pending_verification');
  const verifiedPayments = payments.filter((payment) => payment.status === 'verified');
  const pendingDocuments = applications.reduce((sum, app) => sum + (app.documents?.filter((doc) => doc.status === 'pending' || doc.status === 'reupload_required').length || 0), 0);
  const overdueInstallments = activeLoans.flatMap((loan) => loan.schedule.filter((inst) => inst.status === 'overdue'));
  const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + Math.max(0, inst.emiAmount - inst.paidAmount), 0);
  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0);
  const totalCollection = verifiedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const approvedApps = applications.filter((app) => app.status === 'approved' || app.status === 'active' || app.status === 'loan_disbursed');
  const newApplications = applications.filter((app) => app.status === 'submitted');
  const underReview = applications.filter((app) => app.status === 'under_review' || app.status === 'documents_pending' || app.status === 'documents_under_verification');
  const openTickets = tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress');

  const averageApprovalTime = useMemo(() => {
    const durations = approvedApps
      .filter((app) => app.approvalDate)
      .map((app) => Math.max(0, new Date(app.approvalDate || app.updatedAt).getTime() - new Date(app.createdAt).getTime()));
    if (!durations.length) return 'N/A';
    const days = durations.reduce((sum, value) => sum + value, 0) / durations.length / 86400000;
    return `${days.toFixed(1)} days`;
  }, [approvedApps]);

  const applicationTrend = useMemo(() => {
    const grouped = new Map<string, { period: string; submitted: number; approved: number; rejected: number; approvalRate: number }>();
    applications.forEach((app) => {
      const period = trendRange === 'this_year' || trendRange === 'last_6_months' ? toMonthKey(app.createdAt) : formatDate(app.createdAt);
      const row = grouped.get(period) || { period, submitted: 0, approved: 0, rejected: 0, approvalRate: 0 };
      if (app.status !== 'draft') row.submitted += 1;
      if (app.status === 'approved' || app.status === 'active' || app.status === 'loan_disbursed') row.approved += 1;
      if (app.status === 'rejected') row.rejected += 1;
      grouped.set(period, row);
    });
    return Array.from(grouped.values()).map((row) => ({
      ...row,
      approvalRate: row.submitted ? Math.round((row.approved / row.submitted) * 100) : 0,
    })).slice(-8);
  }, [applications, trendRange]);

  const loanPortfolio = useMemo(() => {
    const grouped = new Map<string, number>();
    activeLoans.forEach((loan) => {
      const label = loan.loanType.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      grouped.set(label, (grouped.get(label) || 0) + loan.outstandingPrincipal);
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [activeLoans]);

  const collectionTrend = useMemo(() => {
    const due = activeLoans.reduce((sum, loan) => sum + loan.schedule.slice(0, 6).reduce((s, inst) => s + inst.emiAmount, 0), 0);
    const collected = verifiedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const processingFees = verifiedPayments.filter((payment) => payment.purpose === 'processing_fee').reduce((sum, payment) => sum + payment.amount, 0);
    return [{ period: collectionRange, due, collected, processingFees, overdue: overdueAmount }];
  }, [activeLoans, verifiedPayments, overdueAmount, collectionRange]);

  const collectionEfficiency = collectionTrend[0]?.due ? Math.round((collectionTrend[0].collected / collectionTrend[0].due) * 100) : 0;

  const overdueDistribution = [
    { label: 'Current', count: activeLoans.length - overdueInstallments.length, amount: Math.max(0, totalOutstanding - overdueAmount), pct: totalOutstanding ? Math.round(((totalOutstanding - overdueAmount) / totalOutstanding) * 100) : 0, color: '#10B981' },
    { label: 'Early Delay', count: overdueInstallments.length ? 1 : 0, amount: overdueAmount, pct: totalOutstanding ? Math.round((overdueAmount / totalOutstanding) * 100) : 0, color: '#F59E0B' },
    { label: 'Moderate', count: 0, amount: 0, pct: 0, color: '#F97316' },
    { label: 'High Risk', count: 0, amount: 0, pct: 0, color: '#EF4444' },
  ];

  const funnel = [
    { stage: 'Submitted', count: applications.filter((app) => app.status !== 'draft').length },
    { stage: 'Under Review', count: applications.filter((app) => app.status === 'under_review' || app.status === 'documents_pending').length },
    { stage: 'Docs Verified', count: applications.filter((app) => app.documents?.length && app.documents.every((doc) => doc.status === 'verified')).length },
    { stage: 'Approved', count: approvedApps.length },
    { stage: 'Disbursed', count: activeLoans.length },
  ];
  const maxFunnel = Math.max(...funnel.map((item) => item.count), 1);

  const topProduct = loanPortfolio.slice().sort((a, b) => b.value - a.value)[0]?.name || 'N/A';
  const avgLoanSize = activeLoans.length ? totalOutstanding / activeLoans.length : 0;

  const kpis = [
    { label: 'New Applications', value: newApplications.length, note: 'Submitted applications', icon: FileText, target: 'applications', tone: 'blue' },
    { label: 'Under Review', value: underReview.length, note: `${pendingDocuments} documents pending`, icon: Clock, target: 'applications', tone: 'amber' },
    { label: 'Approved Loans', value: approvedApps.length, note: applications.length ? `${Math.round((approvedApps.length / applications.length) * 100)}% approval rate` : 'No applications yet', icon: CheckCircle2, target: 'applications', tone: 'emerald' },
    { label: 'Active Loans', value: activeLoans.length, note: formatINR(totalOutstanding), icon: Building2, target: 'loans', tone: 'teal' },
    { label: 'Payments Pending', value: pendingPayments.length, note: `${overdueInstallments.length} overdue items`, icon: CreditCard, target: 'payments', tone: 'rose' },
    { label: 'Total Collection', value: formatINR(totalCollection), note: 'Verified payments only', icon: Wallet, target: 'payments', tone: 'green' },
  ];

  const toneClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    teal: 'bg-teal-50 text-teal-700',
    rose: 'bg-rose-50 text-rose-700',
    green: 'bg-green-50 text-green-700',
  };

  const pendingActions = [
    { label: 'Applications awaiting review', count: newApplications.length + underReview.length, icon: FileText, target: 'applications' },
    { label: 'Documents awaiting verification', count: pendingDocuments, icon: FileCheck2, target: 'documents' },
    { label: 'Payments awaiting verification', count: pendingPayments.length, icon: CreditCard, target: 'payments' },
    { label: 'Overdue follow-ups', count: overdueInstallments.length, icon: AlertTriangle, target: 'loans' },
    { label: 'Open support tickets', count: openTickets.length, icon: LifeBuoy, target: 'support' },
  ].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button key={kpi.label} onClick={() => onNavigate(kpi.target)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all text-left">
              <div className={`w-10 h-10 rounded-xl grid place-items-center ${toneClasses[kpi.tone]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="mt-4 text-2xl font-black text-slate-950">{kpi.value}</div>
              <div className="text-xs font-extrabold text-slate-700 mt-1">{kpi.label}</div>
              <div className="text-[11px] text-slate-500 mt-1">{kpi.note}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
        {[
          ['Total Customers', customers.length],
          ['Total Outstanding', formatINR(totalOutstanding)],
          ['Overdue Amount', formatINR(overdueAmount)],
          ['Documents Pending', pendingDocuments],
          ['Avg Approval Time', averageApprovalTime],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-slate-100 last:border-r-0 pr-3">
            <div className="text-slate-500 font-bold">{label}</div>
            <div className="text-slate-950 font-black text-lg mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-black text-slate-950">Application and Approval Trend</h3>
              <p className="text-xs text-slate-500">Submitted, approved, rejected, and approval rate.</p>
            </div>
            <select value={trendRange} onChange={(e) => setTrendRange(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold bg-white">
              <option value="last_7_days">Last 7 days</option>
              <option value="last_30_days">Last 30 days</option>
              <option value="last_6_months">Last 6 months</option>
              <option value="this_year">Current year</option>
            </select>
          </div>
          <div className="h-72" role="img" aria-label="Application and approval trend chart">
            {applicationTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applicationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submitted" fill="#0B5ED7" name="Submitted" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="approved" fill="#10B981" name="Approved" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="rejected" fill="#EF4444" name="Rejected" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="approvalRate" stroke="#F59E0B" strokeWidth={2} name="Approval rate %" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState label="No application data for this period." />}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-950">Loan Portfolio by Product</h3>
          <p className="text-xs text-slate-500 mb-4">Active outstanding value by product.</p>
          <div className="h-52" role="img" aria-label="Loan portfolio by product chart">
            {loanPortfolio.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={loanPortfolio} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3} onClick={() => onNavigate('loans')}>
                    {loanPortfolio.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState label="No active loan portfolio yet." />}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Metric label="Active value" value={formatINR(totalOutstanding)} />
            <Metric label="Active loans" value={activeLoans.length} />
            <Metric label="Avg loan size" value={formatINR(avgLoanSize)} />
            <Metric label="Top product" value={topProduct} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-black text-slate-950">Collections vs Due Amount</h3>
              <p className="text-xs text-slate-500">Verified collections only. Efficiency: <strong className="text-emerald-700">{collectionEfficiency}%</strong></p>
            </div>
            <select value={collectionRange} onChange={(e) => setCollectionRange(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold bg-white">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div className="h-64" role="img" aria-label="Collections versus due amount chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatINR(value)} />
                <Legend />
                <Bar dataKey="due" fill="#CBD5E1" name="Total EMI due" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collected" fill="#10B981" name="EMI collected" radius={[6, 6, 0, 0]} />
                <Bar dataKey="processingFees" fill="#0B5ED7" name="Processing fees" radius={[6, 6, 0, 0]} />
                <Bar dataKey="overdue" fill="#EF4444" name="Overdue" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-950">Overdue Risk Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Portfolio risk by repayment delay.</p>
          <div className="space-y-4">
            {overdueDistribution.map((bucket) => (
              <button key={bucket.label} onClick={() => onNavigate('loans')} className="w-full text-left">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{bucket.label}</span>
                  <span>{bucket.count} loans | {formatINR(bucket.amount)}</span>
                </div>
                <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${bucket.pct}%`, backgroundColor: bucket.color }} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-950">Application Status Funnel</h3>
          <p className="text-xs text-slate-500 mb-5">Conversion from submitted applications to active loans.</p>
          <div className="space-y-3">
            {funnel.map((item, index) => {
              const previous = funnel[index - 1]?.count || item.count;
              const conversion = previous ? Math.round((item.count / previous) * 100) : 0;
              return (
                <div key={item.stage} className="grid grid-cols-12 gap-3 items-center text-xs">
                  <div className="col-span-3 font-bold text-slate-700">{item.stage}</div>
                  <div className="col-span-7 h-8 rounded-xl bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-700 rounded-xl" style={{ width: `${(item.count / maxFunnel) * 100}%` }} />
                  </div>
                  <div className="col-span-2 text-right font-black text-slate-950">{item.count} <span className="text-slate-400 font-bold">({conversion}%)</span></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-950">Pending Actions</h3>
          <p className="text-xs text-slate-500 mb-4">Items requiring admin attention.</p>
          <div className="space-y-2">
            {pendingActions.map((action) => {
              const Icon = action.icon;
              return (
                <div key={action.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-blue-700" />
                    <div>
                      <div className="text-sm font-black text-slate-950">{action.count}</div>
                      <div className="text-[11px] text-slate-500">{action.label}</div>
                    </div>
                  </div>
                  <button onClick={() => onNavigate(action.target)} className="text-xs font-bold text-blue-700">View</button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Recent Applications</h3>
            <button onClick={() => onNavigate('applications')} className="text-xs font-bold text-blue-700 flex items-center gap-1">View All Applications <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
                <tr>
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Loan Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold">{app.id}</td>
                    <td className="py-3 px-4 font-bold">{app.personalInfo?.fullName || 'Applicant'}</td>
                    <td className="py-3 px-4">{app.productTitle}</td>
                    <td className="py-3 px-4 font-bold">{formatINR(app.requestedAmount)}</td>
                    <td className="py-3 px-4">{formatDate(app.createdAt)}</td>
                    <td className="py-3 px-4"><StatusBadge status={app.status} /></td>
                    <td className="py-3 px-4 text-right"><button onClick={() => onSelectApplication(app)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold">Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Payment Verification Queue</h3>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">{pendingPayments.length} Pending</span>
          </div>
          {pendingPayments.slice(0, 5).length ? pendingPayments.slice(0, 5).map((payment) => (
            <div key={payment.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-950">{payment.customerName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{payment.applicationId}</div>
                </div>
                <div className="font-black">{formatINR(payment.amount)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <span>UPI / UTR</span>
                <span>{formatDate(payment.submittedAt)}</span>
              </div>
              <button onClick={() => onNavigate('payments')} className="w-full rounded-xl bg-blue-700 text-white font-bold text-xs py-2">Review Payment</button>
            </div>
          )) : <EmptyState label="No payment proofs awaiting review." />}
        </section>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
    <div className="text-[10px] uppercase text-slate-500 font-bold">{label}</div>
    <div className="text-sm font-black text-slate-950 mt-1 truncate">{value}</div>
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="h-full min-h-32 grid place-items-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs font-bold text-slate-400">
    {label}
  </div>
);

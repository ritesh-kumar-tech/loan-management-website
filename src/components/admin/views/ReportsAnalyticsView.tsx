import React from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { formatINR } from '../../../utils/calculator';
import { getDateRangeBounds, isWithinRange, DATE_RANGE_LABELS } from '../../../utils/dateRange';

interface ReportsAnalyticsViewProps {
  applications: any[];
  loanAccounts: any[];
  payments: any[];
  dateRange: string;
  customRangeStart?: string;
  customRangeEnd?: string;
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({
  applications,
  loanAccounts,
  payments,
  dateRange,
  customRangeStart,
  customRangeEnd,
}) => {
  const bounds = getDateRangeBounds(dateRange, customRangeStart, customRangeEnd);
  const rangeLabel = DATE_RANGE_LABELS[dateRange] || 'All Time';

  // "Disbursed" and "collected" are flow metrics scoped to the selected
  // period. Outstanding balance and overdue are point-in-time balances as of
  // now, so they are not re-filtered by the period - only the loans/payments
  // that occurred within it are.
  const loansInRange = loanAccounts.filter((l) => isWithinRange(l.createdAt, bounds));
  const paymentsInRange = payments.filter((p) => isWithinRange(p.paymentDate || p.submittedAt, bounds));
  const verifiedPaymentsInRange = paymentsInRange.filter((p) => p.status === 'verified');
  const applicationsInRange = applications.filter((a) => isWithinRange(a.createdAt, bounds));

  const totalDisbursed = loansInRange.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalOutstanding = loanAccounts.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
  const totalRecovered = verifiedPaymentsInRange.reduce((sum, p) => sum + (p.amount || 0), 0);

  const activeLoans = loanAccounts.filter((l) => l.status === 'active');
  const overdueInstallments = activeLoans.flatMap((l) => (l.schedule || []).filter((inst: any) => inst.status === 'overdue'));
  const overdueAmount = overdueInstallments.reduce((sum: number, inst: any) => sum + Math.max(0, inst.emiAmount - inst.paidAmount), 0);
  const overdueRatio = totalOutstanding ? Math.round((overdueAmount / totalOutstanding) * 1000) / 10 : 0;

  const approvedInRange = applicationsInRange.filter((a) => a.status === 'approved' || a.status === 'active' || a.status === 'loan_disbursed');
  const rejectedInRange = applicationsInRange.filter((a) => a.status === 'rejected');
  const approvalRate = applicationsInRange.length ? Math.round((approvedInRange.length / applicationsInRange.length) * 100) : 0;

  // Real month-by-month disbursement vs recovery, derived from the actual
  // records in range - not the illustrative fixed numbers this used to show.
  const monthKey = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  const monthlyMap = new Map<string, { month: string; disb: number; rec: number }>();
  loansInRange.forEach((l) => {
    const key = monthKey(l.createdAt);
    const row = monthlyMap.get(key) || { month: key, disb: 0, rec: 0 };
    row.disb += l.principalAmount || 0;
    monthlyMap.set(key, row);
  });
  verifiedPaymentsInRange.forEach((p) => {
    const key = monthKey(p.paymentDate || p.submittedAt);
    const row = monthlyMap.get(key) || { month: key, disb: 0, rec: 0 };
    row.rec += p.amount || 0;
    monthlyMap.set(key, row);
  });
  const monthlySeries = Array.from(monthlyMap.values()).slice(-8);
  const maxMonthly = Math.max(...monthlySeries.map((m) => Math.max(m.disb, m.rec)), 1);

  // Real loan-type breakdown by outstanding value, replacing what used to be
  // a hardcoded, fabricated credit-grade distribution unconnected to any
  // actual score the app tracks.
  const byLoanType = new Map<string, { count: number; amount: number }>();
  activeLoans.forEach((l) => {
    const label = String(l.loanType || 'other').replaceAll('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const row = byLoanType.get(label) || { count: 0, amount: 0 };
    row.count += 1;
    row.amount += l.outstandingPrincipal || 0;
    byLoanType.set(label, row);
  });
  const loanTypeBreakdown = Array.from(byLoanType.entries())
    .map(([label, row]) => ({ label, ...row, pct: totalOutstanding ? Math.round((row.amount / totalOutstanding) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);

  const handleDownloadReport = (reportName: string) => {
    const rows = [
      `Report,${reportName}`,
      `Date Range,${rangeLabel}`,
      `Generated Date,${new Date().toISOString()}`,
      `Total Portfolio Disbursed (in range),${totalDisbursed}`,
      `Active Portfolio Outstanding (current),${totalOutstanding}`,
      `Total EMI Collections (in range),${totalRecovered}`,
      `Overdue Amount (current),${overdueAmount}`,
      `Overdue Ratio (current),${overdueRatio}%`,
    ];
    const csvContent = rows.join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" /> Executive Portfolio Analytics & RBI Regulatory Reporting
          </div>
          <h2 className="text-2xl font-black tracking-tight">Portfolio Financial Health & Yield Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time interest yield, collection performance, delinquency rates & regulatory compliance return export.</p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reporting Period</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs inline-block mt-1">
            {rangeLabel}
          </span>
        </div>
      </div>

      {/* Top Financial KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Portfolio Disbursed ({rangeLabel})</span>
          <div className="text-xl font-extrabold text-slate-900">{formatINR(totalDisbursed)}</div>
          <span className="text-[10px] font-semibold text-slate-400">{loansInRange.length} loan(s) opened in period</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Active Portfolio Outstanding</span>
          <div className="text-xl font-extrabold text-purple-700">{formatINR(totalOutstanding)}</div>
          <span className="text-[10px] font-semibold text-purple-600">Principal AUM (current)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">EMI Collections ({rangeLabel})</span>
          <div className="text-xl font-extrabold text-emerald-700">{formatINR(totalRecovered)}</div>
          <span className="text-[10px] font-semibold text-emerald-600">Verified UTR receipts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Overdue Ratio</span>
          <div className="text-xl font-extrabold text-slate-900">{overdueRatio}%</div>
          <span className="text-[10px] font-semibold text-slate-400">{formatINR(overdueAmount)} across {overdueInstallments.length} installment(s)</span>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections vs Disbursements Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Disbursement vs EMI Recovery Volume</h3>
              <p className="text-xs text-slate-500">Monthly capital deployment compared against verified borrower repayments, {rangeLabel.toLowerCase()}</p>
            </div>
          </div>

          {monthlySeries.length ? (
            <>
              <div className="h-52 bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-end justify-between gap-3">
                {monthlySeries.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-36">
                      <div style={{ height: `${(m.disb / maxMonthly) * 100}%` }} className="w-1/2 bg-indigo-600 rounded-t-md" title={`Disbursed: ${formatINR(m.disb)}`} />
                      <div style={{ height: `${(m.rec / maxMonthly) * 100}%` }} className="w-1/2 bg-emerald-500 rounded-t-md" title={`Recovered: ${formatINR(m.rec)}`} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6 text-xs text-slate-600">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-indigo-600 rounded-xs"></span> Capital Disbursed</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-xs"></span> EMI Recovered</span>
              </div>
            </>
          ) : (
            <div className="h-52 grid place-items-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs font-bold text-slate-400">
              No disbursements or verified collections in this period.
            </div>
          )}
        </div>

        {/* Loan Portfolio by Product */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Active Portfolio by Loan Type</h3>
            <p className="text-xs text-slate-500">Outstanding principal share by product, current book</p>
          </div>

          {loanTypeBreakdown.length ? (
            <div className="space-y-3">
              {loanTypeBreakdown.map((g) => (
                <div key={g.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{g.label} ({g.count} loan{g.count === 1 ? '' : 's'})</span>
                    <span className="text-slate-900">{g.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 grid place-items-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs font-bold text-slate-400">
              No active loans yet.
            </div>
          )}
        </div>
      </div>

      {/* Applications Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-extrabold text-slate-900 mb-3">Application Funnel ({rangeLabel})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Applications Received</span>
            <strong className="text-slate-900 text-lg">{applicationsInRange.length}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Approved</span>
            <strong className="text-emerald-700 text-lg">{approvedInRange.length}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Rejected</span>
            <strong className="text-rose-700 text-lg">{rejectedInRange.length}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Approval Rate</span>
            <strong className="text-slate-900 text-lg">{approvalRate}%</strong>
          </div>
        </div>
      </div>

      {/* Regulatory Downloadable Reports */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Regulatory Reports & Statements
        </h3>
        <p className="text-xs text-slate-500">Download CSV summaries scoped to the {rangeLabel.toLowerCase()} reporting period selected above.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => handleDownloadReport('Monthly EMI Collection Report')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left space-y-1 transition-colors cursor-pointer group"
          >
            <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
              <span>Monthly EMI Collection Report</span>
              <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-500">Includes all verified UTR numbers, dates & payment modes</div>
          </button>

          <button
            onClick={() => handleDownloadReport('Loan Portfolio Asset Health Return')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left space-y-1 transition-colors cursor-pointer group"
          >
            <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
              <span>Loan Portfolio Asset Health Return</span>
              <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-500">Outstanding, overdue and portfolio-by-type breakdown</div>
          </button>

          <button
            onClick={() => handleDownloadReport('RBI Fair Practices Compliance Log')}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left space-y-1 transition-colors cursor-pointer group"
          >
            <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
              <span>RBI Fair Practices Compliance Log</span>
              <Download className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[10px] text-slate-500">Grievance redressal logs and key interest disclosure rates</div>
          </button>
        </div>
      </div>
    </div>
  );
};

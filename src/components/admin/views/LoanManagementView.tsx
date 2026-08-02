import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Coins, 
  Calendar, 
  Eye, 
  Printer, 
  X, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Download
} from 'lucide-react';
import { LoanAccount } from '../../../types';
import { formatINR, formatDate } from '../../../utils/calculator';
import { generateRepaymentSchedulePDF } from '../../../utils/pdfGenerator';

interface LoanManagementViewProps {
  loanAccounts: LoanAccount[];
  settings: any;
  onAdjustLoan: (accNo: string, payload: any) => Promise<void>;
}

export const LoanManagementView: React.FC<LoanManagementViewProps> = ({
  loanAccounts,
  settings,
  onAdjustLoan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLoan, setSelectedLoan] = useState<LoanAccount | null>(null);

  // Manual Offline Payment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Offline Cheque / Bank Transfer');
  const [adjustInstallmentNo, setAdjustInstallmentNo] = useState<number>(1);

  const filteredLoans = loanAccounts.filter((l) => {
    const matchesSearch = 
      l.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.applicationId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRecordOfflinePayment = async () => {
    if (!selectedLoan || adjustAmount <= 0) return;
    await onAdjustLoan(selectedLoan.accountNumber, {
      type: 'offline_payment',
      amount: adjustAmount,
      reason: adjustReason,
      installmentNumber: adjustInstallmentNo,
    });
    setShowAdjustModal(false);
    setSelectedLoan(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" /> Active Loan Portfolio & Repayment Schedules
          </h2>
          <p className="text-xs text-slate-500">Track active loan accounts, monthly EMI collection progress, offline payments & repayment schedules.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Coins className="w-4 h-4 text-emerald-600" /> Total Outstanding: {formatINR(loanAccounts.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Loan Account Number (LA-2026-...), Borrower Name, or App ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">All Loan Statuses</option>
            <option value="active">Active Loans</option>
            <option value="closed">Closed / Paid Loans</option>
            <option value="defaulted">Defaulted / Overdue</option>
          </select>
        </div>
      </div>

      {/* Loan Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Account Number</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Loan Type</th>
                <th className="py-3 px-4">Principal</th>
                <th className="py-3 px-4">Rate & Tenure</th>
                <th className="py-3 px-4">Monthly EMI</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                    No active loan accounts match your search.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.accountNumber} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{loan.accountNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{loan.customerName}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 capitalize">{loan.loanType}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatINR(loan.principalAmount)}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{loan.interestRate}% • {loan.tenureMonths}m</td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-700">{formatINR(loan.monthlyEmi)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatINR(loan.outstandingPrincipal)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        loan.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLoan(loan)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Schedule & Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repayment Schedule & Account Detail Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-150 my-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-100">
                  {selectedLoan.accountNumber}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedLoan.customerName}</h3>
                <p className="text-xs text-slate-500">Principal: {formatINR(selectedLoan.principalAmount)} @ {selectedLoan.interestRate}% p.a. • Monthly EMI: {formatINR(selectedLoan.monthlyEmi)}</p>
              </div>

              <button
                onClick={() => setSelectedLoan(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & PDF Downloads */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAdjustAmount(selectedLoan.monthlyEmi);
                    setShowAdjustModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Record Offline Payment
                </button>
              </div>

              <button
                onClick={() => generateRepaymentSchedulePDF({
                  id: selectedLoan.applicationId,
                  productTitle: selectedLoan.loanType + ' Loan',
                  approvedAmount: selectedLoan.principalAmount,
                  approvedRate: selectedLoan.interestRate,
                  approvedTenureMonths: selectedLoan.tenureMonths,
                  personalInfo: { fullName: selectedLoan.customerName },
                } as any, settings)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-emerald-600" /> Export Schedule PDF
              </button>
            </div>

            {/* Installment Repayment Schedule Table */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 text-sm">Monthly Installment Amortization Schedule</h4>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold sticky top-0 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">EMI Amount</th>
                      <th className="py-2.5 px-3">Principal</th>
                      <th className="py-2.5 px-3">Interest</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3">UTR / Ref</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedLoan.schedule?.map((inst) => (
                      <tr key={inst.installmentNumber} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inst.installmentNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(inst.dueDate)}</td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">{formatINR(inst.emiAmount)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatINR(inst.principalComponent)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatINR(inst.interestComponent)}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">{formatINR(inst.paidAmount || 0)}</td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{inst.utrRef || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            inst.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                            inst.status === 'due' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {inst.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Offline Payment Modal */}
      {showAdjustModal && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Record Offline Payment Entry</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Installment Number</label>
                <input
                  type="number"
                  value={adjustInstallmentNo}
                  onChange={(e) => setAdjustInstallmentNo(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method / Note</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Bank Demand Draft #99201"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecordOfflinePayment}
                  className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 cursor-pointer shadow-xs"
                >
                  Confirm & Credit Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




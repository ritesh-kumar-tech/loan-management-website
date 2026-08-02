import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Check, 
  X, 
  FileText, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { PaymentSubmission } from '../../../types';
import { formatINR, formatDate } from '../../../utils/calculator';

interface PaymentVerificationViewProps {
  payments: PaymentSubmission[];
  onVerifyPayment: (paymentId: string, action: 'approve' | 'reject', note?: string) => Promise<void>;
}

export const PaymentVerificationView: React.FC<PaymentVerificationViewProps> = ({
  payments,
  onVerifyPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending_verification');
  const [selectedPayment, setSelectedPayment] = useState<PaymentSubmission | null>(null);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = 
      p.utrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.applicationId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedPayment) return;
    await onVerifyPayment(selectedPayment.id, action);
    setSelectedPayment(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-rose-600" /> Official UPI Payment & UTR Verification Desk
          </h2>
          <p className="text-xs text-slate-500">Verify customer UPI transaction reference numbers (UTR/RRN), approve EMI receipts & credit borrower ledger.</p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          {['pending_verification', 'verified', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl uppercase transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by 12-digit UPI UTR Number, Borrower Name, or Loan ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 bg-white"
        />
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">UTR Ref Number</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Loan App ID</th>
                <th className="py-3 px-4">Installment #</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No payment submissions match search filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.utrNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.customerName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{p.applicationId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">Installment #{p.installmentNumber}</td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-700">{formatINR(p.amount)}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(p.submittedAt)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        p.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect UTR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Inspector Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-rose-600">UTR: {selectedPayment.utrNumber}</span>
                <h3 className="text-base font-extrabold text-slate-900">Verify UPI Payment Claim</h3>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">{selectedPayment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loan ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedPayment.applicationId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Claimed:</span>
                <span className="font-extrabold text-emerald-700">{formatINR(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted On:</span>
                <span className="text-slate-800">{formatDate(selectedPayment.submittedAt)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleAction('reject')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold text-xs cursor-pointer"
              >
                Reject Claim
              </button>
              <button
                onClick={() => handleAction('approve')}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Approve & Generate Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



import React, { useState } from 'react';
import { 
  Receipt as ReceiptIcon, 
  Search, 
  Download, 
  Printer, 
  QrCode, 
  ShieldCheck, 
  Eye 
} from 'lucide-react';
import { Receipt } from '../../../types';
import { formatINR, formatDate } from '../../../utils/calculator';
import { generatePaymentReceiptPDF } from '../../../utils/pdfGenerator';

interface ReceiptsManagementViewProps {
  receipts: Receipt[];
  settings: any;
}

export const ReceiptsManagementView: React.FC<ReceiptsManagementViewProps> = ({
  receipts,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReceipts = receipts.filter((r) => {
    return (
      r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.utrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.applicationId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ReceiptIcon className="w-5 h-5 text-emerald-600" /> Official EMI Payment Receipts Repository
          </h2>
          <p className="text-xs text-slate-500">Archived digitally signed payment receipts featuring QR code verification and authorized NBFC seals.</p>
        </div>

        <div className="text-xs font-bold text-slate-700 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200">
          {receipts.length} Official Receipts Issued
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search receipts by Receipt No (RCP-...), Borrower Name, UTR, or App ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
        />
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Receipt Number</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Loan App ID</th>
                <th className="py-3 px-4">Installment #</th>
                <th className="py-3 px-4">UTR Number</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No payment receipts found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rcp) => (
                  <tr key={rcp.receiptNumber} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{rcp.receiptNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{rcp.customerName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{rcp.applicationId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">Installment #{rcp.installmentNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{rcp.utrNumber}</td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-700">{formatINR(rcp.amountPaid)}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(rcp.paymentDate)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => generatePaymentReceiptPDF(rcp, settings)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

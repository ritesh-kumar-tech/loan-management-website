import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Receipt, CompanySettings } from '../../types';
import { formatINR, formatDate } from '../../utils/calculator';
import { FileCheck2, Search, CheckCircle2, AlertCircle, Download, ShieldCheck } from 'lucide-react';
import { generatePaymentReceiptPDF } from '../../utils/pdfGenerator';

interface ReceiptVerifierProps {
  settings: CompanySettings;
}

export const ReceiptVerifier: React.FC<ReceiptVerifierProps> = ({ settings }) => {
  const [receiptNo, setReceiptNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read query parameter if opened via QR link e.g. ?id=RCT-2026-XXXXXX
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('id');
    if (qId) {
      setReceiptNo(qId);
      verifyReceipt(qId);
    }
  }, []);

  const verifyReceipt = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    setReceipt(null);

    try {
      const res = await api.verifyReceiptPublic(idToVerify.trim().toUpperCase());
      if (res.success && res.receipt) {
        setReceipt(res.receipt);
      } else {
        setError(res.error || 'Invalid or non-existent Receipt Number.');
      }
    } catch {
      setError('An error occurred during receipt verification lookup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center max-w-lg mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Online Authenticity Portal
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Verify Payment Receipt</h1>
        <p className="mt-2 text-sm text-slate-600">
          Verify official Dhani Finance payment receipts using the Receipt Number or scanned QR code.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyReceipt(receiptNo);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1">
            <input
              type="text"
              required
              placeholder="Enter Receipt Number (e.g. RCT-2026-880192)"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 text-sm uppercase font-mono tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Verifying...' : <><Search className="w-4 h-4" /> Verify Receipt</>}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
      </div>

      {receipt && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 sm:p-8 shadow-md space-y-6 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated Receipt
          </div>

          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Official Receipt Reference</span>
            <h2 className="text-2xl font-extrabold text-slate-900 font-mono tracking-wider">{receipt.receiptNumber}</h2>
            <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed & Verified by Dhani Finance Automated Lending Desk
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block">Customer Name</span>
              <span className="font-bold text-slate-900">{receipt.customerName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Amount Paid</span>
              <span className="font-bold text-emerald-700 text-base">{formatINR(receipt.amountPaid)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Payment Method</span>
              <span className="font-bold text-slate-900">{receipt.paymentMethod}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">UTR / Bank Ref</span>
              <span className="font-mono text-xs font-bold text-slate-900">{receipt.utrNumber}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Payment Date</span>
              <span className="font-bold text-slate-900">{formatDate(receipt.paymentDate)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Remaining Balance</span>
              <span className="font-bold text-slate-900">{formatINR(receipt.remainingBalance)}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => generatePaymentReceiptPDF(receipt, settings)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Official Receipt PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { api } from '../../services/api';
import { CompanySettings, PaymentSubmission } from '../../types';
import { formatINR } from '../../utils/calculator';
import { QrCode, Copy, Check, Upload, ArrowRight, ShieldCheck, AlertCircle, X, Smartphone, FileCheck } from 'lucide-react';

interface UpiPaymentModalProps {
  settings: CompanySettings;
  loanAccountId: string;
  applicationId: string;
  userId: string;
  customerName: string;
  amountPayable: number;
  purpose?: 'emi' | 'processing_fee';
  installmentNumber?: number;
  onClose: () => void;
  onPaymentSubmitted: (payment: PaymentSubmission) => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  settings,
  loanAccountId,
  applicationId,
  userId,
  customerName,
  amountPayable,
  purpose = 'emi',
  installmentNumber,
  onClose,
  onPaymentSubmitted,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(settings.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amountPayable.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 8) {
      setError('Please enter a valid 12-digit UPI UTR or Bank Transaction Reference number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.submitPaymentProof({
        loanAccountId,
        applicationId,
        userId,
        customerName,
        amount: amountPayable,
        purpose,
        utrNumber: utrNumber.trim().toUpperCase(),
        proofScreenshotUrl: proofUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=600&fit=crop',
        installmentNumber,
      });

      if (res.success && res.payment) {
        onPaymentSubmitted(res.payment);
      } else {
        setError(res.error || 'Failed to submit payment proof.');
      }
    } catch {
      setError('Failed to process payment submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.upiAccountName)}&am=${amountPayable}&cu=INR&tn=${encodeURIComponent(`EMI Payment ${applicationId}`)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center">
              ₹
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Custom UPI Repayment Portal</h3>
              <p className="text-xs text-slate-400">Zero Gateway Charge • Direct Bank Transfer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* Amount Badge */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Payable Amount</span>
              <span className="text-2xl font-extrabold text-slate-900">{formatINR(amountPayable)}</span>
              {installmentNumber && <span className="text-xs text-slate-500 block">EMI Installment #{installmentNumber}</span>}
            </div>
            <button
              onClick={handleCopyAmount}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              {copiedAmount ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAmount ? 'Copied' : 'Copy Amount'}
            </button>
          </div>

          {/* UPI ID & QR Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="text-center sm:text-left space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Official Company UPI VPA</span>
              <div className="bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 flex items-center justify-between gap-2">
                <span className="truncate">{settings.upiId}</span>
                <button
                  onClick={handleCopyUpi}
                  title="Copy UPI VPA"
                  className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Account Holder: <strong className="text-slate-800">{settings.upiAccountName}</strong>
              </p>

              <a
                href={upiDeepLink}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" /> Open in Google Pay / PhonePe
              </a>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center bg-white p-3 rounded-xl border border-slate-200">
              <img
                src={settings.upiQrCodeUrl}
                alt="Company UPI QR"
                className="w-36 h-36 object-contain"
              />
              <span className="text-[10px] text-slate-400 font-medium mt-1">Scan using any UPI App</span>
            </div>
          </div>

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                12-Digit UPI UTR / Bank Reference Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 402910839120"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 text-sm font-mono tracking-wider"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Find this 12-digit numeric reference in your Google Pay, PhonePe, Paytm, or BHIM receipt.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Upload Payment Screenshot (Optional Proof)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-xs text-slate-600 block">Click or Drag & Drop payment screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProofUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                  id="screenshot-file"
                />
                <label htmlFor="screenshot-file" className="mt-2 inline-block px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer">
                  Select Screenshot Image
                </label>
                {proofUrl && <span className="text-xs text-emerald-600 font-bold block mt-1">✓ File Attached</span>}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? 'Submitting Payment Proof...' : <><FileCheck className="w-4 h-4" /> Submit Payment for Verification</>}
            </button>
          </form>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <strong>Note:</strong> All payments are submitted to our accounts desk with status <em>Pending Verification</em>. Upon admin confirmation against bank statements, an official receipt will be generated automatically.
          </div>
        </div>
      </div>
    </div>
  );
};



import React, { useEffect, useMemo, useState } from 'react';
import { calculateEmi, formatINR } from '../../utils/calculator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Calculator, ArrowRight, Download, RotateCcw, Share2, Plus, Minus, Loader2, CheckCircle } from 'lucide-react';
import { generateRepaymentSchedulePDF } from '../../utils/pdfGenerator';
import { CompanySettings, LoanProduct } from '../../types';

interface EmiCalculatorProps {
  settings: CompanySettings;
  products?: LoanProduct[];
  onApplyWithValues?: (amount: number, tenure: number) => void;
}

const configuredMinRate = (product?: LoanProduct) => Math.max(6, product?.minRate ?? product?.minInterestRate ?? 6);

const addMonths = (dateString: string, months: number) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
};

export const EmiCalculator: React.FC<EmiCalculatorProps> = ({ settings, products = [], onApplyWithValues }) => {
  const activeProducts = products.filter((p) => p.isActive);
  const [selectedProductId, setSelectedProductId] = useState(activeProducts[0]?.id || '');
  const selectedProduct = activeProducts.find((p) => p.id === selectedProductId) || activeProducts[0];
  const minRate = configuredMinRate(selectedProduct);
  const maxRate = selectedProduct?.maxRate ?? selectedProduct?.maxInterestRate ?? 24;

  const [loanAmount, setLoanAmount] = useState<number>(selectedProduct?.minAmount || 500000);
  const [interestRate, setInterestRate] = useState<number>(minRate);
  const [tenureMonths, setTenureMonths] = useState<number>(selectedProduct?.minTenureMonths || 36);
  const [processingFeePercent, setProcessingFeePercent] = useState<number>(selectedProduct?.processingFeePercent || 1.5);
  const [firstEmiDate, setFirstEmiDate] = useState<string>(() => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (!selectedProduct) return;
    setLoanAmount((amount) => Math.min(Math.max(amount, selectedProduct.minAmount), selectedProduct.maxAmount));
    setTenureMonths((tenure) => Math.min(Math.max(tenure, selectedProduct.minTenureMonths), selectedProduct.maxTenureMonths));
    setInterestRate((rate) => Math.min(Math.max(rate, configuredMinRate(selectedProduct)), selectedProduct.maxRate ?? selectedProduct.maxInterestRate ?? 24));
    setProcessingFeePercent(selectedProduct.processingFeePercent);
  }, [selectedProductId, selectedProduct]);

  const result = useMemo(() => calculateEmi(loanAmount, interestRate, tenureMonths, processingFeePercent), [loanAmount, interestRate, tenureMonths, processingFeePercent]);

  const pieData = [
    { name: 'Principal Amount', value: loanAmount, color: '#0B5ED7' },
    { name: 'Total Interest Payable', value: result.totalInterest, color: '#1E88FF' },
  ];

  const reset = () => {
    setLoanAmount(selectedProduct?.minAmount || 500000);
    setInterestRate(minRate);
    setTenureMonths(selectedProduct?.minTenureMonths || 36);
    setProcessingFeePercent(selectedProduct?.processingFeePercent || 1.5);
  };

  const downloadSchedule = () => {
    setIsDownloading(true);
    setTimeout(() => {
      try {
        generateRepaymentSchedulePDF({
          accountNumber: 'EMI-PREVIEW',
          applicationId: 'PREVIEW',
          userId: 'preview',
          customerName: 'Prospective Applicant',
          loanType: selectedProduct?.type || 'personal',
          principalAmount: loanAmount,
          interestRate,
          tenureMonths,
          monthlyEmi: result.monthlyEmi,
          startDate: new Date().toISOString(),
          maturityDate: new Date(Date.now() + tenureMonths * 30 * 24 * 3600 * 1000).toISOString(),
          processingFee: result.processingFeeAmount,
          outstandingPrincipal: loanAmount,
          totalPaid: 0,
          totalOverdue: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          schedule: result.schedule.map((row, idx) => ({
            installmentNumber: row.month,
            dueDate: addMonths(firstEmiDate, idx),
            openingPrincipal: row.openingPrincipal,
            emiAmount: row.emi,
            principalComponent: row.principalPayment,
            interestComponent: row.interestPayment,
            charges: 0,
            closingPrincipal: row.closingPrincipal,
            status: idx === 0 ? 'due' : 'upcoming',
            paidAmount: 0,
          })),
        } as any, settings);
        setDownloadSuccess(true);
      } catch (err) {
        console.error('Failed to generate PDF:', err);
      } finally {
        setIsDownloading(false);
      }
    }, 100);
  };

  return (
    <section className="bg-[#F6FAFF] border-b border-blue-100 df-section">
      <div className="df-container">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="df-eyebrow mb-4">
            <Calculator className="w-4 h-4 text-blue-700" /> Interactive Financial Calculator
          </div>
          <h1 className="df-heading">Smart Loan EMI & Repayment Calculator</h1>
          <p className="mt-4 df-copy">Select a product, compare rate ranges, and calculate repayment instantly. Minimum public rate is 6% p.a.</p>
        </div>

        <div className="df-card p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white p-2 sm:p-4 space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-950">Adjust Loan Parameters</h3>
              <button onClick={reset} className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Selected Loan Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-3 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-sm font-semibold"
              >
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>{product.title} ({configuredMinRate(product)}% - {product.maxRate ?? product.maxInterestRate}% p.a.)</option>
                ))}
              </select>
            </div>

            <Slider label="Loan Amount Required" valueLabel={formatINR(loanAmount)} min={selectedProduct?.minAmount || 25000} max={selectedProduct?.maxAmount || 5000000} step={25000} value={loanAmount} onChange={setLoanAmount} presets={[100000, 300000, 500000, 1000000, 2500000].filter((value) => value >= (selectedProduct?.minAmount || 25000) && value <= (selectedProduct?.maxAmount || 5000000))} />
            <Slider label="Annual Interest Rate (% p.a.)" valueLabel={`${interestRate}%`} min={minRate} max={maxRate} step={0.25} value={interestRate} onChange={setInterestRate} helper={`${minRate}% minimum for selected product. Final rate depends on eligibility and lending policy.`} presets={[minRate, Math.min(maxRate, minRate + 2), Math.min(maxRate, minRate + 4)]} />
            <Slider label="Loan Tenure" valueLabel={`${tenureMonths} Months`} min={selectedProduct?.minTenureMonths || 12} max={selectedProduct?.maxTenureMonths || 120} step={6} value={tenureMonths} onChange={setTenureMonths} presets={[12, 24, 36, 60, 120].filter((value) => value >= (selectedProduct?.minTenureMonths || 12) && value <= (selectedProduct?.maxTenureMonths || 120))} />

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">First EMI Date</label>
              <input type="date" value={firstEmiDate} onChange={(e) => setFirstEmiDate(e.target.value)} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900">
              Interest rates start from 6% per annum. The final applicable rate depends on the selected loan product, applicant eligibility, verification, and internal lending policies.
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#071B3D] text-white p-7 sm:p-9 rounded-[28px] shadow-md border border-blue-900 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-sky-300 uppercase tracking-wider mb-1">Estimated Monthly EMI</div>
                  <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold text-blue-100">Estimate only</span>
                </div>
                <div className="text-5xl font-black tracking-tight text-white mb-8 mt-2">{formatINR(result.monthlyEmi)} <span className="text-base font-normal text-blue-200">/ month</span></div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-900/70 text-sm">
                  <Summary label="Principal Amount" value={formatINR(loanAmount)} />
                  <Summary label="Total Interest Cost" value={formatINR(result.totalInterest)} accent />
                  <Summary label="Total Payable Amount" value={formatINR(result.totalPayment)} />
                  <Summary label="Est. Processing Fee" value={formatINR(result.processingFeeAmount)} />
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={downloadSchedule} disabled={isDownloading} className="df-btn bg-white/10 hover:bg-white/15 text-white border border-white/15 disabled:opacity-50">
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {isDownloading ? 'Processing...' : 'Download Schedule'}
                  </button>
                  {onApplyWithValues && (
                    <button onClick={() => onApplyWithValues(loanAmount, tenureMonths)} className="df-btn bg-blue-500 hover:bg-blue-400 text-white">
                      Apply With Values <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Breakdown of Total Amount</h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatINR(Number(value))} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {downloadSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Repayment Schedule Downloaded</h2>
            <p className="text-slate-600 text-sm mb-8">
              Your EMI repayment schedule has been generated and downloaded successfully.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3 mb-8 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Loan Amount</span>
                <strong className="text-slate-900">{formatINR(loanAmount)}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Interest Rate</span>
                <strong className="text-slate-900">{interestRate}% p.a.</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Tenure</span>
                <strong className="text-slate-900">{tenureMonths} Months</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Monthly EMI</span>
                <strong className="text-slate-900">{formatINR(result.monthlyEmi)}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Total Interest</span>
                <strong className="text-amber-700">{formatINR(result.totalInterest)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Payable</span>
                <strong className="text-slate-900">{formatINR(result.totalPayment)}</strong>
              </div>
            </div>

            <div className="space-y-3">
              {onApplyWithValues && (
                <button 
                  onClick={() => {
                    setDownloadSuccess(false);
                    onApplyWithValues(loanAmount, tenureMonths);
                  }} 
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-colors"
                >
                  Continue Application
                </button>
              )}
              <button 
                onClick={() => {
                  setDownloadSuccess(false);
                  downloadSchedule();
                }} 
                className="w-full bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors"
              >
                Download Again
              </button>
              <button 
                onClick={() => setDownloadSuccess(false)} 
                className="w-full text-slate-500 hover:text-slate-700 font-semibold py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const Slider: React.FC<{ label: string; valueLabel: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; helper?: string; presets?: number[] }> = ({ label, valueLabel, min, max, step, value, onChange, helper, presets = [] }) => (
  <div>
    <div className="flex justify-between items-center gap-3 mb-3">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Minus className="w-4 h-4" /></button>
        <span className="text-base font-extrabold text-slate-950 bg-blue-50 px-3 py-2 rounded-lg min-w-[108px] text-center">{valueLabel}</span>
        <button type="button" onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="df-range w-full appearance-none cursor-pointer" />
    <div className="flex justify-between text-xs text-slate-400 mt-1">
      <span>{typeof min === 'number' && min > 1000 ? formatINR(min) : min}</span>
      <span>{typeof max === 'number' && max > 1000 ? formatINR(max) : max}</span>
    </div>
    {helper && <p className="text-[11px] text-slate-500 mt-1">{helper}</p>}
    {presets.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-3">
        {presets.map((preset) => (
          <button key={preset} type="button" onClick={() => onChange(Math.min(max, Math.max(min, preset)))} className="min-h-9 rounded-full bg-white border border-blue-100 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50">
            {preset > 1000 ? formatINR(preset) : preset}
          </button>
        ))}
      </div>
    )}
  </div>
);

const Summary: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div>
    <span className="text-blue-200 text-xs block">{label}</span>
    <span className={`font-semibold text-base ${accent ? 'text-sky-300' : 'text-white'}`}>{value}</span>
  </div>
);


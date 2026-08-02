import React, { useEffect, useMemo, useState } from 'react';
import { calculateEmi, formatINR } from '../../utils/calculator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Calculator, ArrowRight, Download, RotateCcw, Share2, Plus, Minus } from 'lucide-react';
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
  const [showFullSchedule, setShowFullSchedule] = useState(false);

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
  const shownSchedule = showFullSchedule ? result.schedule : result.schedule.slice(0, 12);

  const reset = () => {
    setLoanAmount(selectedProduct?.minAmount || 500000);
    setInterestRate(minRate);
    setTenureMonths(selectedProduct?.minTenureMonths || 36);
    setProcessingFeePercent(selectedProduct?.processingFeePercent || 1.5);
  };

  const downloadSchedule = () => {
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
  };

  const exportCsv = () => {
    const rows = ['Month,Due Date,Opening Principal,EMI,Principal,Interest,Closing Principal'];
    result.schedule.forEach((row) => {
      rows.push([row.month, addMonths(firstEmiDate, row.month - 1).slice(0, 10), row.openingPrincipal, row.emi, row.principalPayment, row.interestPayment, row.closingPrincipal].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'emi-schedule-preview.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const shareCalculation = async () => {
    const text = `${settings.companyName} EMI estimate: ${formatINR(result.monthlyEmi)}/month for ${formatINR(loanAmount)} at ${interestRate}% p.a. for ${tenureMonths} months.`;
    if (navigator.share) await navigator.share({ title: 'EMI estimate', text });
    else await navigator.clipboard?.writeText(text);
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

            <Slider label="Loan Amount Required" valueLabel={formatINR(loanAmount)} min={selectedProduct?.minAmount || 25000} max={selectedProduct?.maxAmount || 5000000} step={25000} value={loanAmount} onChange={setLoanAmount} presets={[100000, 300000, 500000, 1000000]} />
            <Slider label="Annual Interest Rate (% p.a.)" valueLabel={`${interestRate}%`} min={minRate} max={maxRate} step={0.25} value={interestRate} onChange={setInterestRate} helper={`${minRate}% minimum for selected product. Final rate depends on eligibility and lending policy.`} presets={[minRate, Math.min(maxRate, minRate + 2), Math.min(maxRate, minRate + 4)]} />
            <Slider label="Loan Tenure" valueLabel={`${tenureMonths} Months`} min={selectedProduct?.minTenureMonths || 12} max={selectedProduct?.maxTenureMonths || 120} step={6} value={tenureMonths} onChange={setTenureMonths} presets={[12, 24, 36, 60].filter((value) => value >= (selectedProduct?.minTenureMonths || 12) && value <= (selectedProduct?.maxTenureMonths || 120))} />

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
                  <button onClick={downloadSchedule} className="df-btn bg-white/10 hover:bg-white/15 text-white border border-white/15">
                    <Download className="w-4 h-4" /> Download Schedule
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

        <div className="mt-12 bg-white rounded-[24px] border border-blue-100 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-950">First 12 Months Repayment Schedule Preview</h3>
              <p className="text-xs text-slate-500">Monthly breakdown of interest vs principal repayment</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowFullSchedule(!showFullSchedule)} className="min-h-11 px-4 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">{showFullSchedule ? 'Show First 12' : 'View Full Schedule'}</button>
              <button onClick={downloadSchedule} className="min-h-11 px-4 rounded-xl bg-blue-700 text-white font-bold text-sm">Download PDF</button>
              <button onClick={exportCsv} className="min-h-11 px-4 rounded-xl bg-white border border-blue-100 text-blue-700 font-bold text-sm">Export CSV</button>
              <button onClick={shareCalculation} className="min-h-11 px-4 rounded-xl bg-white border border-blue-100 text-blue-700 font-bold text-sm inline-flex items-center gap-2"><Share2 className="w-4 h-4" /> Share</button>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-blue-50 text-blue-950 text-xs font-bold uppercase border-b border-blue-100 sticky top-0">
                <tr>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Opening Principal</th>
                  <th className="py-3 px-4">EMI</th>
                  <th className="py-3 px-4">Principal Repaid</th>
                  <th className="py-3 px-4">Interest Paid</th>
                  <th className="py-3 px-4">Closing Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {shownSchedule.map((row, idx) => (
                  <tr key={row.month} className={`${idx % 2 ? 'bg-blue-50/25' : ''} hover:bg-blue-50/60 transition-colors`}>
                    <td className="py-4 px-4 font-semibold text-slate-950">Month {row.month}</td>
                    <td className="py-4 px-4">{addMonths(firstEmiDate, row.month - 1).slice(0, 10)}</td>
                    <td className="py-4 px-4">{formatINR(row.openingPrincipal)}</td>
                    <td className="py-4 px-4 font-bold text-slate-950">{formatINR(row.emi)}</td>
                    <td className="py-4 px-4 text-blue-700 font-medium">{formatINR(row.principalPayment)}</td>
                    <td className="py-4 px-4 text-amber-700">{formatINR(row.interestPayment)}</td>
                    <td className="py-4 px-4">{formatINR(row.closingPrincipal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {shownSchedule.slice(0, 12).map((row) => (
              <div key={row.month} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-950">Month {row.month}</strong>
                  <span className="font-black text-slate-950">{formatINR(row.emi)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm text-slate-600">
                  <span>Due date <strong className="block text-slate-900">{addMonths(firstEmiDate, row.month - 1).slice(0, 10)}</strong></span>
                  <span>Principal <strong className="block text-blue-700">{formatINR(row.principalPayment)}</strong></span>
                  <span>Interest <strong className="block text-amber-700">{formatINR(row.interestPayment)}</strong></span>
                  <span>Opening <strong className="block text-slate-900">{formatINR(row.openingPrincipal)}</strong></span>
                  <span>Closing <strong className="block text-slate-900">{formatINR(row.closingPrincipal)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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


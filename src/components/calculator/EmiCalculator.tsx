import React, { useState, useMemo } from 'react';
import { calculateEmi, formatINR } from '../../utils/calculator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Calculator, ArrowRight, Download, Calendar, ShieldCheck, Percent, DollarSign } from 'lucide-react';
import { generateRepaymentSchedulePDF } from '../../utils/pdfGenerator';
import { CompanySettings } from '../../types';

interface EmiCalculatorProps {
  settings: CompanySettings;
  onApplyWithValues?: (amount: number, tenure: number) => void;
}

export const EmiCalculator: React.FC<EmiCalculatorProps> = ({ settings, onApplyWithValues }) => {
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(12.5);
  const [tenureMonths, setTenureMonths] = useState<number>(36);
  const [processingFeePercent, setProcessingFeePercent] = useState<number>(1.5);

  const result = useMemo(() => {
    return calculateEmi(loanAmount, interestRate, tenureMonths, processingFeePercent);
  }, [loanAmount, interestRate, tenureMonths, processingFeePercent]);

  const pieData = [
    { name: 'Principal Amount', value: loanAmount, color: '#0f172a' }, // slate-900
    { name: 'Total Interest Payable', value: result.totalInterest, color: '#16a34a' }, // green-600
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
          <Calculator className="w-4 h-4 text-emerald-600" /> Interactive Financial Calculator
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Smart Loan EMI & Repayment Calculator
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Calculate your monthly installment, interest cost, and amortization schedule instantly with complete transparency.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-4">
            <span>Adjust Loan Parameters</span>
            <span className="text-xs font-normal text-slate-500">Reducing Balance Rate</span>
          </h3>

          {/* Loan Amount Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700">Loan Amount Required</label>
              <span className="text-lg font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                {formatINR(loanAmount)}
              </span>
            </div>
            <input
              type="range"
              min={25000}
              max={5000000}
              step={25000}
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>₹25,000</span>
              <span>₹25 Lakhs</span>
              <span>₹50 Lakhs</span>
            </div>
          </div>

          {/* Interest Rate Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700">Annual Interest Rate (% p.a.)</label>
              <span className="text-lg font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                {interestRate}%
              </span>
            </div>
            <input
              type="range"
              min={8.0}
              max={24.0}
              step={0.25}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>8.0% (Home Loan)</span>
              <span>12.5% (Personal)</span>
              <span>24.0% (Max)</span>
            </div>
          </div>

          {/* Tenure Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-700">Loan Tenure</label>
              <span className="text-lg font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                {tenureMonths} Months ({Math.floor(tenureMonths / 12)} yrs {tenureMonths % 12 > 0 ? `${tenureMonths % 12}m` : ''})
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={120}
              step={6}
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 Year (12m)</span>
              <span>5 Years (60m)</span>
              <span>10 Years (120m)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Quick Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setLoanAmount(100000); setTenureMonths(12); setInterestRate(12.0); }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              >
                ₹1 Lakh / 1 Yr
              </button>
              <button
                onClick={() => { setLoanAmount(300000); setTenureMonths(24); setInterestRate(12.5); }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              >
                ₹3 Lakhs / 2 Yrs
              </button>
              <button
                onClick={() => { setLoanAmount(500000); setTenureMonths(36); setInterestRate(13.0); }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              >
                ₹5 Lakhs / 3 Yrs
              </button>
              <button
                onClick={() => { setLoanAmount(1000000); setTenureMonths(60); setInterestRate(11.5); }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              >
                ₹10 Lakhs / 5 Yrs
              </button>
            </div>
          </div>
        </div>

        {/* Output Summary & Chart Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800 relative overflow-hidden">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Estimated Monthly Installment</div>
            <div className="text-4xl font-extrabold tracking-tight text-white mb-6">
              {formatINR(result.monthlyEmi)} <span className="text-sm font-normal text-slate-400">/ month</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-sm">
              <div>
                <span className="text-slate-400 text-xs block">Principal Amount</span>
                <span className="font-semibold text-white text-base">{formatINR(loanAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Total Interest Cost</span>
                <span className="font-semibold text-emerald-400 text-base">{formatINR(result.totalInterest)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Total Payable Amount</span>
                <span className="font-semibold text-white text-base">{formatINR(result.totalPayment)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Est. Processing Fee</span>
                <span className="font-semibold text-slate-300 text-base">{formatINR(result.processingFeeAmount)}</span>
              </div>
            </div>

            {onApplyWithValues && (
              <button
                onClick={() => onApplyWithValues(loanAmount, tenureMonths)}
                className="mt-6 w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Apply for {formatINR(loanAmount)} Loan Now <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Recharts Pie Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Breakdown of Total Amount</h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatINR(Number(value))} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Amortization Table Preview */}
      <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">First 12 Months Repayment Schedule Preview</h3>
            <p className="text-xs text-slate-500">Monthly breakdown of interest vs principal repayment</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Opening Principal</th>
                <th className="py-3 px-4">EMI</th>
                <th className="py-3 px-4">Principal Repaid</th>
                <th className="py-3 px-4">Interest Paid</th>
                <th className="py-3 px-4">Closing Principal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {result.schedule.slice(0, 12).map((row) => (
                <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Month {row.month}</td>
                  <td className="py-2.5 px-4">{formatINR(row.openingPrincipal)}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{formatINR(row.emi)}</td>
                  <td className="py-2.5 px-4 text-emerald-700 font-medium">{formatINR(row.principalPayment)}</td>
                  <td className="py-2.5 px-4 text-amber-700">{formatINR(row.interestPayment)}</td>
                  <td className="py-2.5 px-4">{formatINR(row.closingPrincipal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { CompanySettings } from '../../types';
import { ShieldCheck, ArrowRight, Calculator, CheckCircle2, Lock, Zap } from 'lucide-react';

interface HeroProps {
  settings: CompanySettings;
  onApplyNow: () => void;
  onCalculateEmi: () => void;
}

export const Hero: React.FC<HeroProps> = ({ settings, onApplyNow, onCalculateEmi }) => {
  return (
    <section className="relative bg-slate-900 text-white overflow-hidden py-16 sm:py-24 border-b border-slate-800">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {settings.nbfcLicenseInfo}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Fast, Transparent & Reliable <span className="text-emerald-400">Financial Loans</span> for India
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Empowering individuals, salaried professionals, and businesses with instant digital loan sanctions up to <strong className="text-white">₹50 Lakhs</strong> with flexible EMI repayment options.
            </p>

            {/* Metric Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg mx-auto lg:mx-0 text-left">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Loan Amounts</span>
                <span className="text-sm font-extrabold text-emerald-400">₹25K - ₹50L</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Interest Rates</span>
                <span className="text-sm font-extrabold text-white">From 8.75%</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 font-semibold block uppercase">Process</span>
                <span className="text-sm font-extrabold text-sky-400">100% Paperless</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={onApplyNow}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                Apply Online Now <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onCalculateEmi}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-emerald-400" /> Calculate EMI
              </button>
            </div>

            <p className="text-xs text-slate-400 pt-2 flex items-center justify-center lg:justify-start gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Loan approval subject to eligibility verification & credit policies. No hidden charges.
            </p>
          </div>

          {/* Hero Feature Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Online Credit Portal</span>
                <h3 className="text-lg font-bold text-white">Instant Eligibility Checklist</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Minimal Documentation:</strong> PAN Card, Aadhaar Card, 6 Months Bank Statement.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Direct Bank Disbursement:</strong> Instant transfer upon credit sanction.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Zero Prepayment Penalty:</strong> Flexible repayment choices anytime.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Custom UPI Repayments:</strong> Direct UPI QR & UTR verification.</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-medium block">Licensed & Regulated NBFC Partnership</span>
              <span className="text-xs font-extrabold text-white mt-1 block">{settings.registrationNumber}</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

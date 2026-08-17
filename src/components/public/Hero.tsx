import React, { useMemo, useState } from 'react';
import { ArrowRight, Calculator, CheckCircle2, Clock, FileText, Lock, ShieldCheck, Sparkles, UserCheck, WalletCards } from 'lucide-react';
import { CmsContent, CompanySettings, EmploymentInfo, LoanProduct } from '../../types';
import { formatINR } from '../../utils/calculator';

interface HeroProps {
  settings: CompanySettings;
  products: LoanProduct[];
  cms?: CmsContent;
  onApplyNow: (draft: {
    productId?: string;
    amount?: number;
    tenure?: number;
    purpose?: string;
    employmentType?: EmploymentInfo['employmentType'];
    monthlyIncome?: number;
    existingEmis?: number;
  }) => void;
  onCalculateEmi: () => void;
  onNavigate?: (tab: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ settings, products, cms, onApplyNow, onCalculateEmi, onNavigate }) => {
  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products]);
  const firstProduct = activeProducts[0];
  const [productId, setProductId] = useState(firstProduct?.id || 'prod_personal');
  const selectedProduct = activeProducts.find((product) => product.id === productId) || firstProduct;
  const [amount, setAmount] = useState(selectedProduct?.minAmount || 250000);
  const [tenure, setTenure] = useState(selectedProduct?.minTenureMonths || 24);
  const [purpose, setPurpose] = useState('');
  const [employmentType, setEmploymentType] = useState('salaried');
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>('');
  const [existingEmi, setExistingEmi] = useState<number | ''>('');
  const heroBackgroundImage = cms?.promotionalSlides?.find((slide) => slide.isActive && slide.productId === productId)?.imageUrl
    || cms?.promotionalSlides?.find((slide) => slide.isActive)?.imageUrl
    || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&h=1200&fit=crop&auto=format';

  const handleProductChange = (nextId: string) => {
    const product = activeProducts.find((item) => item.id === nextId);
    setProductId(nextId);
    if (product) {
      setAmount(product.minAmount);
      setTenure(product.minTenureMonths);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApplyNow({
      productId,
      amount,
      tenure,
      purpose,
      employmentType: employmentType as EmploymentInfo['employmentType'],
      monthlyIncome: typeof monthlyIncome === 'number' ? monthlyIncome : undefined,
      existingEmis: typeof existingEmi === 'number' ? existingEmi : undefined,
    });
  };

  return (
    <section className="relative overflow-hidden bg-[#071B3D] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(30,136,255,.34),transparent_32%),radial-gradient(circle_at_85%_25%,rgba(255,255,255,.14),transparent_28%),linear-gradient(135deg,#071B3D_0%,#073B8C_52%,#0B5ED7_100%)]" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute left-0 right-0 bottom-0 h-28 bg-gradient-to-t from-[#F6FAFF] to-transparent" />

      <div className="relative df-container py-16 sm:py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center min-h-[640px]">
          <div
            className="relative overflow-hidden lg:col-span-6 rounded-[28px] border border-white/15 px-5 py-7 sm:px-8 lg:px-9 lg:py-10 shadow-2xl shadow-blue-950/25 min-h-[620px] animate-[fadeUp_.6s_ease-out_both]"
            style={{
              // Previously stacked three dark layers on top of this photo (a
              // 98%-opacity gradient here, a second 90%-opacity gradient div,
              // plus a dot-pattern overlay) - combined they left the image
              // almost fully hidden behind navy. Lightened so it's actually
              // visible, especially on the right where the text isn't.
              backgroundImage: `linear-gradient(90deg, rgba(7, 27, 61, 0.88) 0%, rgba(7, 27, 61, 0.55) 50%, rgba(7, 48, 111, 0.22) 100%), url("${heroBackgroundImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#071B3D]/45 via-transparent to-[#071B3D]/10" />
            <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative z-10 h-full flex flex-col justify-center space-y-6 text-center lg:text-left">
            <div className="inline-flex w-fit mx-auto lg:mx-0 items-center gap-2 px-4 py-2 rounded-full bg-white/12 border border-white/25 text-blue-50 text-xs font-bold uppercase tracking-wider backdrop-blur">
              <ShieldCheck className="w-4 h-4 text-sky-200" />
              {settings.nbfcLicenseInfo}
            </div>

            <h1 className="text-[2.35rem] sm:text-5xl lg:text-[3.55rem] font-black tracking-tight leading-[1.06] max-w-2xl mx-auto lg:mx-0 drop-shadow-sm">
              Start Your Loan Application Online
            </h1>

            <p className="text-base sm:text-lg text-blue-50 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Choose a loan option, enter your requirement, and continue into personal details, banking details, approval, disbursement, and EMI tracking.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto lg:mx-0 text-left">
              <div className="bg-[#071B3D]/62 p-4 rounded-2xl border border-white/18 backdrop-blur-md shadow-lg shadow-blue-950/10">
                <Sparkles className="w-5 h-5 text-sky-200 mb-3" />
                <span className="text-xs text-blue-100 font-semibold block uppercase">Interest from</span>
                <span className="text-[1.65rem] leading-tight font-black text-white">{cms?.heroStartingRate || 6}% p.a.</span>
              </div>
              <div className="bg-[#071B3D]/62 p-4 rounded-2xl border border-white/18 backdrop-blur-md shadow-lg shadow-blue-950/10">
                <FileText className="w-5 h-5 text-sky-200 mb-3" />
                <span className="text-xs text-blue-100 font-semibold block uppercase">Loan range</span>
                <span className="text-[1.65rem] leading-tight font-black text-white">{cms?.heroAmountRange || '₹25K - ₹2Cr'}</span>
              </div>
              <div className="bg-[#071B3D]/62 p-4 rounded-2xl border border-white/18 backdrop-blur-md shadow-lg shadow-blue-950/10">
                <Clock className="w-5 h-5 text-sky-200 mb-3" />
                <span className="text-xs text-blue-100 font-semibold block uppercase">Flexible tenure</span>
                <span className="text-[1.65rem] leading-tight font-black text-white">{cms?.heroTenure || '12 - 300 months'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button onClick={onCalculateEmi} className="df-btn bg-blue-950/40 hover:bg-blue-950/60 text-white border border-white/20 min-w-[170px]">
                <Calculator className="w-4 h-4 text-sky-200" /> EMI Calculator
              </button>
              <button onClick={() => onNavigate?.('track')} className="min-h-12 px-2 text-sm font-bold text-blue-100 hover:text-white inline-flex items-center gap-2">
                Check Status <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-blue-100/90 flex items-start justify-center lg:justify-start gap-2">
              <Lock className="w-3.5 h-3.5 text-sky-200 shrink-0 mt-0.5" />
              <span>{cms?.interestRateDisclaimer || 'Interest rates start from 6% per annum. Final rates depend on eligibility, verification, and lending policies.'}</span>
            </p>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center">
            <form onSubmit={handleSubmit} className="relative w-full rounded-[28px] bg-white text-slate-900 border border-white/20 p-5 sm:p-6 shadow-2xl shadow-blue-950/30 space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase text-blue-800">
                    <UserCheck className="w-3.5 h-3.5" /> Step 1 of 3
                  </span>
                  <h2 className="text-2xl font-black text-slate-950 mt-3">Loan Details</h2>
                  <p className="text-sm text-slate-500 mt-1">Continue after this step to add personal and banking details.</p>
                </div>
                <div className="hidden sm:grid w-12 h-12 rounded-2xl bg-blue-700 text-white place-items-center">
                  <WalletCards className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Loan Type</span>
                  <select value={productId} onChange={(e) => handleProductChange(e.target.value)} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm font-bold bg-white">
                    {activeProducts.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Required Amount *</span>
                  <input type="number" required min={selectedProduct?.minAmount} max={selectedProduct?.maxAmount} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm font-bold" />
                  <span className="text-[11px] text-slate-500 mt-1 block">{selectedProduct ? `${formatINR(selectedProduct.minAmount)} to ${formatINR(selectedProduct.maxAmount)}` : 'Admin configured range'}</span>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Preferred Tenure *</span>
                  <input type="number" required min={selectedProduct?.minTenureMonths} max={selectedProduct?.maxTenureMonths} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm font-bold" />
                  <span className="text-[11px] text-slate-500 mt-1 block">{selectedProduct ? `${selectedProduct.minTenureMonths}-${selectedProduct.maxTenureMonths} months` : 'Configured tenure'}</span>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Employment Type *</span>
                  <select required value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm font-semibold bg-white">
                    <option value="salaried">Salaried</option>
                    <option value="self_employed_biz">Self-employed business</option>
                    <option value="self_employed_pro">Self-employed professional</option>
                    <option value="freelancer">Freelancer</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Monthly Income *</span>
                  <input type="number" required value={monthlyIncome} placeholder="e.g. 50000" onChange={(e) => setMonthlyIncome(e.target.value ? Number(e.target.value) : '')} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm font-bold" />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Existing Monthly EMI *</span>
                  <input type="number" required value={existingEmi} placeholder="e.g. 0" onChange={(e) => setExistingEmi(e.target.value ? Number(e.target.value) : '')} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm font-bold" />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Purpose *</span>
                  <input type="text" required value={purpose} placeholder="e.g. Personal expenses" onChange={(e) => setPurpose(e.target.value)} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm" />
                </label>
              </div>

              <button type="submit" className="df-btn df-btn-primary w-full justify-center">
                Continue Application <ArrowRight className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" /> Admin-managed loan types
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" /> Simple review and submit
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};


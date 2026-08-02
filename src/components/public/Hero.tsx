import React, { useMemo } from 'react';
import { ArrowRight, Calculator, CheckCircle2, Clock, FileText, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { CmsContent, CompanySettings } from '../../types';
import { CarouselControls, useAutoCarousel } from './CarouselControls';

interface HeroProps {
  settings: CompanySettings;
  cms?: CmsContent;
  onApplyNow: () => void;
  onCalculateEmi: () => void;
  onNavigate?: (tab: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ settings, cms, onApplyNow, onCalculateEmi, onNavigate }) => {
  const slides = useMemo(
    () => (cms?.heroSlides || [])
      .filter((slide) => slide.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    [cms?.heroSlides],
  );
  const { index, setIndex, setPaused, userPaused, setUserPaused } = useAutoCarousel(slides.length, 6200);
  const active = slides[index] || slides[0];

  const handleSlideCta = () => {
    if (!active?.ctaTab || active.ctaTab === 'apply') onApplyNow();
    else if (active.ctaTab === 'calculator') onCalculateEmi();
    else if (active.ctaTab === 'documents') document.getElementById('required-documents')?.scrollIntoView({ behavior: 'smooth' });
    else onNavigate?.(active.ctaTab);
  };

  return (
    <section className="relative overflow-hidden bg-[#071B3D] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(30,136,255,.34),transparent_32%),radial-gradient(circle_at_85%_25%,rgba(255,255,255,.14),transparent_28%),linear-gradient(135deg,#071B3D_0%,#073B8C_52%,#0B5ED7_100%)]" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute left-0 right-0 bottom-0 h-28 bg-gradient-to-t from-[#F6FAFF] to-transparent" />

      <div className="relative df-container py-16 sm:py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16 items-center min-h-[680px]">
          <div className="lg:col-span-6 space-y-7 text-center lg:text-left animate-[fadeUp_.6s_ease-out_both]">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-100 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-sky-200" />
              {settings.nbfcLicenseInfo}
            </div>

            <h1 className="text-[2.65rem] sm:text-5xl lg:text-[4rem] font-black tracking-tight leading-[1.06] max-w-3xl mx-auto lg:mx-0">
              {cms?.heroTitle || 'Flexible Loans Designed Around Your Financial Goals'}
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-blue-100 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {cms?.heroSubtitle || 'Explore transparent loan options starting from 6% per annum, flexible repayment plans, secure digital documentation, and simple application tracking.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto lg:mx-0 text-left">
              <div className="bg-white/12 p-5 rounded-[20px] border border-white/15 backdrop-blur shadow-lg shadow-blue-950/10">
                <Sparkles className="w-5 h-5 text-sky-200 mb-3" />
                <span className="text-xs text-blue-100 font-semibold block uppercase">Interest from</span>
                <span className="text-2xl font-black text-white">{cms?.heroStartingRate || 6}% p.a.</span>
              </div>
              <div className="bg-white/12 p-5 rounded-[20px] border border-white/15 backdrop-blur shadow-lg shadow-blue-950/10">
                <FileText className="w-5 h-5 text-sky-200 mb-3" />
                <span className="text-xs text-blue-100 font-semibold block uppercase">Loan range</span>
                <span className="text-2xl font-black text-white">{cms?.heroAmountRange || '₹25K - ₹2Cr'}</span>
              </div>
              <div className="bg-white/12 p-5 rounded-[20px] border border-white/15 backdrop-blur shadow-lg shadow-blue-950/10">
                <Clock className="w-5 h-5 text-sky-200 mb-3" />
                <span className="text-xs text-blue-100 font-semibold block uppercase">Flexible tenure</span>
                <span className="text-2xl font-black text-white">{cms?.heroTenure || '12 - 300 months'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button onClick={onApplyNow} className="df-btn bg-white text-blue-800 shadow-lg hover:shadow-blue-950/20 min-w-[190px]">
                Apply for a Loan <ArrowRight className="w-4 h-4" />
              </button>
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

          <div
            className="lg:col-span-6"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') setIndex((index + 1) % slides.length);
              if (event.key === 'ArrowLeft') setIndex((index - 1 + slides.length) % slides.length);
            }}
            tabIndex={0}
            role="region"
            aria-label="Loan promotion carousel"
          >
            <div className="relative rounded-[32px] bg-white/12 border border-white/20 p-4 shadow-2xl shadow-blue-950/30">
              <div className="absolute -inset-4 bg-blue-400/20 blur-3xl rounded-full" />
              <div className="relative overflow-hidden rounded-[26px] bg-white text-slate-900 min-h-[500px]">
                {active && (
                  <div className="grid min-h-[500px]">
                    <img src={active.imageUrl} alt={active.alt} loading="lazy" className="col-start-1 row-start-1 h-full w-full object-cover" />
                    <div className="col-start-1 row-start-1 bg-gradient-to-t from-blue-950/95 via-blue-950/38 to-transparent" />
                    <div className="col-start-1 row-start-1 p-5 sm:p-6 self-start flex items-center justify-between text-white">
                      <span className="inline-flex rounded-full bg-white/16 border border-white/20 px-3 py-1 text-sm font-extrabold">
                        {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                      </span>
                      <div className="h-1.5 w-32 rounded-full bg-white/20 overflow-hidden">
                        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${((index + 1) / Math.max(slides.length, 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="col-start-1 row-start-1 self-end p-6 sm:p-8 text-white">
                      <h2 className="text-3xl sm:text-4xl font-black leading-tight">{active.title}</h2>
                      <p className="text-base text-blue-100 mt-3 max-w-md leading-relaxed">{active.description}</p>
                      <button onClick={handleSlideCta} className="mt-6 df-btn bg-white text-blue-800 min-w-[180px]">
                        {active.ctaLabel} <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative mt-4">
                <CarouselControls count={slides.length} index={index} setIndex={setIndex} label="hero" userPaused={userPaused} setUserPaused={setUserPaused} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-200" /> Transparent eligibility review
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-200" /> Digital document tracking
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


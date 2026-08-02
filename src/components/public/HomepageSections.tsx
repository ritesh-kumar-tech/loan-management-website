import React, { useMemo } from 'react';
import {
  ArrowRight,
  BadgeIndianRupee,
  Calculator,
  ClipboardCheck,
  Briefcase,
  FileCheck2,
  FileText,
  Headphones,
  IdCard,
  Image,
  Landmark,
  Layers,
  MapPin,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react';
import { CmsContent, CmsDocumentItem, CmsTrustItem, CmsWhyChooseItem, CompanySettings, LoanProduct } from '../../types';
import { CarouselControls, useAutoCarousel } from './CarouselControls';
import { formatINR } from '../../utils/calculator';

const icons: Record<string, React.ElementType> = {
  BadgeIndianRupee,
  Calculator,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Headphones,
  IdCard,
  Image,
  Landmark,
  Layers,
  MapPin,
  ShieldCheck,
  Briefcase,
  TrendingUp,
};

const Icon = ({ name, className }: { name?: string; className?: string }) => {
  const Component = icons[name || 'ShieldCheck'] || ShieldCheck;
  return <Component className={className} />;
};

const ordered = <T extends { displayOrder?: number; isActive?: boolean }>(items: T[] = []) =>
  items.filter((item) => item.isActive !== false).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

const defaultWhyChooseItems: CmsWhyChooseItem[] = [
  {
    id: 'why_clarity_fallback',
    iconName: 'Calculator',
    title: 'Better Loan Information and EMI Clarity',
    description: 'Review loan ranges, starting interest rates, repayment tenure, estimated EMI, and total payable amount before beginning your application.',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'why_documents_fallback',
    iconName: 'ShieldCheck',
    title: 'Secure Digital Documentation',
    description: 'Upload required documents through a protected digital process and track their verification status from your account.',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'why_tracking_fallback',
    iconName: 'TrendingUp',
    title: 'Application and Payment Tracking',
    description: 'Track application progress, document requests, EMI schedules, UPI payment submissions, payment verification, and generated receipts in one place.',
    displayOrder: 3,
    isActive: true,
  },
];

export const PromotionalCarousel: React.FC<{
  cms?: CmsContent;
  products: LoanProduct[];
  onSelectProduct: (productId: string) => void;
}> = ({ cms, products, onSelectProduct }) => {
  const slides = useMemo(() => ordered(cms?.promotionalSlides || []), [cms?.promotionalSlides]);
  const { index, setIndex, setPaused, userPaused, setUserPaused } = useAutoCarousel(slides.length, 5600);
  const visible = slides.length ? [0, 1, 2].map((offset) => slides[(index + offset) % slides.length]) : [];

  return (
    <section className="df-section-sm bg-[#F6FAFF] border-b border-blue-100">
      <div className="df-container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <span className="df-eyebrow">Featured Loan Options</span>
            <h2 className="df-heading mt-4">Explore Loan Options from 6%</h2>
            <p className="df-copy mt-3 max-w-2xl">Premium product teasers are managed from the admin CMS and link into the existing application flow.</p>
          </div>
          <CarouselControls count={slides.length} index={index} setIndex={setIndex} label="promotional offers" userPaused={userPaused} setUserPaused={setUserPaused} />
        </div>

        <div className="overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((slide) => {
              const product = products.find((p) => p.id === slide.productId);
              return (
                <article key={slide.id} className="group df-card df-card-hover overflow-hidden flex flex-col">
                  <div className="aspect-video overflow-hidden bg-blue-50 relative">
                    <img src={slide.imageUrl} alt={slide.alt} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-950/55 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-blue-800">{product?.type || 'loan'}</span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-extrabold text-slate-950">{slide.title}</h3>
                      <span className="shrink-0 rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-[11px] font-bold">From {slide.startingRate}%</span>
                    </div>
                    <p className="text-[15px] text-slate-600 mt-2 flex-1 leading-relaxed">{slide.description}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm mt-5 pt-5 border-t border-slate-100">
                      <span><strong className="block text-slate-950">Max tenure</strong>{slide.maxTenureMonths} months</span>
                      <span><strong className="block text-slate-950">Max limit</strong>{product ? formatINR(product.maxAmount) : 'Configurable'}</span>
                    </div>
                    <button onClick={() => slide.productId && onSelectProduct(slide.productId)} className="mt-6 df-btn df-btn-primary">
                      {slide.ctaLabel} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export const DocumentsAndTrust: React.FC<{ cms?: CmsContent }> = ({ cms }) => {
  const docs = ordered<CmsDocumentItem>(cms?.documentItems || []);
  const trust = ordered<CmsTrustItem>(cms?.trustItems || []);

  return (
    <>
      <section id="required-documents" className="df-section bg-white border-b border-blue-100 scroll-mt-24">
        <div className="df-container">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="df-eyebrow">Application Readiness</span>
            <h2 className="df-heading mt-4">Keep These Documents Ready</h2>
            <p className="df-copy mt-3">General requirements are shown publicly. Customer dashboards show uploaded, pending, verified, or rejected statuses without exposing sensitive document numbers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {docs.map((doc, idx) => (
              <article key={doc.id} className="group df-card df-card-hover p-6 min-h-[210px]">
                <div className="flex items-start gap-5">
                  <div className="w-20 h-20 rounded-[20px] bg-blue-700 text-white grid place-items-center shadow-lg shadow-blue-200 shrink-0">
                    <Icon name={doc.iconName} className="w-9 h-9" />
                  </div>
                  <div className="flex-1">
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-extrabold">Step {String(idx + 1).padStart(2, '0')}</span>
                    <h3 className="text-lg font-extrabold text-slate-950 mt-3 leading-snug">{doc.name}</h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{doc.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600"><strong>Formats:</strong> {doc.formats}</span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">Max 5 MB</span>
                      <span className={`rounded-full px-3 py-1 ${doc.isRequired ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{doc.isRequired ? 'Required' : 'Conditional'}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button className="df-btn df-btn-secondary mx-auto">View Complete Document Checklist <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#073B8C] via-[#0B5ED7] to-[#1E88FF] text-white">
        <div className="df-container py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {trust.map((item) => (
            <div key={item.id} className="flex items-start gap-4 rounded-2xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 grid place-items-center shrink-0">
                <Icon name={item.iconName} className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">{item.title}</h3>
                <p className="text-sm text-blue-100 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export const WhyChooseUs: React.FC<{ cms?: CmsContent; onStartApplication?: () => void }> = ({ cms, onStartApplication }) => {
  const benefits = ordered<CmsWhyChooseItem>((cms?.whyChooseItems?.length ? cms.whyChooseItems : defaultWhyChooseItems)).slice(0, 3);

  return (
    <section className="df-section relative overflow-hidden bg-white border-b border-blue-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(30,136,255,.13),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f6faff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] bg-[radial-gradient(#0B5ED7_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="df-container relative">
        <div className="max-w-3xl animate-[fadeUp_.38s_ease-out_both]">
          <span className="df-eyebrow">Why Choose Us</span>
          <h2 className="df-heading mt-4">{cms?.whyChooseTitle || 'Why Choose Our Loan Platform?'}</h2>
          <p className="df-copy mt-4">{cms?.whyChooseDescription || 'Understand your options, submit documents securely, and track every important stage through one simple digital platform.'}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {benefits.map((item, index) => (
            <article
              key={item.id}
              className={`group relative overflow-hidden rounded-[26px] border p-7 lg:p-8 min-h-[260px] flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl focus-within:ring-2 focus-within:ring-blue-500 ${
                index === 0
                  ? 'bg-gradient-to-br from-[#071B3D] via-[#0B5ED7] to-[#1E88FF] text-white border-blue-800 shadow-xl shadow-blue-200'
                  : 'bg-white text-slate-950 border-blue-100 shadow-[var(--df-shadow-sm)] hover:border-blue-300'
              } ${index === 2 ? 'md:col-span-2 xl:col-span-1' : ''}`}
              style={{ animation: `fadeUp .42s ease-out ${index * 80}ms both` }}
            >
              <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full ${index === 0 ? 'bg-white/10' : 'bg-blue-50'}`} />
              <div className={`relative w-14 h-14 rounded-2xl grid place-items-center mb-6 transition-transform duration-300 group-hover:scale-105 ${
                index === 0 ? 'bg-white/15 text-white border border-white/20' : 'bg-blue-50 text-blue-700'
              }`}>
                <Icon name={item.iconName} className="w-7 h-7" />
              </div>
              <span className={`relative text-xs font-extrabold uppercase ${index === 0 ? 'text-blue-100' : 'text-blue-700'}`}>
                {index === 0 ? 'Loan clarity' : index === 1 ? 'Documents' : 'Tracking'}
              </span>
              <h3 className={`relative text-2xl font-black leading-tight mt-3 ${index === 0 ? 'text-white' : 'text-slate-950'}`}>{item.title}</h3>
              <p className={`relative text-[15px] leading-relaxed mt-4 ${index === 0 ? 'text-blue-100' : 'text-slate-600'}`}>{item.description}</p>
              <button className={`relative mt-auto pt-7 inline-flex items-center gap-2 text-sm font-extrabold group/link ${index === 0 ? 'text-white' : 'text-blue-700'}`}>
                Learn More <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </button>
            </article>
          ))}
        </div>
        <div className="mt-10">
          <button onClick={onStartApplication} className="df-btn df-btn-primary">Start Your Application <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </section>
  );
};

export const EligibilityChecker: React.FC<{
  products: LoanProduct[];
  onContinue: (productId?: string, amount?: number) => void;
}> = ({ products, onContinue }) => {
  const active = products.filter((p) => p.isActive);
  const [productId, setProductId] = React.useState(active[0]?.id || '');
  const [amount, setAmount] = React.useState(300000);
  const [income, setIncome] = React.useState(60000);
  const [employmentType, setEmploymentType] = React.useState('salaried');
  const [existingEmi, setExistingEmi] = React.useState(0);
  const product = active.find((p) => p.id === productId) || active[0];
  const minIncome = product?.minIncome || product?.eligibility?.minIncome || 25000;
  const indicative = income >= minIncome && amount <= (product?.maxAmount || amount) && existingEmi <= income * 0.45;
  const affordableEmi = Math.max(0, Math.round((income - existingEmi) * 0.35));

  return (
    <section className="df-section-sm bg-[#F6FAFF] border-b border-blue-100">
      <div className="df-container">
        <div className="df-card p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-4">
            <span className="df-eyebrow">Indicative Eligibility Only</span>
            <h2 className="text-3xl font-black text-slate-950 mt-4">Check your loan readiness</h2>
            <p className="df-copy mt-3">This is not a final loan approval. Final eligibility depends on verification, documents, and internal lending policies.</p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Loan product"><select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm">{active.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
            <Field label="Required amount"><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm" /></Field>
            <Field label="Monthly income"><input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm" /></Field>
            <Field label="Employment type"><select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm"><option value="salaried">Salaried</option><option value="self_employed_biz">Self-employed business</option><option value="self_employed_pro">Self-employed professional</option><option value="freelancer">Freelancer</option></select></Field>
            <Field label="Existing monthly EMI"><input type="number" value={existingEmi} onChange={(e) => setExistingEmi(Number(e.target.value))} className="w-full min-h-12 rounded-xl border border-blue-100 px-3 text-sm" /></Field>
          </div>
          <div className="lg:col-span-3 rounded-[22px] bg-[#071B3D] text-white p-6">
            <p className="text-xs font-bold text-sky-300 uppercase">Indicative result</p>
            <h3 className="text-2xl font-black mt-2">{indicative ? 'Ready to continue' : 'Needs review'}</h3>
            <p className="text-sm text-blue-100 mt-3">Estimated affordable EMI: <strong className="text-white">{formatINR(affordableEmi)}</strong></p>
            <p className="text-xs text-blue-200 mt-2">Employment: {employmentType.replaceAll('_', ' ')}</p>
            <button onClick={() => onContinue(product?.id, amount)} className="df-btn bg-white text-blue-800 mt-6 w-full">Continue to Application</button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-bold text-slate-700 block mb-2">{label}</span>
    {children}
  </label>
);

export const TestimonialStatsCta: React.FC<{
  cms?: CmsContent;
  onApplyNow: () => void;
  onCalculateEmi: () => void;
  onTrack: () => void;
}> = ({ cms, onApplyNow, onCalculateEmi, onTrack }) => {
  const testimonials = useMemo(() => ordered(cms?.testimonials?.filter((t) => t.isPublished !== false) || []), [cms?.testimonials]);
  const stats = cms?.statistics?.filter((stat) => stat.isActive) || [];
  const { index, setIndex, setPaused, userPaused, setUserPaused } = useAutoCarousel(testimonials.length, 6400);
  const visible = testimonials.length ? [0, 1, 2].map((offset) => testimonials[(index + offset) % testimonials.length]) : [];

  return (
    <>
      <section className="df-section bg-white border-b border-blue-100">
        <div className="df-container">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
            <div>
              <span className="df-eyebrow">Customer Feedback</span>
              <h2 className="df-heading mt-4">Testimonials</h2>
              <p className="df-copy mt-3 max-w-2xl">Admin-approved placeholders are shown until real customer reviews are published.</p>
            </div>
            <CarouselControls count={testimonials.length} index={index} setIndex={setIndex} label="testimonials" userPaused={userPaused} setUserPaused={setUserPaused} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {visible.map((item) => (
              <article key={item.id} className="df-card df-card-hover p-7 min-h-[260px]">
                <div className="text-5xl leading-none text-blue-200 font-black">“</div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-700 text-white grid place-items-center font-extrabold">{(item.firstName || item.name || 'C').slice(0, 1)}</div>
                    <div>
                      <h3 className="font-extrabold text-slate-950">{item.firstName || item.name}, {item.city}</h3>
                      <p className="text-xs text-slate-500">{item.loanType}</p>
                    </div>
                  </div>
                  {item.isVerified && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">Verified</span>}
                </div>
                <div className="flex gap-1 text-amber-500 mt-4" aria-label={`${item.rating} star rating`}>
                  {Array.from({ length: 5 }).map((_, star) => <Star key={star} className={`w-4 h-4 ${star < item.rating ? 'fill-current' : ''}`} />)}
                </div>
                <p className="text-[15px] text-slate-700 mt-5 leading-relaxed">{item.comment}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="df-section-sm bg-[#F6FAFF] border-b border-blue-100">
        <div className="df-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <div key={stat.id} className="df-card df-card-hover p-6">
              <Icon name={stat.iconName} className="w-8 h-8 text-blue-700 mb-4" />
              <div className="text-4xl font-black text-slate-950">{stat.value.toLocaleString('en-IN')}{stat.suffix}</div>
              <p className="text-sm text-slate-700 font-extrabold mt-2">{stat.label}</p>
              <p className="text-xs text-slate-500 mt-1">Admin-managed platform capability</p>
            </div>
          ))}
        </div>
      </section>

      <section className="df-section-sm bg-white">
        <div className="df-container">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#071B3D] via-[#0B5ED7] to-[#1E88FF] px-6 py-12 sm:px-12 lg:px-14 lg:py-16 text-white shadow-xl">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black leading-tight">Ready to Take the Next Step?</h2>
                <p className="text-base text-blue-100 mt-3 max-w-2xl leading-relaxed">Compare EMI values, choose a suitable product, and continue through the existing secure application flow.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={onApplyNow} className="df-btn bg-white text-blue-800">Apply for a Loan</button>
                <button onClick={onCalculateEmi} className="df-btn bg-white/10 border border-white/25 text-white">Calculate EMI</button>
                <button onClick={onTrack} className="df-btn bg-blue-950/40 border border-white/25 text-white">Track Application</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export const FloatingSupportAction: React.FC<{ settings: CompanySettings }> = ({ settings }) => (
  <div className="fixed right-4 flex flex-col gap-2 sm:right-6" style={{ zIndex: 'var(--z-floating)', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
    <a href={`tel:${settings.supportPhone}`} className="min-h-12 rounded-full bg-[#071B3D] text-white shadow-xl shadow-blue-950/20 px-4 py-3 flex items-center gap-3 text-sm font-extrabold border border-white/10">
      <Headphones className="w-5 h-5 text-sky-300" />
      <span className="hidden sm:inline">Need Help?</span>
    </a>
  </div>
);


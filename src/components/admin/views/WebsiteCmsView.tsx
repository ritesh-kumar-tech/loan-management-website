import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  MessageSquare, 
  FileText, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../../../services/api';

interface WebsiteCmsViewProps {
  onNotify?: (msg: string) => void;
}

export const WebsiteCmsView: React.FC<WebsiteCmsViewProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'hero' | 'faqs' | 'testimonials' | 'policies'>('hero');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [heroTitle, setHeroTitle] = useState('');
  const [heroTagline, setHeroTagline] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [announcementBanner, setAnnouncementBanner] = useState('');
  const [cmsExtra, setCmsExtra] = useState<any>({});

  const [faqs, setFaqs] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  const [terms, setTerms] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [fairPractices, setFairPractices] = useState('');
  const [grievance, setGrievance] = useState('');

  useEffect(() => {
    async function loadCms() {
      try {
        const cms = await api.getCms();
        if (cms) {
          setHeroTitle(cms.heroTitle || 'Instant Digital Lending Across India');
          setHeroTagline(cms.heroTagline || '100% RBI Compliant Loans');
          setHeroSubtitle(cms.heroSubtitle || 'Flexible Personal & Business Loans');
          setAnnouncementBanner(cms.announcementBanner || 'Interest rates start from 6% per annum. Final rates are subject to eligibility and lending policies.');
          setFaqs(cms.faqs || []);
          setTestimonials(cms.testimonials || []);
          setCmsExtra({
            heroStartingRate: cms.heroStartingRate || 6,
            heroAmountRange: cms.heroAmountRange || '₹25K - ₹2Cr',
            heroTenure: cms.heroTenure || '12 - 300 months',
            heroSlides: cms.heroSlides || [],
            promotionalSlides: cms.promotionalSlides || [],
            documentItems: cms.documentItems || [],
            trustItems: cms.trustItems || [],
            whyChooseTitle: cms.whyChooseTitle || 'Why Choose Our Loan Platform?',
            whyChooseDescription: cms.whyChooseDescription || 'Understand your options, submit documents securely, and track every important stage through one simple digital platform.',
            whyChooseItems: cms.whyChooseItems || [],
            statistics: cms.statistics || [],
            interestRateDisclaimer: cms.interestRateDisclaimer || 'Interest rates start from 6% per annum. The final applicable rate depends on the selected loan product, applicant eligibility, verification, and internal lending policies.',
          });
          setTerms(cms.termsAndConditions || '');
          setPrivacy(cms.privacyPolicy || '');
          setFairPractices(cms.fairPracticesCode || '');
          setGrievance(cms.grievanceRedressal || '');
        }
      } catch (e) {
        console.error('Failed to load CMS', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadCms();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.saveCms({
        heroTitle,
        heroTagline,
        heroSubtitle,
        announcementBanner,
        ...cmsExtra,
        faqs,
        testimonials,
        termsAndConditions: terms,
        privacyPolicy: privacy,
        fairPracticesCode: fairPractices,
        grievanceRedressal: grievance,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save CMS', e);
    } finally {
      setIsSaving(false);
    }
  };

  const addFaq = () => {
    setFaqs([
      ...faqs,
      {
        id: `faq_${Date.now()}`,
        question: 'New Frequently Asked Question',
        answer: 'Provide clear explanation for customers here.',
        category: 'General',
      },
    ]);
  };

  const removeFaq = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
  };

  const updateFaq = (id: string, field: string, val: string) => {
    setFaqs(faqs.map((f) => (f.id === id ? { ...f, [field]: val } : f)));
  };

  const updateExtraJson = (field: string, value: string) => {
    try {
      setCmsExtra({ ...cmsExtra, [field]: JSON.parse(value) });
    } catch {
      onNotify?.(`Invalid JSON for ${field}`);
    }
  };

  const addTestimonial = () => {
    setTestimonials([
      ...testimonials,
      {
        id: `t_${Date.now()}`,
        name: 'Satisfied Customer',
        loanType: 'Personal Loan',
        rating: 5,
        comment: 'Demo placeholder review. Replace with approved customer feedback.',
        city: 'New Delhi',
        isVerified: false,
        isPublished: false,
        displayOrder: testimonials.length + 1,
      },
    ]);
  };

  const removeTestimonial = (id: string) => {
    setTestimonials(testimonials.filter((t) => t.id !== id));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading CMS Content Editor...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" /> Website Content & CMS Editor
          </h2>
          <p className="text-xs text-slate-500">Edit public portal headlines, promotional banners, FAQs, customer reviews & regulatory policy copy.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Publish Content Live'}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-blue-100 border border-blue-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-800" /> Website Content Successfully Published Live!
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: 'hero', label: 'Homepage Hero & Banners' },
          { id: 'faqs', label: `FAQs (${faqs.length})` },
          { id: 'testimonials', label: `Testimonials (${testimonials.length})` },
          { id: 'policies', label: 'Regulatory Policy Pages' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-700 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Hero & Banners */}
      {activeTab === 'hero' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Public Banner & Hero Copy</h3>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Top Announcement Banner Text</label>
              <input
                type="text"
                value={announcementBanner}
                onChange={(e) => setAnnouncementBanner(e.target.value)}
                placeholder="Interest rates start from 6% per annum. Final rates are subject to eligibility and lending policies."
                className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Main Hero Headline</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Instant Digital Lending Across India"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Hero Tagline</label>
              <input
                type="text"
                value={heroTagline}
                onChange={(e) => setHeroTagline(e.target.value)}
                placeholder="Regulated digital lending experience with clear eligibility review"
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Hero Subtitle</label>
              <input
                type="text"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Flexible Personal, Business & Home Loans"
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Starting Rate</label>
                <input
                  type="number"
                  min={6}
                  step="0.1"
                  value={cmsExtra.heroStartingRate || 6}
                  onChange={(e) => setCmsExtra({ ...cmsExtra, heroStartingRate: Math.max(6, Number(e.target.value)) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Loan Amount Range</label>
                <input
                  type="text"
                  value={cmsExtra.heroAmountRange || ''}
                  onChange={(e) => setCmsExtra({ ...cmsExtra, heroAmountRange: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tenure Label</label>
                <input
                  type="text"
                  value={cmsExtra.heroTenure || ''}
                  onChange={(e) => setCmsExtra({ ...cmsExtra, heroTenure: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Interest Rate Disclaimer</label>
              <textarea
                value={cmsExtra.interestRateDisclaimer || ''}
                onChange={(e) => setCmsExtra({ ...cmsExtra, interestRateDisclaimer: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            {[
              ['heroSlides', 'Hero Slides'],
              ['promotionalSlides', 'Promotional Carousel'],
              ['documentItems', 'Required Documents'],
              ['trustItems', 'Trust Strip'],
              ['whyChooseItems', 'Why Choose Us'],
              ['statistics', 'Statistics'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block font-bold text-slate-700 mb-1">{label} JSON</label>
                <textarea
                  defaultValue={JSON.stringify(cmsExtra[field] || [], null, 2)}
                  onBlur={(e) => updateExtraJson(field, e.target.value)}
                  rows={5}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px]"
                />
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Why Choose Section Heading</label>
                <input
                  type="text"
                  value={cmsExtra.whyChooseTitle || ''}
                  onChange={(e) => setCmsExtra({ ...cmsExtra, whyChooseTitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Why Choose Supporting Text</label>
                <input
                  type="text"
                  value={cmsExtra.whyChooseDescription || ''}
                  onChange={(e) => setCmsExtra({ ...cmsExtra, whyChooseDescription: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: FAQs */}
      {activeTab === 'faqs' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Manage Frequently Asked Questions</h3>
            <button
              onClick={addFaq}
              className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add FAQ
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                    placeholder="Question title..."
                    className="w-full p-2 rounded-xl border border-slate-200 font-bold text-xs"
                  />
                  <button
                    onClick={() => removeFaq(faq.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                  placeholder="Answer explanation..."
                  rows={2}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Testimonials */}
      {activeTab === 'testimonials' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Manage Customer Reviews & Testimonials</h3>
            <button
              onClick={addTestimonial}
              className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Review
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testimonials.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => {
                      const updated = testimonials.map((item) => item.id === t.id ? { ...item, name: e.target.value } : item);
                      setTestimonials(updated);
                    }}
                    className="font-bold text-slate-900 p-1 rounded-md border border-slate-200 text-xs w-2/3"
                  />
                  <button onClick={() => removeTestimonial(t.id)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={t.comment}
                  onChange={(e) => {
                    const updated = testimonials.map((item) => item.id === t.id ? { ...item, comment: e.target.value } : item);
                    setTestimonials(updated);
                  }}
                  rows={2}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={t.city || ''}
                    onChange={(e) => setTestimonials(testimonials.map((item) => item.id === t.id ? { ...item, city: e.target.value } : item))}
                    placeholder="City"
                    className="p-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={t.rating || 5}
                    onChange={(e) => setTestimonials(testimonials.map((item) => item.id === t.id ? { ...item, rating: Number(e.target.value) } : item))}
                    className="p-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-700">
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={!!t.isPublished} onChange={(e) => setTestimonials(testimonials.map((item) => item.id === t.id ? { ...item, isPublished: e.target.checked } : item))} />
                    Publish
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={!!t.isVerified} onChange={(e) => setTestimonials(testimonials.map((item) => item.id === t.id ? { ...item, isVerified: e.target.checked } : item))} />
                    Verified customer
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Regulatory Policy Pages */}
      {activeTab === 'policies' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">Regulatory Copy Editors</h3>

          <div className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Grievance Redressal Officer Contact Details</label>
              <textarea
                value={grievance}
                onChange={(e) => setGrievance(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">RBI Fair Practices Code</label>
              <textarea
                value={fairPractices}
                onChange={(e) => setFairPractices(e.target.value)}
                rows={4}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



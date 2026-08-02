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
          setAnnouncementBanner(cms.announcementBanner || '⚡ 0% Processing Fee Special Offer!');
          setFaqs(cms.faqs || []);
          setTestimonials(cms.testimonials || []);
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

  const addTestimonial = () => {
    setTestimonials([
      ...testimonials,
      {
        id: `t_${Date.now()}`,
        name: 'Satisfied Customer',
        loanType: 'Personal Loan',
        rating: 5,
        comment: 'Great experience getting quick disbursement!',
        city: 'New Delhi',
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
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Publish Content Live'}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Website Content Successfully Published Live!
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
                ? 'bg-slate-900 text-white font-bold'
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
                placeholder="e.g. ⚡ Festival Special: 0% Processing Fee on First Personal Loan Applications!"
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
                placeholder="100% RBI Compliant Loans Disbursed in Minutes"
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
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
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
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
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

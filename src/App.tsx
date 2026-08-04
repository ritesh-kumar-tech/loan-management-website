import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { CompanySettings, User, LoanProduct, CmsContent } from './types';
import { defaultSettings, defaultCmsContent } from './data/mockDatabase';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/public/Hero';
import { ProductCards } from './components/public/ProductCards';
import { ProcessSteps } from './components/public/ProcessSteps';
import { DocumentsAndTrust, FloatingSupportAction, PromotionalCarousel, TestimonialStatsCta, WhyChooseUs } from './components/public/HomepageSections';
import { EmiCalculator } from './components/calculator/EmiCalculator';
import { StatusTracker } from './components/public/StatusTracker';
import { ReceiptVerifier } from './components/public/ReceiptVerifier';
import { FAQSection } from './components/public/FAQSection';
import { StepWizard } from './components/application/StepWizard';
import { CustomerDashboard } from './components/dashboard/CustomerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PolicyPages } from './components/policy/PolicyPages';
import { AuthModal } from './components/auth/AuthModal';
import { ShieldCheck, Phone, Mail, MapPin, Building2 } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [cms, setCms] = useState<CmsContent>(defaultCmsContent);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  
  // Wizard state
  const [selectedProductIdForWizard, setSelectedProductIdForWizard] = useState<string | undefined>(undefined);
  const [wizardInitialAmount, setWizardInitialAmount] = useState<number | undefined>(undefined);
  const [wizardInitialTenure, setWizardInitialTenure] = useState<number | undefined>(undefined);

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
    async function initData() {
      try {
        const [s, p, c] = await Promise.all([
          api.getSettings(),
          api.getLoanProducts(),
          api.getCms(),
        ]);
        setSettings(s);
        setProducts(p);
        setCms(c);
      } catch (e) {
        console.error('Failed to load initial settings', e);
      }
    }
    initData();
  }, []);

  const handleStartApplication = (productId?: string, amount?: number, tenure?: number) => {
    if (productId) setSelectedProductIdForWizard(productId);
    if (amount) setWizardInitialAmount(amount);
    if (tenure) setWizardInitialTenure(tenure);
    
    setActiveTab('apply');
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
  };

  if (activeTab === 'admin' && user?.role === 'admin') {
    return (
      <AdminDashboard
        settings={settings}
        onUpdateSettings={(newS) => setSettings(newS)}
        onExitAdmin={() => setActiveTab('home')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6FAFF] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Primary Header */}
      <Header
        settings={settings}
        products={products}
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onStartApplication={(pId) => handleStartApplication(pId)}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {/* HOME PAGE */}
        {activeTab === 'home' && (
          <div className="space-y-0">
            <Hero
              settings={settings}
              products={products}
              cms={cms}
              onApplyNow={(productId, amount, tenure) => handleStartApplication(productId, amount, tenure)}
              onCalculateEmi={() => setActiveTab('calculator')}
              onNavigate={setActiveTab}
            />
            <PromotionalCarousel
              cms={cms}
              products={products}
              onSelectProduct={(pId) => handleStartApplication(pId)}
            />
            <DocumentsAndTrust cms={cms} />
            <WhyChooseUs cms={cms} onStartApplication={() => handleStartApplication()} />
            <ProcessSteps onStartApplication={() => handleStartApplication()} />
            <EmiCalculator
              settings={settings}
              products={products}
              onApplyWithValues={(amt) => handleStartApplication(undefined, amt)}
            />
            <TestimonialStatsCta
              cms={cms}
              onApplyNow={() => handleStartApplication()}
              onCalculateEmi={() => setActiveTab('calculator')}
              onTrack={() => setActiveTab('track')}
            />
            <FAQSection />
          </div>
        )}

        {/* LOAN PRODUCTS PAGE */}
        {activeTab === 'loans' && (
          <div className="py-12">
            <ProductCards
              products={products}
              onSelectProduct={(pId) => handleStartApplication(pId)}
            />
          </div>
        )}

        {/* EMI CALCULATOR PAGE */}
        {activeTab === 'calculator' && (
          <EmiCalculator
            settings={settings}
            products={products}
            onApplyWithValues={(amt) => handleStartApplication(undefined, amt)}
          />
        )}

        {/* TRACK APPLICATION PAGE */}
        {activeTab === 'track' && <StatusTracker settings={settings} />}

        {/* VERIFY RECEIPT PAGE */}
        {activeTab === 'verify' && <ReceiptVerifier settings={settings} />}

        {/* ONLINE APPLICATION WIZARD */}
        {activeTab === 'apply' && (
          <StepWizard
            settings={settings}
            products={products}
            selectedProductId={selectedProductIdForWizard}
            initialAmount={wizardInitialAmount}
            initialTenure={wizardInitialTenure}
            userId={user?.id || 'usr_guest'}
            userEmail={user?.email || 'guest@example.com'}
            onComplete={() => setActiveTab(user ? 'dashboard' : 'track')}
            onCancel={() => setActiveTab('home')}
          />
        )}

        {/* CUSTOMER DASHBOARD */}
        {activeTab === 'dashboard' && user && (
          <CustomerDashboard
            settings={settings}
            user={user}
            onStartNewApplication={() => handleStartApplication()}
          />
        )}

        {/* ABOUT US PAGE */}
        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto px-4 py-16 space-y-8 animate-fade-in">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">
                Corporate Identity
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 mt-3">About {settings.companyName}</h1>
              <p className="text-sm text-slate-600 mt-2">{settings.tagline}</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>{settings.companyName}</strong> ({settings.registrationNumber}) is an authorized digital lending institution delivering transparent, accessible, and fast financial credit solutions across India.
              </p>
              <p>
                Equipped with cutting-edge automated underwriting technology, paperless KYC verification, and custom UPI repayment systems, we empower retail borrowers, salaried professionals, and MSME business owners with responsible financial solutions.
              </p>
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
                <div className="font-bold text-sky-300">Licensed Financial Entity</div>
                <p>{settings.nbfcLicenseInfo} | GSTIN: {settings.gstNumber}</p>
                <p>Registered Office: {settings.registeredAddress}</p>
              </div>
            </div>
          </div>
        )}

        {/* CONTACT US PAGE */}
        {activeTab === 'contact' && (
          <div className="max-w-4xl mx-auto px-4 py-16 space-y-8 animate-fade-in">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold text-sky-800 bg-sky-100 px-3 py-1 rounded-full uppercase tracking-wider">
                Get In Touch
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 mt-3">Contact & Support Desk</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
                <Phone className="w-8 h-8 text-blue-700 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Helpline Phone</h3>
                <p className="text-xs text-slate-600 font-semibold">{settings.supportPhone}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
                <Mail className="w-8 h-8 text-sky-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Support Email</h3>
                <p className="text-xs text-slate-600 font-semibold">{settings.supportEmail}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
                <MapPin className="w-8 h-8 text-indigo-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Registered Office</h3>
                <p className="text-[11px] text-slate-600">{settings.registeredAddress}</p>
              </div>
            </div>
          </div>
        )}

        {/* REGULATORY POLICY PAGES */}
        {activeTab === 'policy_privacy' && <PolicyPages type="privacy" settings={settings} />}
        {activeTab === 'policy_terms' && <PolicyPages type="terms" settings={settings} />}
        {activeTab === 'policy_fair' && <PolicyPages type="fair" settings={settings} />}
        {activeTab === 'policy_grievance' && <PolicyPages type="grievance" settings={settings} />}
        {activeTab === 'policy_lending' && <PolicyPages type="lending" settings={settings} />}
        {activeTab === 'policy_refund' && <PolicyPages type="refund" settings={settings} />}
      </main>

      {/* Primary Footer */}
      <Footer settings={settings} setActiveTab={setActiveTab} />
      <FloatingSupportAction settings={settings} />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          settings={settings}
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={(nextUser) => {
            setUser(nextUser);
            setShowAuthModal(false);
            setActiveTab(nextUser.role === 'admin' ? 'admin' : 'dashboard');
          }}
          onUnavailable={() => {
            setUser(null);
            setShowAuthModal(false);
            setSelectedProductIdForWizard(undefined);
            setWizardInitialAmount(undefined);
            setActiveTab('home');
          }}
        />
      )}
    </div>
  );
}

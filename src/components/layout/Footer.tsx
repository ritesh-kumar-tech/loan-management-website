import React from 'react';
import { CompanySettings } from '../../types';
import { ArrowUp, Clock, Lock, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

interface FooterProps {
  settings: CompanySettings;
  setActiveTab: (tab: string) => void;
}

const loanLinks = ['Instant Personal Loan', 'Instant Short Term Loan', 'Business Loan', 'Educational Loan'];
const quickLinks = [
  ['calculator', 'EMI Calculator'],
  ['track', 'Track Application Status'],
  ['verify', 'Verify Official Receipt'],
  ['contact', 'Grievance Redressal'],
  ['about', 'About Dhani Finance'],
];
const policies = [
  ['policy_privacy', 'Privacy Policy'],
  ['policy_terms', 'Terms & Conditions'],
  ['policy_fair', 'Fair Practices Code'],
  ['policy_grievance', 'Grievance Officer Policy'],
  ['policy_lending', 'Responsible Lending'],
  ['policy_refund', 'Refund & Cancellation'],
];

export const Footer: React.FC<FooterProps> = ({ settings, setActiveTab }) => {
  const backToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="bg-[#030B1D] text-slate-300 pt-20 pb-10 border-t border-blue-950">
      <div className="df-container">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-10 xl:gap-12 mb-12">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-950/30">
                D
              </div>
              <div>
                <span className="text-2xl font-black text-white tracking-tight">{settings.companyName}</span>
                <span className="block text-sm text-sky-300 font-semibold">Licensed Financial Institution</span>
              </div>
            </div>

            <p className="text-[15px] text-slate-400 leading-relaxed max-w-xl">
              {settings.companyName} provides online personal loan support as a fast, convenient, and affordable source of financing to help borrowers achieve their goals and overcome financial obstacles.
            </p>

            <div className="rounded-[20px] bg-white/[0.04] border border-white/10 p-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 font-extrabold text-sky-300">
                <ShieldCheck className="w-5 h-5" /> Regulatory Information
              </div>
              <p className="text-slate-400">{settings.nbfcLicenseInfo}</p>
              <p className="text-slate-400">{settings.registrationNumber}</p>
              <p className="text-slate-400">GSTIN: {settings.gstNumber}</p>
            </div>
          </div>

          <FooterColumn title="Loan Products">
            {loanLinks.map((label) => <FooterButton key={label} onClick={() => setActiveTab('loans')}>{label}</FooterButton>)}
          </FooterColumn>

          <FooterColumn title="Quick Tools">
            {quickLinks.map(([tab, label]) => <FooterButton key={tab} onClick={() => setActiveTab(tab)}>{label}</FooterButton>)}
          </FooterColumn>

          <FooterColumn title="Policies">
            {policies.map(([tab, label]) => <FooterButton key={tab} onClick={() => setActiveTab(tab)}>{label}</FooterButton>)}
          </FooterColumn>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 py-8 border-y border-white/10">
          <Info icon={MapPin} title="Registered Office" text={settings.registeredAddress} />
          <Info icon={Phone} title="Support Phone" text={`${settings.supportPhone} (Mon-Sat, 9:30 AM - 6:30 PM)`} />
          <Info icon={Mail} title="Support Email" text={settings.supportEmail} />
          <Info icon={Clock} title="Grievance Support" text="Use the Contact page for application, payment, and verification queries." />
        </div>

        <div className="mt-8 rounded-[20px] bg-amber-400/10 p-5 text-sm text-slate-300 leading-relaxed border border-amber-300/20">
          <span className="font-black text-amber-300 uppercase tracking-wide block mb-2">Mandatory Regulatory Disclaimer</span>
          Loan approval is subject to credit eligibility verification, document verification, internal lending policy checks, and applicable regulatory requirements. Dhani Finance does not charge upfront cash fees or promise guaranteed approvals without verification. All loan disbursements are made into the verified bank account of the primary borrower.
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 gap-4">
          <p>© 2026 {settings.companyName} Limited. All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-slate-400"><Lock className="w-4 h-4 text-sky-300" /> Secure Portal</span>
            <button onClick={backToTop} className="min-h-10 px-4 rounded-full bg-white/5 text-sky-300 font-bold inline-flex items-center gap-2 hover:bg-white/10">
              Back to top <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterColumn: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-base font-black text-white mb-5">{title}</h4>
    <ul className="space-y-3 text-[15px] text-slate-400">{children}</ul>
  </div>
);

const FooterButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <li>
    <button onClick={onClick} className="hover:text-sky-300 transition-colors text-left min-h-7">
      {children}
    </button>
  </li>
);

const Info: React.FC<{ icon: React.ElementType; title: string; text: string }> = ({ icon: Icon, title, text }) => (
  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex items-start gap-3">
    <Icon className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
    <div>
      <strong className="text-white block text-sm">{title}</strong>
      <span className="text-sm text-slate-400 leading-relaxed">{text}</span>
    </div>
  </div>
);


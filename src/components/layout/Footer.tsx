import React from 'react';
import { CompanySettings } from '../../types';
import { ShieldCheck, Phone, Mail, MapPin, ExternalLink, Lock } from 'lucide-react';

interface FooterProps {
  settings: CompanySettings;
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, setActiveTab }) => {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand & Regulatory Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xl flex items-center justify-center">
                D
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">{settings.companyName}</span>
                <span className="block text-xs text-emerald-400 font-medium">Licensed Financial Institution</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed pr-4">
              {settings.companyName} is an authorized fintech lending partner delivering instant, paperless, and transparent financial credit products to retail borrowers, salaried professionals, and MSMEs across India.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" /> Regulatory Compliance Notice
              </div>
              <p className="text-slate-400">
                {settings.nbfcLicenseInfo} | {settings.registrationNumber}
              </p>
              <p className="text-slate-400">
                GSTIN: {settings.gstNumber}
              </p>
            </div>
          </div>

          {/* Loan Products Column */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Loan Products</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><button onClick={() => setActiveTab('loans')} className="hover:text-emerald-400 transition-colors">Personal Loan</button></li>
              <li><button onClick={() => setActiveTab('loans')} className="hover:text-emerald-400 transition-colors">Business Growth Loan</button></li>
              <li><button onClick={() => setActiveTab('loans')} className="hover:text-emerald-400 transition-colors">Home Housing Loan</button></li>
              <li><button onClick={() => setActiveTab('loans')} className="hover:text-emerald-400 transition-colors">Education Loan</button></li>
              <li><button onClick={() => setActiveTab('loans')} className="hover:text-emerald-400 transition-colors">Vehicle & Auto Finance</button></li>
              <li><button onClick={() => setActiveTab('loans')} className="hover:text-emerald-400 transition-colors">Loan Against Property</button></li>
            </ul>
          </div>

          {/* Quick Links & Services */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Tools</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><button onClick={() => setActiveTab('calculator')} className="hover:text-emerald-400 transition-colors">EMI Calculator</button></li>
              <li><button onClick={() => setActiveTab('track')} className="hover:text-emerald-400 transition-colors">Track Application Status</button></li>
              <li><button onClick={() => setActiveTab('verify')} className="hover:text-emerald-400 transition-colors">Verify Official Receipt</button></li>
              <li><button onClick={() => setActiveTab('contact')} className="hover:text-emerald-400 transition-colors">Grievance Redressal</button></li>
              <li><button onClick={() => setActiveTab('about')} className="hover:text-emerald-400 transition-colors">About Dhani Finance</button></li>
            </ul>
          </div>

          {/* Legal Policies Column */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Regulatory Policies</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><button onClick={() => setActiveTab('policy_privacy')} className="hover:text-emerald-400 transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => setActiveTab('policy_terms')} className="hover:text-emerald-400 transition-colors">Terms & Conditions</button></li>
              <li><button onClick={() => setActiveTab('policy_fair')} className="hover:text-emerald-400 transition-colors">Fair Practices Code</button></li>
              <li><button onClick={() => setActiveTab('policy_grievance')} className="hover:text-emerald-400 transition-colors">Grievance Officer Policy</button></li>
              <li><button onClick={() => setActiveTab('policy_lending')} className="hover:text-emerald-400 transition-colors">Responsible Lending</button></li>
              <li><button onClick={() => setActiveTab('policy_refund')} className="hover:text-emerald-400 transition-colors">Refund & Cancellation</button></li>
            </ul>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="py-6 border-t border-b border-slate-800 my-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block">Registered Office:</strong>
              {settings.registeredAddress}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block">Toll-Free Helpline:</strong>
              {settings.supportPhone} (Mon-Sat, 9:30 AM - 6:30 PM)
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block">Support & Grievance Desk:</strong>
              {settings.supportEmail}
            </div>
          </div>
        </div>

        {/* Compliance Disclaimer (Mandatory) */}
        <div className="bg-slate-900 p-4 rounded-xl text-xs text-slate-400 leading-relaxed mb-8 border border-slate-800">
          <span className="font-bold text-amber-400 uppercase tracking-wide block mb-1">Mandatory Regulatory Disclaimer:</span>
          Loan approval is subject to credit eligibility verification, document verification, internal lending policy checks, and applicable regulatory requirements. Dhani Finance does not charge any upfront cash fees or promise 100% guaranteed approvals without verification. All loan disbursements are made exclusively into the verified bank account of the primary borrower.
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 {settings.companyName} Limited. All Rights Reserved.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit SSL Encrypted & Secure Portal
          </div>
        </div>

      </div>
    </footer>
  );
};

import React from 'react';
import { UserPlus, FileEdit, UploadCloud, Sparkles, ShieldCheck, CheckCircle2, CreditCard } from 'lucide-react';

export const ProcessSteps: React.FC = () => {
  const steps = [
    { num: '1', title: 'Register Account', desc: 'Sign up with mobile and email in seconds.' },
    { num: '2', title: 'Fill Application', desc: 'Enter loan amount, personal & income details.' },
    { num: '3', title: 'Upload KYC', desc: 'Attach PAN, Aadhaar, and bank statements.' },
    { num: '4', title: 'Instant Assessment', desc: 'Automated rule engine checks FOIR & limits.' },
    { num: '5', title: 'Credit Verification', desc: 'Underwriting team verifies details.' },
    { num: '6', title: 'Sanction & Agreement', desc: 'Download official approval & sign agreement.' },
    { num: '7', title: 'Disbursement & UPI', desc: 'Direct bank transfer & easy UPI EMI payments.' },
  ];

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-sky-800 uppercase tracking-wider bg-sky-100 px-3 py-1 rounded-full">
            Transparent Workflow
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3">7-Step Application to Disbursement</h2>
          <p className="text-sm text-slate-600 mt-2">
            Clear, paperless, and compliant digital lending journey designed for speed and safety.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => (
            <div key={st.num} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center">
                {st.num}
              </div>
              <h3 className="font-bold text-slate-900 text-base">{st.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

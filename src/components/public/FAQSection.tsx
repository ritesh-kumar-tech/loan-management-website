import React, { useState } from 'react';
import { ArrowRight, ChevronDown, HelpCircle, Mail } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      category: 'Loan Application',
      q: 'How long does loan application processing and approval take?',
      a: 'Once your application and required KYC documents are submitted online, eligibility is assessed through policy rules. Final credit verification and sanction terms depend on document checks and internal lending policies.',
    },
    {
      category: 'Documents',
      q: 'What basic documents are required to apply for a Personal or Business Loan?',
      a: 'Primary documents generally include PAN, Aadhaar or approved identity proof, income documents, and bank statements. Product-specific documents may be requested during verification.',
    },
    {
      category: 'Payments',
      q: 'How does the Custom UPI EMI payment verification work?',
      a: 'You can transfer EMI payments to the official company UPI VPA displayed in the payment portal, then submit the UTR/reference number for verification by the accounts desk.',
    },
    {
      category: 'Interest and EMI',
      q: 'Are there any upfront registration or cash fees?',
      a: 'No upfront cash fees are charged. Applicable processing fees are disclosed in the sanction terms and are handled according to the approved loan agreement.',
    },
    {
      category: 'Approval',
      q: 'Can I repay or foreclose my loan early?',
      a: 'Borrowers can request partial repayment or foreclosure according to applicable fair-practice guidelines and the terms in the active loan agreement.',
    },
    {
      category: 'Security',
      q: 'How is my document and application data handled?',
      a: 'Sensitive information is handled through controlled application, document verification, and receipt workflows. Full Aadhaar numbers should not be displayed publicly.',
    },
  ];

  return (
    <section className="df-section bg-white border-b border-blue-100">
      <div className="df-container grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-28">
          <span className="df-eyebrow">Frequently Asked Questions</span>
          <h2 className="df-heading mt-4">Answers before you apply</h2>
          <p className="df-copy mt-4">Browse common questions about applications, documents, EMI, approvals, payments, and security.</p>
          <div className="mt-8 rounded-[24px] bg-[#071B3D] text-white p-6">
            <HelpCircle className="w-8 h-8 text-sky-300 mb-4" />
            <h3 className="text-xl font-black">Need more help?</h3>
            <p className="text-sm text-blue-100 mt-2 leading-relaxed">Contact support for application, receipt, payment, or document verification questions.</p>
            <button className="df-btn bg-white text-blue-800 mt-5">Contact Support <Mail className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {faqs.map((faq, idx) => (
            <article key={`${faq.category}-${idx}`} className="df-card overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full min-h-16 p-5 sm:p-6 text-left font-extrabold text-slate-950 text-base flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-50/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                aria-expanded={openIdx === idx}
              >
                <span>
                  <span className="block text-xs text-blue-700 uppercase mb-1">{faq.category}</span>
                  {faq.q}
                </span>
                <ChevronDown className={`w-5 h-5 text-blue-700 transition-transform shrink-0 ${openIdx === idx ? 'rotate-180' : ''}`} />
              </button>
              {openIdx === idx && (
                <div className="px-5 sm:px-6 pb-6 text-[15px] text-slate-600 leading-relaxed border-t border-blue-100 pt-4">
                  {faq.a}
                  <button className="mt-4 text-blue-700 font-extrabold inline-flex items-center gap-2 text-sm">Learn more <ArrowRight className="w-4 h-4" /></button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};


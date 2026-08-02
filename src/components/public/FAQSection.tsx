import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How long does loan application processing and approval take?',
      a: 'Once your application and required KYC documents are submitted online, our automated credit rule engine assesses eligibility instantly. Final credit verification and sanction letter generation are typically completed within 24 to 48 business hours.',
    },
    {
      q: 'What basic documents are required to apply for a Personal or Business Loan?',
      a: 'Primary required documents include: (1) PAN Card copy, (2) Aadhaar Card or Passport identity proof, (3) Last 3 months salary slips or ITR returns, and (4) Last 6 months bank account statements.',
    },
    {
      q: 'How does the Custom UPI EMI payment verification work?',
      a: 'You can transfer your monthly EMI directly to our official company UPI VPA displayed on the payment portal. After completing the transfer in your UPI app, enter the 12-digit UTR/Reference number. Our accounts desk verifies the UTR against bank records and generates an official receipt.',
    },
    {
      q: 'Are there any upfront registration or cash fees?',
      a: 'No! Dhani Finance does not charge any upfront cash fees or registration deposits. Processing fees are deducted transparently from the sanctioned loan amount upon disbursement as detailed in your Sanction Letter.',
    },
    {
      q: 'Can I repay or foreclose my loan early?',
      a: 'Yes, borrowers can make partial repayments or foreclose their active loan account at any time in accordance with RBI fair practices guidelines.',
    },
  ];

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
            Help & Knowledge Desk
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-5 text-left font-bold text-slate-900 text-sm flex items-center justify-between gap-4 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} />
              </button>
              {openIdx === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

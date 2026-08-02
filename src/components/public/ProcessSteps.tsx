import React from 'react';

interface ProcessStepsProps {
  onStartApplication?: () => void;
}

export const ProcessSteps: React.FC<ProcessStepsProps> = ({ onStartApplication }) => {
  const steps = [
    { num: '1', title: 'Create Account', desc: 'Create your secure customer profile.' },
    { num: '2', title: 'Complete Application', desc: 'Enter loan, personal, income, and bank details.' },
    { num: '3', title: 'Upload Documents', desc: 'Attach required KYC, income, and bank proofs.' },
    { num: '4', title: 'Eligibility Assessment', desc: 'Policy rules review income, amount, tenure, and obligations.' },
    { num: '5', title: 'Document Verification', desc: 'Verifier team checks submitted documents.' },
    { num: '6', title: 'Approval and Agreement', desc: 'Approved applicants receive final terms and agreement.' },
    { num: '7', title: 'Repayment Setup', desc: 'Repayment schedule and payment instructions are configured.' },
  ];

  return (
    <section className="df-section bg-white border-b border-blue-100">
      <div className="df-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="df-eyebrow">
            Transparent Workflow
          </span>
          <h2 className="df-heading mt-4">7-Step Application Journey</h2>
          <p className="df-copy mt-3">
            A connected digital process designed for clarity from registration through repayment setup.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute left-16 right-16 top-12 h-1 bg-blue-100 rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-5">
            {steps.map((st) => (
              <article key={st.num} className="relative bg-[#F6FAFF] p-6 rounded-[20px] border border-blue-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all min-h-[190px]">
                <div className="w-14 h-14 rounded-full bg-blue-700 text-white font-extrabold text-base flex items-center justify-center shadow-lg shadow-blue-200 mb-5 relative z-10">
                  {st.num}
                </div>
                <h3 className="font-extrabold text-slate-950 text-base leading-snug">{st.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">{st.desc}</p>
              </article>
            ))}
          </div>
        </div>
        {onStartApplication && (
          <div className="mt-10 text-center">
            <button onClick={onStartApplication} className="df-btn df-btn-primary mx-auto">Start Your Application</button>
          </div>
        )}
      </div>
    </section>
  );
};


import React from 'react';
import { CompanySettings } from '../../types';
import { ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

interface PolicyPagesProps {
  type: 'privacy' | 'terms' | 'fair' | 'grievance' | 'lending' | 'refund';
  settings: CompanySettings;
}

export const PolicyPages: React.FC<PolicyPagesProps> = ({ type, settings }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-fade-in">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Regulatory Compliance Document
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {type === 'privacy' && 'Privacy Policy'}
          {type === 'terms' && 'Terms and Conditions'}
          {type === 'fair' && 'Fair Practices Code'}
          {type === 'grievance' && 'Grievance Redressal Mechanism'}
          {type === 'lending' && 'Responsible Lending Policy'}
          {type === 'refund' && 'Refund & Cancellation Policy'}
        </h1>
        <p className="text-xs text-slate-500 mt-2">
          Effective Date: January 1, 2026 | Last Updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 space-y-6">
        {type === 'privacy' && (
          <>
            <p>
              At <strong>{settings.companyName}</strong>, protecting your financial privacy is our highest priority. This Privacy Policy governs the collection, processing, storage, and security of personal and financial information collected through our website, mobile application, and digital lending channels.
            </p>

            <h3 className="text-base font-bold text-slate-900">1. Information We Collect</h3>
            <p>
              We collect identity information (PAN, Aadhaar), employment details, monthly income statements, bank account statements, contact details, and device information purely for credit risk modeling, KYC verification, and anti-money laundering (AML) compliance as mandated by the Reserve Bank of India (RBI).
            </p>

            <h3 className="text-base font-bold text-slate-900">2. Data Security & Encryption</h3>
            <p>
              All customer data is encrypted in transit using 256-Bit SSL/TLS standards and stored securely on cloud servers located within India. We strictly do not sell, rent, or lease your personal information to third-party telemarketers.
            </p>
          </>
        )}

        {type === 'terms' && (
          <>
            <p>
              By accessing or using the digital loan application services provided by <strong>{settings.companyName}</strong> ({settings.registrationNumber}), you agree to be bound by these Terms and Conditions.
            </p>

            <h3 className="text-base font-bold text-slate-900">1. Loan Approval & Discretion</h3>
            <p>
              Loan approval, sanctioned interest rate, tenure, and credit limits are subject to document verification, internal credit policy guidelines, and authorization by our credit committee. Submission of an online application does not guarantee automatic loan disbursement.
            </p>

            <h3 className="text-base font-bold text-slate-900">2. Repayment Obligations</h3>
            <p>
              Borrowers are legally obligated to pay monthly Equated Monthly Installments (EMIs) on or before the designated due date specified in their loan schedule. Overdue payments shall attract default interest charges as detailed in the Loan Agreement.
            </p>
          </>
        )}

        {type === 'grievance' && (
          <>
            <p>
              In compliance with RBI Guidelines on Fair Practices Code and Digital Lending, <strong>{settings.companyName}</strong> has established a dedicated Grievance Redressal Mechanism to resolve customer complaints promptly and transparently.
            </p>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-base">Grievance Redressal Officer (GRO) Contact Details</h4>
              <p><strong>Name:</strong> {settings.authorizedSignatoryName}</p>
              <p><strong>Title:</strong> {settings.authorizedSignatoryTitle} & Chief Grievance Officer</p>
              <p><strong>Email:</strong> {settings.supportEmail}</p>
              <p><strong>Helpline:</strong> {settings.supportPhone}</p>
              <p><strong>Registered Address:</strong> {settings.registeredAddress}</p>
            </div>

            <p className="text-xs text-slate-500">
              Complaints received by the Grievance Officer shall be acknowledged within 24 hours and resolved within 15 working days.
            </p>
          </>
        )}

        {type === 'fair' && (
          <>
            <p>
              <strong>{settings.companyName}</strong> adheres strictly to the Reserve Bank of India's Fair Practices Code for Non-Banking Financial Companies (NBFCs).
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>No hidden charges or non-transparent penalty fees.</li>
              <li>Clear Key Fact Statement (KFS) provided before loan agreement execution.</li>
              <li>Respectful recovery practices with zero tolerance for harassment.</li>
            </ul>
          </>
        )}

        {type === 'lending' && (
          <>
            <p>
              Our Responsible Lending Policy ensures that loan products are extended only after thorough affordability assessment to prevent over-indebtedness among borrowers.
            </p>
          </>
        )}

        {type === 'refund' && (
          <>
            <p>
              Processing fees collected during loan sanction are non-refundable once credit appraisal has been executed by our underwriting desk. In case of duplicate UPI transfers, refunds are processed back to the originating bank account within 3-5 business days.
            </p>
          </>
        )}
      </div>
    </div>
  );
};


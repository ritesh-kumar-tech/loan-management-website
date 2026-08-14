import React, { useState } from 'react';
import { api } from '../../services/api';
import { LoanProduct, LoanApplication, PersonalInfo, EmploymentInfo, FinancialInfo, ReferenceInfo, ApplicationDocument, CompanySettings, EligibilityResult } from '../../types';
import { formatINR, formatDate } from '../../utils/calculator';
import { generateApplicationAcknowledgement, generateProvisionalEligibilityLetter } from '../../utils/pdfGenerator';
import { Check, ChevronRight, ChevronLeft, Upload, FileText, AlertCircle, ShieldCheck, Download, Sparkles, Eye, Trash2, RefreshCw, Search, Home } from 'lucide-react';

interface StepWizardProps {
  settings: CompanySettings;
  products: LoanProduct[];
  selectedProductId?: string;
  initialAmount?: number;
  initialTenure?: number;
  userId: string;
  userEmail: string;
  onComplete: (app: LoanApplication) => void;
  onCancel: () => void;
}

export const StepWizard: React.FC<StepWizardProps> = ({
  settings,
  products,
  selectedProductId,
  initialAmount,
  initialTenure,
  userId,
  userEmail,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Requirement
  const [productId, setProductId] = useState(selectedProductId || products[0]?.id || 'prod_personal');
  const [amount, setAmount] = useState(initialAmount || products[0]?.minAmount || 25000);
  const [tenure, setTenure] = useState(initialTenure || 24);
  const [purpose, setPurpose] = useState('');
  const [preferredEmiDay, setPreferredEmiDay] = useState(5);

  // Personal Info
  const [personal, setPersonal] = useState<PersonalInfo>({
    fullName: '',
    fatherOrSpouseName: '',
    dob: '',
    gender: 'male',
    maritalStatus: 'single',
    nationality: 'Indian',
    email: userEmail && userEmail !== 'guest@example.com' ? userEmail : '',
    mobile: '',
    panNumber: '',
    aadhaarLast4: '',
    currentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    pincode: '',
    residenceType: 'owned',
  });

  // Employment Info
  const [employment, setEmployment] = useState<EmploymentInfo>({
    employmentType: 'salaried',
    companyOrBizName: '',
    designationOrBizType: '',
    monthlyIncome: 0,
    workExperienceYears: 0,
    officeAddress: '',
    salaryBankName: '',
  });

  // Financial Info
  const [financial, setFinancial] = useState<FinancialInfo>({
    monthlyIncome: 0,
    additionalIncome: 0,
    existingEmis: 0,
    monthlyExpenses: 0,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    preferredEmiDay: 5,
  });

  // Nominees & References
  const [references, setReferences] = useState<ReferenceInfo[]>([
    { name: '', relationship: '', mobile: '', address: '' },
    { name: '', relationship: '', mobile: '', address: '' },
  ]);

  // Documents
  const [documents, setDocuments] = useState<ApplicationDocument[]>([
  ]);
  const [previewDoc, setPreviewDoc] = useState<ApplicationDocument | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Consents
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [creditCheckConsent, setCreditCheckConsent] = useState(false);

  // Results
  const [submitting, setSubmitting] = useState(false);
  const [createdApplication, setCreatedApplication] = useState<LoanApplication | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpToken, setEmailOtpToken] = useState('');
  const [emailOtpMasked, setEmailOtpMasked] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCooldownUntil, setEmailOtpCooldownUntil] = useState(0);

  const selectedProduct = products.find((p) => p.id === productId) || products[0];
  const requiredDocumentNames = selectedProduct?.requiredDocs?.length ? selectedProduct.requiredDocs : ['PAN Card', 'Aadhaar Card', 'Passport-size Photograph', 'Bank Statement'];
  const applicationSteps = ['Loan', 'Personal', 'Financial', 'Documents', 'Review'];
  const visibleStep = Math.min(currentStep, 5);
  const maskPan = (value: string) => value?.length === 10 ? `${value.slice(0, 5)}****${value.slice(9)}` : value || '-';
  const maskAccount = (value: string) => {
    const clean = String(value || '').replace(/\s/g, '');
    return clean.length > 4 ? `${'*'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}` : clean || '-';
  };
  const fileSize = (url?: string) => url?.startsWith('blob:') ? 'Uploaded file' : 'Ready';
  const formatEmployment = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const validateStep = (step: number): boolean => {
    setStepError(null);
    if (step === 1) {
      if (!amount || amount <= 0) {
        setStepError('Please enter a valid required loan amount.');
        return false;
      }
      if (amount < selectedProduct.minAmount || amount > selectedProduct.maxAmount) {
        setStepError(`Loan amount must be between ${formatINR(selectedProduct.minAmount)} and ${formatINR(selectedProduct.maxAmount)}.`);
        return false;
      }
      if (!tenure || tenure <= 0) {
        setStepError('Please select a preferred tenure.');
        return false;
      }
      if (!purpose.trim()) {
        setStepError('Please enter the purpose of the loan.');
        return false;
      }
    } else if (step === 2) {
      if (!personal.fullName.trim()) {
        setStepError('Please enter your full legal name (as per PAN).');
        return false;
      }
      if (!personal.fatherOrSpouseName.trim()) {
        setStepError("Please enter father's or spouse's name.");
        return false;
      }
      if (!personal.dob.trim()) {
        setStepError('Please select your date of birth.');
        return false;
      }
      if (!personal.panNumber.trim()) {
        setStepError('Please enter your PAN card number.');
        return false;
      }
      const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panPattern.test(personal.panNumber.trim().toUpperCase())) {
        setStepError('Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).');
        return false;
      }
      if (!personal.mobile.trim()) {
        setStepError('Please enter your mobile number.');
        return false;
      }
      const cleanMobile = personal.mobile.trim().replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        setStepError('Please enter a valid 10-digit mobile number.');
        return false;
      }
      if (!personal.email.trim()) {
        setStepError('Please enter your email address.');
        return false;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(personal.email.trim())) {
        setStepError('Please enter a valid email address.');
        return false;
      }
      if (!personal.currentAddress.trim()) {
        setStepError('Please enter your current residential address.');
        return false;
      }
    } else if (step === 3) {
      if (!financial.monthlyIncome || financial.monthlyIncome <= 0) {
        setStepError('Please enter your monthly net salary/income.');
        return false;
      }
      if (financial.existingEmis === undefined || financial.existingEmis === null || isNaN(financial.existingEmis)) {
        setStepError('Please enter your existing monthly loan EMIs (enter 0 if none).');
        return false;
      }
      if (!financial.bankName.trim()) {
        setStepError('Please enter your bank name for disbursement.');
        return false;
      }
      if (!financial.accountNumber.trim()) {
        setStepError('Please enter your bank account number.');
        return false;
      }
      if (!financial.ifscCode.trim()) {
        setStepError('Please enter your bank IFSC code.');
        return false;
      }
      const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscPattern.test(financial.ifscCode.trim().toUpperCase())) {
        setStepError('Please enter a valid 11-character IFSC code (e.g. HDFC0001234).');
        return false;
      }
    } else if (step === 4) {
      const missingDocs = requiredDocumentNames.filter((docName) => !documents.some((doc) => doc.docType === docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')));
      if (missingDocs.length) {
        setStepError(`Please upload all required documents: ${missingDocs.join(', ')}.`);
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setStepError(null);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleEmailChange = (email: string) => {
    setPersonal({ ...personal, email });
    setEmailOtp('');
    setEmailOtpToken('');
    setEmailOtpError(null);
    setEmailOtpSent(false);
  };

  const handleChangeEmail = () => {
    setEmailOtp('');
    setEmailOtpToken('');
    setEmailOtpError(null);
    setEmailOtpSent(false);
    setEmailOtpMasked('');
  };

  const sendEmailOtp = async () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(personal.email.trim())) {
      setEmailOtpError('Please enter a valid email address before sending OTP.');
      return;
    }
    setEmailOtpLoading(true);
    setEmailOtpError(null);
    try {
      const res = await api.sendOtp({ identifier: personal.email.trim(), purpose: 'APPLICATION_EMAIL' });
      if (!res.success) {
        setEmailOtpError(res.error || "We couldn't send the OTP. Please try again.");
        return;
      }
      setEmailOtpSent(true);
      setEmailOtpMasked(res.maskedContact || personal.email);
      setEmailOtpCooldownUntil(Date.now() + (res.cooldownSeconds || 60) * 1000);
    } catch {
      setEmailOtpError("We couldn't send the OTP. Please try again.");
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!/^\d{6}$/.test(emailOtp.trim())) {
      setEmailOtpError('Please enter the 6-digit OTP sent to your email.');
      return;
    }
    setEmailOtpLoading(true);
    setEmailOtpError(null);
    try {
      const res = await api.verifyOtp({ identifier: personal.email.trim(), purpose: 'APPLICATION_EMAIL', otp: emailOtp.trim() });
      if (!res.success || !res.verificationToken) {
        setEmailOtpError(res.error || 'The OTP is incorrect or has expired.');
        return;
      }
      setEmailOtpToken(res.verificationToken);
      setEmailOtpError(null);
    } catch {
      setEmailOtpError('The OTP is incorrect or has expired.');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleDocumentUpload = (docType: string, title: string, file: File) => {
    setUploadError(null);
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(extension)) {
      setUploadError('Only PDF, JPG, JPEG, and PNG files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Each document must be 5 MB or smaller.');
      return;
    }
    const newDoc: ApplicationDocument = {
      id: `doc_${Date.now()}`,
      docType,
      title,
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      status: 'pending',
    };
    setDocuments([...documents.filter((d) => d.docType !== docType), newDoc]);
  };

  const handleRemoveDocument = (docType: string) => {
    const doc = documents.find((d) => d.docType === docType);
    if (!doc) return;
    if (!window.confirm("Remove this document? You'll need to upload it again before submitting.")) return;
    if (doc.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(doc.fileUrl);
    setDocuments(documents.filter((d) => d.docType !== docType));
    if (previewDoc?.docType === docType) setPreviewDoc(null);
  };

  const handleFinalSubmit = async () => {
    const missingDocs = requiredDocumentNames.filter((docName) => !documents.some((doc) => doc.docType === docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')));
    if (missingDocs.length) {
      setCurrentStep(4);
      setUploadError(`Please upload required documents: ${missingDocs.join(', ')}.`);
      return;
    }
    if (!emailOtpToken) {
      setCurrentStep(5);
      setStepError('Please verify your email address before submitting the application.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Run Automated Eligibility Engine
      const elg = await api.assessEligibility({
        productId,
        monthlyIncome: financial.monthlyIncome,
        existingEmis: financial.existingEmis,
        requestedAmount: amount,
        requestedTenureMonths: tenure,
        employmentType: employment.employmentType,
        age: 32,
      });
      setEligibilityResult(elg);

      // 2. Save Application
      const savedApp = await api.saveApplication({
        userId,
        productId,
        productType: selectedProduct.type,
        productTitle: selectedProduct.title,
        requestedAmount: amount,
        requestedTenureMonths: tenure,
        purpose,
        status: 'submitted',
        personalInfo: personal,
        employmentInfo: employment,
        financialInfo: financial,
        references,
        documents,
        eligibilityResult: elg,
        emailVerificationToken: emailOtpToken,
      });

      setCreatedApplication(savedApp);
      setCurrentStep(6); // Success step
    } catch (e) {
      console.error(e);
      setStepError(e instanceof Error ? e.message : 'We could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      {currentStep <= 5 && (
      <div className="mb-8">
        <div className="hidden sm:grid grid-cols-5 gap-2 mb-4">
          {applicationSteps.map((label, idx) => {
            const stepNo = idx + 1;
            const isActive = currentStep === stepNo;
            const isDone = currentStep > stepNo;
            return (
              <div key={label} className={`rounded-xl border px-3 py-2 text-xs font-extrabold text-center ${
                isActive ? 'bg-blue-700 text-white border-blue-700' : isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'
              }`}>
                {isDone ? '✓ ' : `${stepNo}. `}{label}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Step {visibleStep} of 5: {applicationSteps[visibleStep - 1]}</span>
          <span>{Math.round((visibleStep / 5) * 100)}% Completed</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-700 transition-all duration-300"
            style={{ width: `${(visibleStep / 5) * 100}%` }}
          />
        </div>
      </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {stepError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        {/* STEP 1: Loan Requirement */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl font-extrabold text-slate-900">Step 1: Loan Requirement</h2>
              <p className="text-sm text-slate-500 mt-1">Tell us about the loan you need.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Loan Type *
                </label>
                <select
                  required
                  value={productId}
                  onChange={(e) => {
                    const nextProduct = products.find((p) => p.id === e.target.value);
                    setProductId(e.target.value);
                    if (nextProduct) {
                      setAmount(Math.min(nextProduct.maxAmount, Math.max(nextProduct.minAmount, amount)));
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Employment Type *
                </label>
                <select
                  required
                  value={employment.employmentType}
                  onChange={(e) => setEmployment({ ...employment, employmentType: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                >
                  <option value="salaried">Salaried Employee</option>
                  <option value="self_employed_pro">Self Employed</option>
                  <option value="self_employed_biz">Business Owner</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Required Loan Amount *
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>{formatINR(selectedProduct.minAmount)}</span>
                  <span className="text-blue-700">{formatINR(amount)}</span>
                  <span>{formatINR(selectedProduct.maxAmount)}</span>
                </div>
                <input
                  type="range"
                  min={selectedProduct.minAmount}
                  max={selectedProduct.maxAmount}
                  step={10000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full mt-2 accent-blue-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Preferred Tenure *
                </label>
                <select
                  required
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                >
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                  <option value={36}>36 Months (3 Years)</option>
                  <option value={48}>48 Months (4 Years)</option>
                  <option value={60}>60 Months (5 Years)</option>
                  <option value={120}>120 Months (10 Years)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Purpose of Loan *
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Home renovation, business stock, education"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Personal Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl font-extrabold text-slate-900">Step 2: Personal Information</h2>
              <p className="text-sm text-slate-500 mt-1">Tell us about yourself and verify your email.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name (as per PAN) *</label>
                <input
                  type="text"
                  required
                  value={personal.fullName}
                  onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Father's or Spouse's Name *</label>
                <input
                  type="text"
                  required
                  value={personal.fatherOrSpouseName}
                  onChange={(e) => setPersonal({ ...personal, fatherOrSpouseName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={personal.dob}
                  onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PAN Card Number *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={personal.panNumber}
                  onChange={(e) => setPersonal({ ...personal, panNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={personal.mobile}
                  onChange={(e) => setPersonal({ ...personal, mobile: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={personal.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={Boolean(emailOtpToken)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm disabled:bg-emerald-50 disabled:border-emerald-200"
                  />
                  {emailOtpToken && (
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap"
                    >
                      Change
                    </button>
                  )}
                </div>
                <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">Email OTP Verification *</span>
                      <span className="text-slate-500">
                        {emailOtpToken ? `${personal.email} verified.` : emailOtpSent ? `Verification code sent to ${emailOtpMasked || personal.email}` : 'Verify this email before final submission.'}
                      </span>
                    </div>
                    {!emailOtpToken && (
                      <button
                        type="button"
                        onClick={sendEmailOtp}
                        disabled={emailOtpLoading || (emailOtpCooldownUntil > Date.now() && !emailOtpToken)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {emailOtpLoading ? 'Sending...' : emailOtpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                  {emailOtpSent && !emailOtpToken && (
                    <div className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit OTP"
                          className="flex-1 px-3 py-2 rounded-lg border border-blue-100 bg-white text-sm font-bold tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={verifyEmailOtp}
                          disabled={emailOtpLoading}
                          className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {emailOtpLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>
                      <p className="text-[11px] font-semibold text-blue-800">Demo OTP: 123456</p>
                    </div>
                  )}
                  {emailOtpToken && (
                    <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Email verified
                    </div>
                  )}
                  {emailOtpError && <div className="text-xs font-semibold text-rose-700">{emailOtpError}</div>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Residential Address *</label>
              <textarea
                rows={2}
                required
                value={personal.currentAddress}
                onChange={(e) => setPersonal({ ...personal, currentAddress: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Financial Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl font-extrabold text-slate-900">Step 3: Income & Banking Details</h2>
              <p className="text-sm text-slate-500 mt-1">Tell us about your income and account for loan processing.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Net Salary / Income (₹) *</label>
                <input
                  type="number"
                  required
                  value={financial.monthlyIncome || ''}
                  placeholder="e.g. 50000"
                  onChange={(e) => setFinancial({ ...financial, monthlyIncome: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Existing Monthly Loan EMIs (₹) *</label>
                <input
                  type="number"
                  required
                  value={financial.existingEmis !== undefined && financial.existingEmis !== null ? financial.existingEmis : ''}
                  placeholder="e.g. 0 or existing monthly EMI"
                  onChange={(e) => setFinancial({ ...financial, existingEmis: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name for Disbursement *</label>
                <input
                  type="text"
                  required
                  value={financial.bankName}
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  onChange={(e) => setFinancial({ ...financial, bankName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Account Number *</label>
                <input
                  type="text"
                  required
                  value={financial.accountNumber}
                  placeholder="Enter bank account number"
                  onChange={(e) => setFinancial({ ...financial, accountNumber: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code *</label>
                <input
                  type="text"
                  required
                  value={financial.ifscCode}
                  placeholder="e.g. HDFC0000123"
                  onChange={(e) => setFinancial({ ...financial, ifscCode: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm uppercase font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Document Upload */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl font-extrabold text-slate-900">Step 4: Upload KYC & Income Documents</h2>
              <p className="text-sm text-slate-500 mt-1">Upload PDF, JPG, JPEG, or PNG files. Maximum 5 MB per document.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requiredDocumentNames.map((docName) => {
                const docItem = { type: docName.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: `${docName} *` };
                const uploaded = documents.find((d) => d.docType === docItem.type);
                return (
                  <div key={docItem.type} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">{docItem.label}</span>
                    {uploaded ? (
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs truncate block" title={uploaded.fileName}>{uploaded.fileName}</span>
                            <span className="text-[10px] text-slate-500">{fileSize(uploaded.fileUrl)}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase shrink-0">Uploaded</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(uploaded)}
                            className="min-h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <label className="min-h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer">
                            <RefreshCw className="w-3.5 h-3.5" /> Replace
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              onChange={(e) => {
                                if (e.target.files?.[0] && window.confirm(`Replace ${docName}?`)) {
                                  handleDocumentUpload(docItem.type, docItem.label, e.target.files[0]);
                                }
                                e.currentTarget.value = '';
                              }}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(docItem.type)}
                            className="min-h-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="block p-3 rounded-lg border border-dashed border-slate-300 bg-white text-center cursor-pointer hover:bg-slate-100 transition-colors">
                        <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                        <span className="text-xs text-slate-600 font-medium block">Select File (PDF / JPG)</span>
                        <span className="text-[10px] text-slate-400 block mt-1">Max 5 MB. Unsafe executable files are blocked.</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleDocumentUpload(docItem.type, docItem.label, e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {uploadError}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review & Declarations */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Step 5: Final Review & Declarations
            </h2>

            <div className="space-y-4">
              <ReviewSection title="Loan Details" onEdit={() => setCurrentStep(1)}>
                <ReviewRow label="Loan Type" value={selectedProduct.title} />
                <ReviewRow label="Requested Amount" value={formatINR(amount)} />
                <ReviewRow label="Tenure" value={`${tenure} Months`} />
                <ReviewRow label="Purpose" value={purpose} />
                <ReviewRow label="Employment Type" value={formatEmployment(employment.employmentType)} />
              </ReviewSection>

              <ReviewSection title="Personal Information" onEdit={() => setCurrentStep(2)}>
                <ReviewRow label="Applicant Name" value={personal.fullName} />
                <ReviewRow label="Father / Spouse" value={personal.fatherOrSpouseName} />
                <ReviewRow label="Date of Birth" value={personal.dob ? formatDate(personal.dob) : '-'} />
                <ReviewRow label="PAN" value={maskPan(personal.panNumber)} />
                <ReviewRow label="Mobile" value={`+91 ${personal.mobile}`} />
                <ReviewRow label="Email" value={`${personal.email} ${emailOtpToken ? '✓ Verified' : 'Pending'}`} valueClass={emailOtpToken ? 'text-emerald-700' : 'text-rose-700'} />
                <ReviewRow label="Address" value={personal.currentAddress} />
              </ReviewSection>

              <ReviewSection title="Financial Details" onEdit={() => setCurrentStep(3)}>
                <ReviewRow label="Monthly Income" value={formatINR(financial.monthlyIncome)} />
                <ReviewRow label="Existing EMI" value={formatINR(financial.existingEmis || 0)} />
                <ReviewRow label="Bank Name" value={financial.bankName} />
                <ReviewRow label="Bank Account" value={maskAccount(financial.accountNumber)} />
                <ReviewRow label="IFSC" value={financial.ifscCode} />
              </ReviewSection>

              <ReviewSection title="Documents" onEdit={() => setCurrentStep(4)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {requiredDocumentNames.map((docName) => {
                    const docType = docName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                    const uploaded = documents.find((doc) => doc.docType === docType);
                    return (
                      <div key={docType} className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-900">{docName}</span>
                          <span className={`block text-[11px] font-semibold ${uploaded ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {uploaded ? '✓ Uploaded' : 'Missing'}
                          </span>
                        </div>
                        {uploaded && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(uploaded)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700 cursor-pointer"
                          >
                            View
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ReviewSection>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-slate-900 accent-blue-700"
                />
                <span>I confirm that all information provided is accurate and true to the best of my knowledge. I agree to the <span className="font-bold text-blue-700 underline">Terms & Conditions</span> and <span className="font-bold text-blue-700 underline">Privacy Policy</span> of {settings.companyName}. *</span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={creditCheckConsent}
                  onChange={(e) => setCreditCheckConsent(e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-slate-900 accent-blue-700"
                />
                <span>I authorize {settings.companyName} and its partner credit bureaus to fetch my credit information report for loan eligibility assessment. *</span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 6: Success Acknowledgement */}
        {currentStep === 6 && createdApplication && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Application Submitted Successfully</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Your application has been received. Please save this Application ID for future tracking.
            </p>
            <div className="max-w-md mx-auto rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Application ID</span>
              <div className="mt-1 text-2xl font-black text-slate-950 font-mono">{createdApplication.id}</div>
              <p className="text-xs text-slate-600 mt-2">We'll send application updates to your registered email address.</p>
            </div>

            {/* Instant Rule Assessment Card */}
            {eligibilityResult && (
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-left max-w-lg mx-auto space-y-2">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Instant Automated Credit Assessment
                </div>
                <div className="text-lg font-bold text-slate-900">
                  Status: {eligibilityResult.status.toUpperCase().replace('_', ' ')}
                </div>
                <p className="text-xs text-slate-600">
                  Max Eligible Limit: <strong className="text-slate-900">{formatINR(eligibilityResult.maxEligibleAmount)}</strong> at {eligibilityResult.recommendedInterestRate}% p.a.
                </p>
                <p className="text-[11px] text-slate-500">
                  Calculated FOIR: {eligibilityResult.foirPercent}% (Threshold: 55%)
                </p>
              </div>
            )}

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => generateApplicationAcknowledgement(createdApplication, settings)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Acknowledgement PDF
              </button>
              {eligibilityResult && (
                <button
                  onClick={() => generateProvisionalEligibilityLetter(createdApplication, settings)}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download Eligibility Letter
                </button>
              )}
              <button
                onClick={() => onComplete(createdApplication)}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2"
              >
                <Search className="w-4 h-4" /> Track Application
              </button>
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer inline-flex items-center gap-2"
              >
                <Home className="w-4 h-4" /> Back to Home
              </button>
            </div>
          </div>
        )}

        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-sm truncate">{previewDoc.title.replace(/\s\*$/, '')}</h3>
                  <p className="text-xs text-slate-500 truncate">{previewDoc.fileName}</p>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold cursor-pointer">Close</button>
              </div>
              <div className="p-4 bg-slate-50 max-h-[75vh] overflow-auto">
                {(previewDoc.fileUrl.match(/\.(png|jpe?g|webp|gif)$/i) || (previewDoc.fileUrl.startsWith('blob:') && previewDoc.fileName.match(/\.(png|jpe?g)$/i))) ? (
                  <img src={previewDoc.fileUrl} alt={previewDoc.title} className="max-h-[70vh] mx-auto rounded-xl border border-slate-200 bg-white object-contain" />
                ) : (
                  <iframe title={previewDoc.title} src={previewDoc.fileUrl} className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        {currentStep < 6 && (
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                setStepError(null);
                if (currentStep > 1) setCurrentStep(currentStep - 1);
                else onCancel();
              }}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                Save & Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={submitting || !termsAccepted || !creditCheckConsent || !emailOtpToken}
                className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                {submitting ? 'Submitting Application...' : 'Submit Loan Application'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ReviewSection: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({ title, onEdit, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      <button
        type="button"
        onClick={onEdit}
        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-blue-700 cursor-pointer"
      >
        Edit
      </button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">{children}</div>
  </section>
);

const ReviewRow: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass }) => (
  <div className="flex items-start justify-between gap-3 text-xs border-b border-slate-200/70 pb-2 last:border-0">
    <span className="text-slate-500">{label}</span>
    <strong className={`text-right text-slate-900 break-words ${valueClass || ''}`}>{value || '-'}</strong>
  </div>
);

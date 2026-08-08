import React, { useState } from 'react';
import { api } from '../../services/api';
import { LoanProduct, LoanApplication, PersonalInfo, EmploymentInfo, FinancialInfo, ReferenceInfo, ApplicationDocument, CompanySettings, EligibilityResult } from '../../types';
import { formatINR, formatDate } from '../../utils/calculator';
import { generateApplicationAcknowledgement, generateProvisionalEligibilityLetter } from '../../utils/pdfGenerator';
import { Check, ChevronRight, ChevronLeft, Upload, FileText, AlertCircle, ShieldCheck, Download, Sparkles, UserCheck, Building2, Wallet } from 'lucide-react';

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Consents
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [creditCheckConsent, setCreditCheckConsent] = useState(false);

  // Results
  const [submitting, setSubmitting] = useState(false);
  const [createdApplication, setCreatedApplication] = useState<LoanApplication | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);

  const selectedProduct = products.find((p) => p.id === productId) || products[0];
  const requiredDocumentNames = selectedProduct?.requiredDocs?.length ? selectedProduct.requiredDocs : ['PAN Card', 'Aadhaar Card', 'Passport-size Photograph', 'Bank Statement'];

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
      if (personal.panNumber.trim().length !== 10) {
        setStepError('PAN card number must be exactly 10 characters.');
        return false;
      }
      if (!personal.mobile.trim()) {
        setStepError('Please enter your mobile number.');
        return false;
      }
      if (!personal.email.trim()) {
        setStepError('Please enter your email address.');
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

  const handleFinalSubmit = async () => {
    const missingDocs = requiredDocumentNames.filter((docName) => !documents.some((doc) => doc.docType === docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')));
    if (missingDocs.length) {
      setCurrentStep(4);
      setUploadError(`Please upload required documents: ${missingDocs.join(', ')}.`);
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
      });

      setCreatedApplication(savedApp);
      setCurrentStep(6); // Success step
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    'Loan Terms',
    'Personal Info',
    'Financials',
    'Upload Docs',
    'Review',
    'Acknowledgement',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Step {currentStep} of 6: {steps[currentStep - 1]}</span>
          <span>{Math.round((currentStep / 6) * 100)}% Completed</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-700 transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>
      </div>

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
            <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Step 1: Select Loan Requirement
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  Required Loan Amount * ({formatINR(amount)})
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
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
                  Preferred Tenure ({tenure} Months)
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
            <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Step 2: Applicant Personal Information
            </h2>

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
                <input
                  type="email"
                  required
                  value={personal.email}
                  onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
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
            <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Step 3: Income & Banking Details
            </h2>

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
            <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Step 4: Upload KYC & Income Documents
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requiredDocumentNames.map((docName) => {
                const docItem = { type: docName.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: `${docName} *` };
                const uploaded = documents.find((d) => d.docType === docItem.type);
                return (
                  <div key={docItem.type} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">{docItem.label}</span>
                    {uploaded ? (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                        <span className="font-semibold truncate">{uploaded.fileName}</span>
                        <span className="font-bold uppercase">Uploaded</span>
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

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Loan Product</span>
                <strong className="text-slate-900">{selectedProduct.title}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Requested Amount</span>
                <strong className="text-slate-900">{formatINR(amount)}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Tenure</span>
                <strong className="text-slate-900">{tenure} Months</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Applicant Name</span>
                <strong className="text-slate-900">{personal.fullName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PAN / Mobile</span>
                <strong className="text-slate-900">{personal.panNumber} / {personal.mobile}</strong>
              </div>
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
                <span>I confirm that all information provided is accurate and true to the best of my knowledge. I agree to the Terms & Conditions and Privacy Policy of Dhani Finance. *</span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={creditCheckConsent}
                  onChange={(e) => setCreditCheckConsent(e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-slate-900 accent-blue-700"
                />
                <span>I authorize Dhani Finance and its partner credit bureaus to fetch my credit information report for loan eligibility assessment. *</span>
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
            <h2 className="text-2xl font-extrabold text-slate-900">Loan Application Submitted!</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Your application has been logged into our system with ID <strong className="font-mono text-slate-900">{createdApplication.id}</strong>.
            </p>

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
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Go to My Dashboard
              </button>
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
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={submitting || !termsAccepted || !creditCheckConsent}
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



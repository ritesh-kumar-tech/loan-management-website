export type UserRole = 'customer' | 'admin' | 'verifier' | 'accountant' | 'manager';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export type LoanType = 
  | 'personal'
  | 'business'
  | 'home'
  | 'education'
  | 'vehicle'
  | 'lap'
  | 'gold';

export interface LoanProduct {
  id: string;
  type: LoanType;
  title: string;
  tagline: string;
  description?: string;
  iconName?: string;
  minAmount: number;
  maxAmount: number;
  minInterestRate?: number; // percentage p.a.
  maxInterestRate?: number;
  minRate?: number;
  maxRate?: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  processingFeePercent: number;
  minIncome?: number;
  minAge?: number;
  maxAge?: number;
  maxFoirPercent?: number;
  requiredDocs?: string[];
  requiredDocuments?: string[];
  features?: string[];
  eligibility?: {
    minIncome: number;
    minAge: number;
    maxAge: number;
    employmentTypes?: string[];
  };
  isActive: boolean;
  isFeatured?: boolean;
}

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'documents_pending'
  | 'additional_information_required'
  | 'documents_under_verification'
  | 'documents_verified'
  | 'documents_rejected'
  | 'processing_fee_pending'
  | 'processing_fee_submitted'
  | 'payment_under_verification'
  | 'payment_verified'
  | 'payment_rejected'
  | 'eligibility_review'
  | 'under_review'
  | 'verification_in_progress'
  | 'eligibility_passed'
  | 'conditionally_approved'
  | 'approved'
  | 'rejected'
  | 'agreement_pending'
  | 'agreement_signed'
  | 'disbursement_pending'
  | 'loan_disbursed'
  | 'active'
  | 'completed'
  | 'closed'
  | 'cancelled';

export interface PersonalInfo {
  fullName: string;
  fatherOrSpouseName: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  maritalStatus: 'single' | 'married' | 'other';
  nationality: string;
  email: string;
  mobile: string;
  altMobile?: string;
  panNumber: string;
  aadhaarLast4: string;
  currentAddress: string;
  permanentAddress: string;
  city: string;
  state: string;
  pincode: string;
  residenceType: 'owned' | 'rented' | 'parental';
}

export interface EmploymentInfo {
  employmentType: 'salaried' | 'self_employed_pro' | 'self_employed_biz' | 'freelancer';
  companyOrBizName: string;
  designationOrBizType: string;
  monthlyIncome: number;
  workExperienceYears: number;
  officeAddress: string;
  salaryBankName?: string;
  gstNumber?: string;
}

export interface FinancialInfo {
  monthlyIncome: number;
  additionalIncome: number;
  existingEmis: number;
  monthlyExpenses: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  preferredEmiDay: number;
}

export interface ReferenceInfo {
  name: string;
  relationship: string;
  mobile: string;
  address: string;
}

export interface ApplicationDocument {
  id: string;
  docType: string;
  title: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected' | 'reupload_required';
  rejectionNote?: string;
}

export interface EligibilityResult {
  status: 'eligible' | 'conditionally_eligible' | 'review_required' | 'not_eligible';
  maxEligibleAmount: number;
  recommendedInterestRate: number;
  maxEligibleTenure: number;
  estimatedEmi: number;
  foirPercent: number;
  netDisposableIncome: number;
  reasonCodes: string[];
  reasons: string[];
  assessedAt: string;
}

export interface LoanApplication {
  id: string; // LN-2026-XXXXXX
  userId: string;
  productId: string;
  productType: LoanType;
  productTitle: string;
  requestedAmount: number;
  requestedTenureMonths: number;
  purpose: string;
  status: ApplicationStatus;
  statusHistory: { status: ApplicationStatus; date: string; note?: string; updatedBy?: string }[];
  personalInfo: PersonalInfo;
  employmentInfo: EmploymentInfo;
  financialInfo: FinancialInfo;
  nominee?: ReferenceInfo;
  references: ReferenceInfo[];
  documents: ApplicationDocument[];
  eligibilityResult?: EligibilityResult;
  internalNotes?: string;
  
  // Approved Loan Terms
  approvedAmount?: number;
  approvedRate?: number;
  approvedTenureMonths?: number;
  processingFee?: number;
  approvedEmi?: number;
  approvalDate?: string;
  rejectionReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Installment {
  installmentNumber: number;
  dueDate: string;
  openingPrincipal: number;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  charges: number;
  closingPrincipal: number;
  status: 'upcoming' | 'due' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
  paidAmount: number;
  paidDate?: string;
  utrRef?: string;
}

export interface LoanAccount {
  accountNumber: string; // LA-2026-XXXXXX
  applicationId: string;
  userId: string;
  customerName: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  startDate: string;
  maturityDate: string;
  processingFee: number;
  outstandingPrincipal: number;
  totalPaid: number;
  totalOverdue: number;
  status: 'active' | 'closed' | 'defaulted' | 'settled';
  schedule: Installment[];
  createdAt: string;
}

export interface PaymentSubmission {
  id: string; // PAY-2026-XXXX
  loanAccountId: string;
  applicationId: string;
  userId: string;
  customerName: string;
  amount: number;
  purpose: 'emi' | 'processing_fee' | 'foreclosure' | 'late_fee';
  installmentNumber?: number;
  upiIdUsed: string;
  utrNumber: string;
  proofScreenshotUrl?: string;
  paymentDate: string;
  submittedAt: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  verificationNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  receiptNumber?: string;
}

export interface Receipt {
  receiptNumber: string; // RCT-2026-XXXXXX
  paymentId: string;
  loanAccountId: string;
  applicationId: string;
  customerName: string;
  amountPaid: number;
  paymentMethod: string;
  utrNumber: string;
  paymentDate: string;
  verificationDate: string;
  remainingBalance: number;
  nextDueDate: string;
  qrVerificationCode: string;
}

export interface SupportTicket {
  id: string; // TKT-XXXX
  userId: string;
  customerName: string;
  category: string;
  subject: string;
  description: string;
  applicationId?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  messages: { sender: 'customer' | 'support' | 'system'; text: string; date: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  registeredAddress: string;
  branchAddress: string;
  upiId: string;
  upiAccountName: string;
  upiQrCodeUrl: string;
  authorizedSignatoryName: string;
  authorizedSignatoryTitle: string;
  signatureUrl: string;
  stampUrl: string;
  registrationNumber: string;
  nbfcLicenseInfo: string;
  gstNumber: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  deepBlue?: string;
  navyBlue?: string;
  lightBlue?: string;
  backgroundColor?: string;
  borderRadius?: string;
  animationsEnabled?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
}

export interface CustomerAccount extends User {
  kycStatus: 'pending' | 'verified' | 'rejected';
  accountStatus: 'active' | 'suspended' | 'under_review';
  totalApplications: number;
  activeLoans: number;
  outstandingAmount: number;
  assignedStaff?: string;
  panNumber?: string;
  aadhaarLast4?: string;
  address?: string;
  city?: string;
  state?: string;
}

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'loan_manager' | 'application_reviewer' | 'document_verifier' | 'accountant' | 'support_agent';
  department: string;
  status: 'active' | 'suspended';
  lastLogin: string;
  permissions: string[];
}

export interface CmsFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface CmsTestimonial {
  id: string;
  name: string;
  firstName?: string;
  loanType: string;
  rating: number;
  comment: string;
  city: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface CmsHeroSlide {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTab?: string;
  imageUrl: string;
  alt: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CmsPromoSlide {
  id: string;
  productId?: string;
  title: string;
  description: string;
  startingRate: number;
  maxTenureMonths: number;
  ctaLabel: string;
  imageUrl: string;
  alt: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CmsDocumentItem {
  id: string;
  name: string;
  iconName: string;
  description: string;
  formats: string;
  isRequired: boolean;
  productTypes?: string[];
  displayOrder: number;
  isActive: boolean;
}

export interface CmsTrustItem {
  id: string;
  iconName: string;
  title: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CmsWhyChooseItem {
  id: string;
  iconName: string;
  title: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CmsStatistic {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  iconName: string;
  isActive: boolean;
}

export interface CmsContent {
  heroTitle: string;
  heroTagline: string;
  heroSubtitle: string;
  heroStartingRate?: number;
  heroAmountRange?: string;
  heroTenure?: string;
  heroSlides?: CmsHeroSlide[];
  promotionalSlides?: CmsPromoSlide[];
  documentItems?: CmsDocumentItem[];
  trustItems?: CmsTrustItem[];
  whyChooseTitle?: string;
  whyChooseDescription?: string;
  whyChooseItems?: CmsWhyChooseItem[];
  statistics?: CmsStatistic[];
  interestRateDisclaimer?: string;
  announcementBanner: string;
  faqs: CmsFaqItem[];
  testimonials: CmsTestimonial[];
  termsAndConditions: string;
  privacyPolicy: string;
  fairPracticesCode: string;
  grievanceRedressal: string;
}

export interface EligibilityRule {
  id: string;
  productType: LoanType | 'all';
  ruleName: string;
  field: string;
  operator: 'gte' | 'lte' | 'eq' | 'neq';
  value: number | string;
  weight: number;
  customerMessage: string;
  isActive: boolean;
}

import { ApplicationStatus } from '../types';

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; tone: string }[] = [
  { value: 'draft', label: 'Draft', tone: 'gray' },
  { value: 'submitted', label: 'Submitted', tone: 'blue' },
  { value: 'under_review', label: 'Under Review', tone: 'indigo' },
  { value: 'documents_pending', label: 'Documents Pending', tone: 'orange' },
  { value: 'additional_information_required', label: 'Additional Information Required', tone: 'orange' },
  { value: 'documents_under_verification', label: 'Documents Under Verification', tone: 'purple' },
  { value: 'documents_verified', label: 'Documents Verified', tone: 'green' },
  { value: 'documents_rejected', label: 'Documents Rejected', tone: 'red' },
  { value: 'processing_fee_pending', label: 'Processing Fee Pending', tone: 'orange' },
  { value: 'processing_fee_submitted', label: 'Processing Fee Submitted', tone: 'blue' },
  { value: 'payment_under_verification', label: 'Payment Under Verification', tone: 'purple' },
  { value: 'payment_verified', label: 'Payment Verified', tone: 'green' },
  { value: 'payment_rejected', label: 'Payment Rejected', tone: 'red' },
  { value: 'eligibility_review', label: 'Eligibility Review', tone: 'indigo' },
  { value: 'approved', label: 'Loan Approved', tone: 'green' },
  { value: 'rejected', label: 'Loan Rejected', tone: 'red' },
  { value: 'agreement_pending', label: 'Agreement Pending', tone: 'orange' },
  { value: 'agreement_signed', label: 'Agreement Signed', tone: 'green' },
  { value: 'disbursement_pending', label: 'Disbursement Pending', tone: 'orange' },
  { value: 'loan_disbursed', label: 'Loan Disbursed', tone: 'teal' },
  { value: 'active', label: 'Active', tone: 'green' },
  { value: 'completed', label: 'Completed', tone: 'emerald' },
  { value: 'closed', label: 'Completed', tone: 'emerald' },
  { value: 'cancelled', label: 'Cancelled', tone: 'gray' },
  { value: 'verification_in_progress', label: 'Verification In Progress', tone: 'purple' },
  { value: 'eligibility_passed', label: 'Eligibility Passed', tone: 'green' },
  { value: 'conditionally_approved', label: 'Conditionally Approved', tone: 'green' },
];

export const getStatusMeta = (status?: string) => {
  const found = APPLICATION_STATUSES.find((item) => item.value === status);
  if (found) return found;
  const label = (status || 'unknown')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return { value: status || 'unknown', label, tone: 'gray' };
};

import { jsPDF } from 'jspdf';
import { LoanApplication, LoanAccount, PaymentSubmission, Receipt, CompanySettings } from '../types';
import { calculateEmi, formatINR, formatDate } from './calculator';

const formatPDF_INR = (amount: number) => formatINR(amount || 0).replace('₹', 'Rs. ').replace('â‚¹', 'Rs. ');

function maskAccount(accountNumber?: string) {
  const last4 = String(accountNumber || '').replace(/\D/g, '').slice(-4);
  return last4 ? `XXXXXX${last4}` : 'XXXXXX';
}

function drawDocumentHero(doc: jsPDF, title: string, subtitle: string, y: number) {
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, y - 4, 182, 18, 2, 2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, y - 4, 182, 18, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 18, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(37, 99, 235);
  doc.text(subtitle, 18, y + 9);
}

function drawKeyValueRows(doc: jsPDF, rows: [string, string][], x: number, y: number, width: number) {
  const rowHeight = 8;
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, width, rows.length * rowHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y, width, rows.length * rowHeight, 'S');

  rows.forEach(([label, value], idx) => {
    const rowTop = y + idx * rowHeight;
    if (idx % 2 === 1) {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, rowTop, width, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(x, rowTop + rowHeight, x + width, rowTop + rowHeight);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(label, x + 4, rowTop + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value, x + width * 0.48, rowTop + 5.5, { maxWidth: width * 0.48 });
  });
}

function drawHeader(doc: jsPDF, settings: CompanySettings, docTitle: string) {
  // Primary top bar
  doc.setFillColor(11, 25, 44); // Deep Navy
  doc.rect(0, 0, 210, 24, 'F');

  // Draw Logo (Stylized D)
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.roundedRect(14, 6, 12, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('D', 18, 14.5);

  doc.setFontSize(14);
  doc.text(settings.companyName.toUpperCase(), 30, 14.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(docTitle.toUpperCase(), 196, 14.5, { align: 'right' });

  // Sub-header with company contact
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`${settings.registeredAddress} | Phone: ${settings.supportPhone} | Email: ${settings.supportEmail}`, 14, 30);
  doc.text(`NBFC Reg/License: ${settings.nbfcLicenseInfo} | GSTIN: ${settings.gstNumber}`, 14, 34);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 37, 196, 37);
}

function drawFooter(doc: jsPDF, settings: CompanySettings, docNumber: string) {
  const pageHeight = 297;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 20, 196, pageHeight - 20);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Doc ID: ${docNumber} | Generated on: ${new Date().toLocaleString('en-IN')}`, 14, pageHeight - 14);
  doc.text(`Verify online: ${window.location.origin}/verify-receipt?id=${docNumber}`, 14, pageHeight - 10);
  doc.text('Confidential & Legally Binding - Dhani Finance Automated Lending System', 196, pageHeight - 10, { align: 'right' });
}

function drawSignatures(doc: jsPDF, settings: CompanySettings, yPos: number) {
  doc.setDrawColor(203, 213, 225);
  
  // Borrower Sign
  doc.line(14, yPos + 18, 70, yPos + 18);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Signature of Borrower', 14, yPos + 23);

  // Authorized Signatory
  doc.line(140, yPos + 18, 196, yPos + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${settings.companyName}`, 140, yPos + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.authorizedSignatoryName}`, 140, yPos + 27);
  doc.text(`${settings.authorizedSignatoryTitle}`, 140, yPos + 31);
}

// 1. Application Acknowledgement
export function generateApplicationAcknowledgement(app: LoanApplication, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Application Acknowledgement');

  let y = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LOAN APPLICATION ACKNOWLEDGEMENT SLIP', 14, y);

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Dear ${app.personalInfo.fullName}, thank you for submitting your loan application with Dhani Finance. Your request has been logged successfully into our automated assessment system.`, 14, y, { maxWidth: 180 });

  y += 15;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, 45, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, 182, 45, 'S');

  doc.setFont('helvetica', 'bold');
  doc.text('Application Reference No:', 18, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(app.id, 70, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Loan Product Category:', 18, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(app.productTitle, 70, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Requested Loan Amount:', 18, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(formatINR(app.requestedAmount), 70, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.text('Requested Tenure:', 18, y + 29);
  doc.setFont('helvetica', 'normal');
  doc.text(`${app.requestedTenureMonths} Months`, 70, y + 29);

  doc.setFont('helvetica', 'bold');
  doc.text('Submission Timestamp:', 18, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(app.createdAt), 70, y + 36);

  y += 55;
  doc.setFont('helvetica', 'bold');
  doc.text('Submitted Document Checklist:', 14, y);
  y += 6;

  app.documents.forEach((docItem, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.text(` [ ✓ ] ${idx + 1}. ${docItem.title} - Status: ${docItem.status.toUpperCase()}`, 18, y);
    y += 5;
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Next Required Actions:', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('1. Our credit assessment officer will verify your uploaded bank statement & income proof.', 18, y); y += 5;
  doc.text('2. Track your real-time status at any time using your Application ID on our portal.', 18, y); y += 5;
  doc.text('3. You will receive an SMS and Email notification once provisional sanction is issued.', 18, y);

  drawSignatures(doc, settings, 210);
  drawFooter(doc, settings, `ACK-${app.id}`);

  doc.save(`DhaniFinance_Acknowledgement_${app.id}.pdf`);
}

// 2. Provisional Eligibility Letter
export function generateProvisionalEligibilityLetter(app: LoanApplication, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Provisional Eligibility Letter');

  let y = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('PROVISIONAL LOAN ELIGIBILITY ASSESSMENT', 14, y);

  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, 14, y);
  doc.text(`Applicant Name: ${app.personalInfo.fullName}`, 14, y + 5);
  doc.text(`Application ID: ${app.id}`, 14, y + 10);

  y += 20;
  const result = app.eligibilityResult;
  doc.setFillColor(240, 253, 244); // light green
  doc.rect(14, y, 182, 40, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.rect(14, y, 182, 40, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`Assessment Result: ${result?.status.toUpperCase() || 'PROVISIONALLY ELIGIBLE'}`, 18, y + 8);

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Max Eligible Amount: ${formatINR(result?.maxEligibleAmount || app.requestedAmount)}`, 18, y + 16);
  doc.text(`Indicative Interest Rate: ${result?.recommendedInterestRate || 12.5}% p.a.`, 18, y + 22);
  doc.text(`Indicative Tenure: ${result?.maxEligibleTenure || app.requestedTenureMonths} Months`, 18, y + 28);
  doc.text(`Assessed FOIR Ratio: ${result?.foirPercent || 35}%`, 18, y + 34);

  y += 50;
  doc.setFont('helvetica', 'bold');
  doc.text('Important Compliance Note:', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('This provisional eligibility estimate is generated based on self-declared income parameters. This is NOT a final loan commitment or sanction letter. Final sanction is subject to physical/digital document verification, internal risk policy criteria, and authorized credit committee sign-off.', 14, y, { maxWidth: 180 });

  drawSignatures(doc, settings, 210);
  drawFooter(doc, settings, `ELG-${app.id}`);

  doc.save(`DhaniFinance_Eligibility_${app.id}.pdf`);
}

// 3. Official Loan Approval / Sanction Letter
export function generateSanctionLetter(app: LoanApplication, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Loan Sanction Letter');

  let y = 45;
  const sanctionDate = formatDate(app.approvalDate || new Date().toISOString());
  const sanctionedAmount = app.approvedAmount || app.requestedAmount;
  const approvedRate = app.approvedRate || 12.5;
  const approvedTenure = app.approvedTenureMonths || app.requestedTenureMonths;
  const approvedEmi = app.approvedEmi || 0;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, y - 4, 182, 18, 2, 2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, y - 4, 182, 18, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL LOAN SANCTION LETTER', 18, y + 3);
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text('Subject to final verification, agreement execution and lender policy checks', 18, y + 9);

  y += 22;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Sanction Reference No: SANC/${app.id}/2026`, 14, y);
  doc.text(`Date of Issue: ${sanctionDate}`, 196, y, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Borrower Details', 14, y);
  y += 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, 26, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, 182, 26, 'S');

  doc.setFont('helvetica', 'bold');
  doc.text(app.personalInfo.fullName.toUpperCase(), 18, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${app.personalInfo.currentAddress}, ${app.personalInfo.city}, ${app.personalInfo.state} - ${app.personalInfo.pincode}`, 18, y + 13, { maxWidth: 112 });
  doc.text(`PAN: ${app.personalInfo.panNumber}`, 140, y + 7);
  doc.text(`Mobile: ${app.personalInfo.mobile}`, 140, y + 13);
  doc.text(`Application ID: ${app.id}`, 140, y + 19);

  y += 36;
  doc.text('Dear Sir/Madam,', 14, y);
  y += 6;
  const intro = `We are pleased to inform you that your application for ${app.productTitle} has been approved in principle by ${settings.companyName}. The sanction is issued on the basis of details submitted by you and remains subject to completion of documentation, verification and final disbursement checks.`;
  doc.text(doc.splitTextToSize(intro, 182), 14, y);

  y += 18;
  // Sanction Terms Table
  const terms = [
    ['Loan Product Category', app.productTitle],
    ['Sanctioned Amount', formatINR(sanctionedAmount)],
    ['Rate of Interest', `${approvedRate}% p.a. reducing balance`],
    ['Loan Tenure', `${approvedTenure} months`],
    ['Monthly EMI', approvedEmi ? formatINR(approvedEmi) : 'To be confirmed before disbursement'],
    ['Processing Fee (Non-Refundable)', formatINR(app.processingFee || 0)],
    ['Disbursement Account', `${app.financialInfo.bankName} - A/C ${app.financialInfo.accountNumber}`],
    ['Sanction Validity', '15 days from date of issue'],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Sanctioned Loan Terms', 14, y);
  y += 5;
  const rowHeight = 8;
  const tableHeight = rowHeight * terms.length;
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, tableHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, tableHeight, 'S');

  terms.forEach(([label, val], idx) => {
    const rowTop = y + idx * rowHeight;
    if (idx % 2 === 1) {
      doc.setFillColor(255, 255, 255);
      doc.rect(14, rowTop, 182, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(14, rowTop + rowHeight, 196, rowTop + rowHeight);
    const rowY = rowTop + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(label, 18, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 100, rowY, { maxWidth: 90 });
  });

  y += tableHeight + 12;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Key Pre-Disbursement Conditions', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const conditions = [
    'Execution of the loan agreement, repayment schedule and all required declarations.',
    'Successful verification of KYC documents, bank account details and borrower eligibility.',
    'Payment of applicable processing fee and charges through approved digital payment modes.',
    'Final lender approval before disbursement into the verified borrower bank account.',
  ];
  conditions.forEach((condition, idx) => {
    doc.text(`${idx + 1}. ${condition}`, 18, y, { maxWidth: 174 });
    y += 5;
  });

  y += 5;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(14, y, 182, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('Important:', 18, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text('This sanction letter is not a cash approval guarantee. Disbursement is completed only after final verification and agreement completion.', 36, y + 7, { maxWidth: 154 });
  doc.text('Do not pay cash to any person claiming guaranteed loan release.', 36, y + 13, { maxWidth: 154 });

  drawSignatures(doc, settings, 210);
  drawFooter(doc, settings, `SANC-${app.id}`);

  doc.save(`DhaniFinance_Sanction_${app.id}.pdf`);
}

// 4. General Loan Section Letter
export function generateGeneralLoanLetter(app: LoanApplication, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'General Loan Letter');

  let y = 45;
  const amount = app.approvedAmount || app.requestedAmount;
  const rate = app.approvedRate || app.eligibilityResult?.recommendedInterestRate || 12.5;
  const tenure = app.approvedTenureMonths || app.requestedTenureMonths;
  const emi = app.approvedEmi || calculateEmi(amount, rate, tenure, 1.5).monthlyEmi;

  drawDocumentHero(
    doc,
    'GENERAL LOAN APPLICATION LETTER',
    'Customer loan summary prepared for application review and customer records',
    y
  );

  y += 24;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Reference No: GEN/${app.id}/2026`, 14, y);
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, 196, y, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('To Whom It May Concern,', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  const body = `This is to record that ${app.personalInfo.fullName} has submitted a loan application with ${settings.companyName}. The details below are based on information provided by the applicant and are subject to internal checks, document verification, eligibility review, applicable charges, and final sanction approval.`;
  doc.text(doc.splitTextToSize(body, 182), 14, y);

  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Applicant & Loan Summary', 14, y);
  y += 5;
  drawKeyValueRows(doc, [
    ['Application ID', app.id],
    ['Applicant Name', app.personalInfo.fullName],
    ['Registered Email', app.personalInfo.email],
    ['Registered Mobile', app.personalInfo.mobile],
    ['Loan Product', app.productTitle],
    ['Loan Purpose', app.purpose || 'As declared in application'],
    ['Requested / Approved Amount', formatPDF_INR(amount)],
    ['Tenure', `${tenure} months`],
    ['Indicative EMI', formatPDF_INR(emi)],
    ['Application Status', app.status.replace(/_/g, ' ')],
  ], 14, y, 182);

  y += 88;
  doc.setFont('helvetica', 'bold');
  doc.text('General Terms for Loan Processing', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  [
    'Loan approval is subject to complete KYC, income, bank-account and document verification.',
    'Final interest rate, EMI, tenure, processing fee and other charges are confirmed only in the official sanction letter.',
    'Disbursement, if approved, will be made only to the verified bank account of the primary borrower.',
    'The borrower should not make any cash payment to any person for guaranteed approval or release of funds.',
    'The applicant may track status using the application ID and OTP verification on the official website.',
  ].forEach((line, idx) => {
    doc.text(`${idx + 1}. ${line}`, 18, y, { maxWidth: 174 });
    y += 6;
  });

  y += 4;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, y, 182, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('Responsible Lending Note', 18, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text('This letter is a general application summary and is not a final disbursement commitment.', 18, y + 13);

  drawSignatures(doc, settings, 220);
  drawFooter(doc, settings, `GEN-${app.id}`);
  doc.save(`DhaniFinance_General_Loan_Letter_${app.id}.pdf`);
}

// 5. Application EMI Schedule Preview
export function generateApplicationEmiSchedulePDF(app: LoanApplication, settings: CompanySettings) {
  const amount = app.approvedAmount || app.requestedAmount;
  const rate = app.approvedRate || app.eligibilityResult?.recommendedInterestRate || 12.5;
  const tenure = app.approvedTenureMonths || app.requestedTenureMonths;
  const calc = calculateEmi(amount, rate, tenure, 1.5);
  const doc = new jsPDF();
  drawHeader(doc, settings, 'EMI Schedule Preview');

  let y = 45;
  drawDocumentHero(
    doc,
    'EMI REPAYMENT SCHEDULE PREVIEW',
    'Indicative schedule generated from current application or approved terms',
    y
  );
  y += 24;

  drawKeyValueRows(doc, [
    ['Application ID', app.id],
    ['Applicant Name', app.personalInfo.fullName],
    ['Loan Product', app.productTitle],
    ['Principal Amount', formatPDF_INR(amount)],
    ['Interest Rate', `${rate}% p.a.`],
    ['Tenure', `${tenure} months`],
    ['Monthly EMI', formatPDF_INR(calc.monthlyEmi)],
    ['Total Payable', formatPDF_INR(calc.totalPayment)],
  ], 14, y, 182);

  y += 74;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Month-wise EMI Schedule', 14, y);
  y += 6;

  const drawTableHeader = () => {
    doc.setFillColor(11, 25, 44);
    doc.rect(14, y, 182, 9, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('No.', 18, y + 6);
    doc.text('Opening', 54, y + 6, { align: 'right' });
    doc.text('Principal', 88, y + 6, { align: 'right' });
    doc.text('Interest', 122, y + 6, { align: 'right' });
    doc.text('EMI', 154, y + 6, { align: 'right' });
    doc.text('Closing', 192, y + 6, { align: 'right' });
    y += 9;
  };

  drawTableHeader();
  doc.setFontSize(8);
  calc.schedule.forEach((row, idx) => {
    if (y > 262) {
      doc.addPage();
      drawHeader(doc, settings, 'EMI Schedule Preview');
      y = 45;
      drawTableHeader();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 8, 'F');
    }
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row.month), 18, y + 5.5);
    doc.text(formatPDF_INR(row.openingPrincipal), 54, y + 5.5, { align: 'right' });
    doc.text(formatPDF_INR(row.principalPayment), 88, y + 5.5, { align: 'right' });
    doc.text(formatPDF_INR(row.interestPayment), 122, y + 5.5, { align: 'right' });
    doc.text(formatPDF_INR(row.emi), 154, y + 5.5, { align: 'right' });
    doc.text(formatPDF_INR(row.closingPrincipal), 192, y + 5.5, { align: 'right' });
    y += 8;
  });

  drawFooter(doc, settings, `EMI-${app.id}`);
  doc.save(`DhaniFinance_EMI_Schedule_${app.id}.pdf`);
}

// 6. Loan Agreement Document
export function generateLoanAgreement(app: LoanApplication, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Loan Agreement');

  let y = 45;
  const amount = app.approvedAmount || app.requestedAmount;
  const rate = app.approvedRate || 12.5;
  const tenure = app.approvedTenureMonths || app.requestedTenureMonths;
  const emi = app.approvedEmi || calculateEmi(amount, rate, tenure, 1.5).monthlyEmi;
  drawDocumentHero(
    doc,
    'LOAN AGREEMENT & REPAYMENT UNDERTAKING',
    'General agreement draft for customer acceptance and lender records',
    y
  );

  y += 22;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`This agreement draft is executed on ${formatDate(new Date().toISOString())} between ${settings.companyName} (Lender) and ${app.personalInfo.fullName} (Borrower), PAN ${app.personalInfo.panNumber}.`, 14, y, { maxWidth: 180 });

  y += 14;
  drawKeyValueRows(doc, [
    ['Application ID', app.id],
    ['Borrower Name', app.personalInfo.fullName],
    ['Borrower Address', `${app.personalInfo.currentAddress}, ${app.personalInfo.city}, ${app.personalInfo.state}`],
    ['Bank Account', `${app.financialInfo.bankName} - ${maskAccount(app.financialInfo.accountNumber)}`],
    ['Loan Amount', formatPDF_INR(amount)],
    ['Interest Rate', `${rate}% p.a. reducing balance`],
    ['Tenure', `${tenure} months`],
    ['Monthly EMI', formatPDF_INR(emi)],
  ], 14, y, 182);

  y += 74;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Terms and Conditions of Loan Facility', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const clauses = [
    `Facility Amount: The lender may disburse ${formatPDF_INR(amount)} subject to final verification and execution of all required documents.`,
    `Repayment: The borrower undertakes to repay the loan in ${tenure} monthly installments. The indicative EMI is ${formatPDF_INR(emi)}.`,
    `Interest: Interest will be charged at ${rate}% p.a. on a reducing balance basis unless otherwise stated in the sanction letter.`,
    'Use of Funds: The borrower confirms that funds will be used only for the declared loan purpose and lawful activities.',
    'Default: Delayed or missed payments may attract applicable charges and recovery action as permitted by law.',
    'Fair Recovery: The lender will follow responsible lending and non-coercive recovery practices.',
    'Declarations: The borrower confirms that all submitted information and documents are true and complete.',
  ];

  clauses.forEach((cl, idx) => {
    doc.text(`${idx + 1}. ${cl}`, 18, y, { maxWidth: 174 });
    y += 8;
  });

  drawSignatures(doc, settings, 210);
  drawFooter(doc, settings, `AGR-${app.id}`);

  doc.save(`DhaniFinance_Agreement_${app.id}.pdf`);
}

// 5. EMI Repayment Schedule
export function generateRepaymentSchedulePDF(loan: LoanAccount, settings: CompanySettings) {
  const doc = new jsPDF();
  
  // Helper to safely format currency for jsPDF (avoids ₹ rendering issue)
  const formatPDF_INR = (amount: number) => {
    return formatINR(amount).replace('₹', 'Rs. ');
  };

  const drawWatermark = () => {
    doc.setFontSize(60);
    doc.setTextColor(245, 247, 250);
    doc.text(settings.companyName.toUpperCase(), 105, 160, { angle: 45, align: 'center' });
  };

  drawWatermark();
  drawHeader(doc, settings, 'Repayment Schedule');

  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(11, 25, 44);
  doc.text('REPAYMENT SCHEDULE', 14, y);

  // Status Badge
  doc.setFillColor(16, 185, 129); // Emerald
  doc.roundedRect(165, y - 6, 31, 8, 4, 4, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ACTIVE LOAN', 180.5, y - 0.5, { align: 'center' });

  y += 12;
  
  // Calculate Totals
  const totalPrincipal = loan.schedule.reduce((acc, curr) => acc + curr.principalComponent, 0);
  const totalInterest = loan.schedule.reduce((acc, curr) => acc + curr.interestComponent, 0);
  const totalRepayment = totalPrincipal + totalInterest;

  // Summary Box with drop shadow effect
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(15, y + 1, 182, 45, 4, 4, 'F'); // shadow
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 45, 4, 4, 'FD'); // main box

  doc.setFontSize(9);
  
  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Generated Date', 20, y + 10);
  doc.text('Loan Amount', 20, y + 18);
  doc.text('Annual Interest Rate', 20, y + 26);
  doc.text('Loan Tenure', 20, y + 34);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(new Date().toISOString()), 65, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPDF_INR(loan.principalAmount), 65, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${loan.interestRate}% p.a.`, 65, y + 26);
  doc.text(`${loan.tenureMonths} Months`, 65, y + 34);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Monthly EMI', 115, y + 10);
  doc.text('Total Interest', 115, y + 18);
  doc.text('Total Amount Payable', 115, y + 26);

  doc.setTextColor(15, 23, 42);
  doc.text(formatPDF_INR(loan.monthlyEmi), 190, y + 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(formatPDF_INR(totalInterest), 190, y + 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(formatPDF_INR(totalRepayment), 190, y + 26, { align: 'right' });

  // Visual Chart inside the box
  const barY = y + 38;
  const barWidth = 170;
  const pRatio = totalPrincipal / totalRepayment;
  const pWidth = barWidth * pRatio;
  
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(20, barY, pWidth, 3.5, 1.5, 1.5, 'F');
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(20 + pWidth - 1, barY, barWidth - pWidth + 1, 3.5, 1.5, 1.5, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(37, 99, 235);
  doc.text('■ Principal', 20, barY - 2);
  doc.setTextColor(245, 158, 11);
  doc.text('■ Interest', 50, barY - 2);

  y += 55;

  const drawTableHeader = (startY: number) => {
    doc.setFillColor(11, 25, 44); // deep navy
    doc.roundedRect(14, startY, 182, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('EMI No.', 18, startY + 6.5);
    doc.text('Payment Date', 36, startY + 6.5);
    doc.text('Opening Balance', 78, startY + 6.5, { align: 'right' });
    doc.text('Principal', 104, startY + 6.5, { align: 'right' });
    doc.text('Interest', 128, startY + 6.5, { align: 'right' });
    doc.text('EMI', 154, startY + 6.5, { align: 'right' });
    doc.text('Closing Balance', 192, startY + 6.5, { align: 'right' });
  };

  drawTableHeader(y);
  y += 10;
  
  doc.setFontSize(8);

  loan.schedule.forEach((inst, idx) => {
    if (y > 260) {
      doc.addPage();
      drawWatermark();
      drawHeader(doc, settings, 'Repayment Schedule (Contd.)');
      y = 48;
      drawTableHeader(y);
      y += 10;
      doc.setFontSize(8);
    }
    
    // Zebra striping
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 9, 'F');
    }

    // Left edge accent
    doc.setFillColor(203, 213, 225);
    doc.rect(14, y, 2, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${inst.installmentNumber}`, 20, y + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(formatDate(inst.dueDate), 36, y + 6);
    
    doc.setTextColor(51, 65, 85);
    doc.text(formatPDF_INR(inst.openingPrincipal), 78, y + 6, { align: 'right' });
    
    doc.setTextColor(15, 23, 42);
    doc.text(formatPDF_INR(inst.principalComponent), 104, y + 6, { align: 'right' });
    
    doc.setTextColor(71, 85, 105);
    doc.text(formatPDF_INR(inst.interestComponent), 128, y + 6, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald for EMI
    doc.text(formatPDF_INR(inst.emiAmount), 154, y + 6, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(formatPDF_INR(inst.closingPrincipal), 192, y + 6, { align: 'right' });

    y += 9;
  });

  // Footer Totals
  if (y > 255) {
    doc.addPage();
    drawWatermark();
    drawHeader(doc, settings, 'Repayment Schedule (Contd.)');
    y = 48;
  }
  
  y += 4;
  doc.setFillColor(11, 25, 44);
  doc.roundedRect(14, y, 182, 10, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  
  doc.text('TOTAL REPAYMENT', 18, y + 6.5);
  doc.text(formatPDF_INR(totalPrincipal), 104, y + 6.5, { align: 'right' });
  doc.text(formatPDF_INR(totalInterest), 128, y + 6.5, { align: 'right' });
  doc.setTextColor(16, 185, 129); // emerald accent
  doc.text(formatPDF_INR(totalRepayment), 154, y + 6.5, { align: 'right' });

  drawFooter(doc, settings, `SCH-${loan.accountNumber}`);

  doc.save(`DhaniFinance_Schedule_${loan.accountNumber}.pdf`);
}

// 6. Payment Receipt
export function generatePaymentReceiptPDF(receipt: Receipt, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Official Payment Receipt');

  let y = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL PAYMENT RECEIPT', 14, y);

  y += 10;
  doc.setFillColor(240, 253, 244);
  doc.rect(14, y, 182, 55, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.rect(14, y, 182, 55, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`Receipt Number: ${receipt.receiptNumber}`, 18, y + 9);
  doc.text(`STATUS: VERIFIED & CONFIRMED`, 190, y + 9, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer Name: ${receipt.customerName}`, 18, y + 18);
  doc.text(`Loan Account / App ID: ${receipt.loanAccountId || receipt.applicationId}`, 18, y + 25);
  doc.text(`Amount Paid: ${formatINR(receipt.amountPaid)}`, 18, y + 32);
  doc.text(`UPI UTR / Reference No: ${receipt.utrNumber}`, 18, y + 39);
  doc.text(`Payment Date: ${formatDate(receipt.paymentDate)}`, 18, y + 46);

  y += 65;
  doc.setFont('helvetica', 'bold');
  doc.text('Account Balance Status:', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Remaining Outstanding Balance: ${formatINR(receipt.remainingBalance)}`, 18, y); y += 5;
  doc.text(`Next EMI Due Date: ${formatDate(receipt.nextDueDate)}`, 18, y);

  drawSignatures(doc, settings, 210);
  drawFooter(doc, settings, receipt.receiptNumber);

  doc.save(`DhaniFinance_Receipt_${receipt.receiptNumber}.pdf`);
}

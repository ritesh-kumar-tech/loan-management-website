import { jsPDF } from 'jspdf';
import { LoanApplication, LoanAccount, PaymentSubmission, Receipt, CompanySettings } from '../types';
import { formatINR, formatDate } from './calculator';

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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL LOAN SANCTION ADVICE', 14, y);

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref No: SANC/${app.id}/2026`, 14, y);
  doc.text(`Date: ${formatDate(app.approvalDate || new Date().toISOString())}`, 196, y, { align: 'right' });

  y += 10;
  doc.text(`To,`, 14, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(app.personalInfo.fullName.toUpperCase(), 14, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${app.personalInfo.currentAddress}, ${app.personalInfo.city}, ${app.personalInfo.state} - ${app.personalInfo.pincode}`, 14, y, { maxWidth: 180 });
  doc.text(`PAN: ${app.personalInfo.panNumber} | Mobile: ${app.personalInfo.mobile}`, 14, y + 5);

  y += 15;
  doc.text(`Dear Sir/Madam,`, 14, y); y += 5;
  doc.text(`We are pleased to inform you that your application for a ${app.productTitle} has been in-principle APPROVED by Dhani Finance credit desk as per the sanction terms detailed below:`, 14, y, { maxWidth: 180 });

  y += 12;
  // Sanction Terms Table
  const terms = [
    ['Loan Product Category', app.productTitle],
    ['Sanctioned Amount', formatINR(app.approvedAmount || app.requestedAmount)],
    ['Rate of Interest', `${app.approvedRate || 12.5}% p.a. (Reducing Balance)`],
    ['Loan Tenure', `${app.approvedTenureMonths || app.requestedTenureMonths} Months`],
    ['Monthly Equated Installment (EMI)', formatINR(app.approvedEmi || 0)],
    ['Processing Fee (Non-Refundable)', formatINR(app.processingFee || 0)],
    ['Disbursement Account', `${app.financialInfo.bankName} - A/C No: ${app.financialInfo.accountNumber}`],
    ['Sanction Letter Validity', '15 Days from date of issue'],
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8 * 7 + 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, 8 * 7 + 2, 'S');

  terms.forEach(([label, val], idx) => {
    const rowY = y + 6 + (idx * 7);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 18, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(val, 100, rowY);
  });

  y += 8 * 7 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Key Pre-Disbursement Conditions:', 14, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('1. Submission of signed Loan Agreement and NACH/Auto-Debit Mandate.', 18, y); y += 5;
  doc.text('2. Verification of bank account details and original KYC documents.', 18, y); y += 5;
  doc.text('3. Acceptance of sanction terms by signing and returning a copy within validity period.', 18, y);

  drawSignatures(doc, settings, 210);
  drawFooter(doc, settings, `SANC-${app.id}`);

  doc.save(`DhaniFinance_Sanction_${app.id}.pdf`);
}

// 4. Loan Agreement Document
export function generateLoanAgreement(app: LoanApplication, settings: CompanySettings) {
  const doc = new jsPDF();
  drawHeader(doc, settings, 'Loan Agreement');

  let y = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DEMAND LOAN AGREEMENT AND REPAYMENT UNDERTAKING', 14, y);

  y += 8;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`THIS LOAN AGREEMENT is executed on this ${formatDate(new Date().toISOString())} at ${settings.registeredAddress}, between Dhani Finance (Lender) and ${app.personalInfo.fullName} (Borrower), PAN: ${app.personalInfo.panNumber}.`, 14, y, { maxWidth: 180 });

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS AND CONDITIONS OF LOAN FACILITY:', 14, y); y += 5;
  doc.setFont('helvetica', 'normal');

  const clauses = [
    `1. FACILITY AMOUNT: The Lender agrees to disburse a sum of ${formatINR(app.approvedAmount || app.requestedAmount)} under loan account ${app.id}.`,
    `2. REPAYMENT & INTEREST: The Borrower undertakes to repay the principal together with interest at the rate of ${app.approvedRate || 12.5}% p.a. in ${app.approvedTenureMonths || app.requestedTenureMonths} monthly installments of ${formatINR(app.approvedEmi || 0)}.`,
    `3. DEFAULT & PENALTY: Late payments shall attract default interest penalty charges of 2% per month on the overdue installment amount.`,
    `4. RECOVERIES & LEGAL JURISDICTION: Disputes arising out of this agreement shall be subject to exclusive jurisdiction of courts located in the Lender registered city.`,
    `5. E-SIGNATURE CONSENT: The Borrower acknowledges electronic verification of Aadhaar/PAN as valid consent and signature under the Information Technology Act.`,
  ];

  clauses.forEach(cl => {
    doc.text(cl, 14, y, { maxWidth: 180 });
    y += 10;
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

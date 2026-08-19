import { jsPDF } from 'jspdf';
import { LoanApplication, LoanAccount, PaymentSubmission, Receipt, CompanySettings } from '../types';
import { calculateEmi, formatINR, formatDate } from './calculator';
import { DHANI_LOGO_ASPECT_RATIO, DHANI_LOGO_DATA_URI } from './dhaniLogo';

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

// Shared by every generated document. A plain white background is used here
// on purpose - the official logo is a JPEG with a solid white background
// (no transparency), so filling this area with any other color would leave
// a visible box around it.
function drawHeader(doc: jsPDF, settings: CompanySettings, docTitle: string) {
  const margin = 14;
  const logoWidth = 30;
  const logoHeight = logoWidth * DHANI_LOGO_ASPECT_RATIO;
  const logoY = 6;
  doc.addImage(DHANI_LOGO_DATA_URI, 'JPEG', margin, logoY, logoWidth, logoHeight);

  const textBaseline = logoY + logoHeight / 2 + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 25, 44);
  doc.text(settings.companyName.toUpperCase(), margin + logoWidth + 5, textBaseline);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(docTitle.toUpperCase(), 196, textBaseline, { align: 'right' });

  // Sub-header with company contact. Address, phone and email were previously
  // one concatenated line with no width limit - long enough (with a full
  // registered address) to run straight off the right edge of the page. Each
  // now gets its own line, and the address is defensively wrapped too.
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  const contentWidth = 210 - margin * 2;
  const addressLines = doc.splitTextToSize(settings.registeredAddress || settings.branchAddress || '', contentWidth);
  doc.text(addressLines, margin, 30);
  const contactY = 30 + addressLines.length * 3.6;
  doc.text(`Phone: ${settings.supportPhone} | Email: ${settings.supportEmail}`, margin, contactY);
  doc.text(`NBFC Reg/License: ${settings.nbfcLicenseInfo} | GSTIN: ${settings.gstNumber}`, margin, contactY + 4);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, contactY + 7, 210 - margin, contactY + 7);
}

// Shared by every generated document's closing block. Reserves a fixed band
// at the very bottom of the page (independent of how far each document's own
// content ran) so it never depends on - or collides with - whatever the
// calling document drew above it.
function drawFooter(doc: jsPDF, settings: CompanySettings, docNumber: string, baseUrl?: string) {
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const footerTop = pageHeight - 24;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerTop, pageWidth - margin, footerTop);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(100, 116, 139);
  const addressLines = doc.splitTextToSize(settings.registeredAddress || settings.branchAddress || '', pageWidth - margin * 2);
  doc.text(addressLines, margin, footerTop + 5);
  const afterAddressY = footerTop + 5 + addressLines.length * 3.6;

  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  doc.text(`Doc ID: ${docNumber} | Generated on: ${new Date().toLocaleString('en-IN')}`, margin, afterAddressY + 3.4);
  doc.text(`Verify online: ${origin}/verify-receipt?id=${docNumber}`, margin, afterAddressY + 7);
  doc.text('Confidential & Legally Binding', pageWidth - margin, afterAddressY + 7, { align: 'right' });
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

// `targetWidth` is the actual mm width the barcode will occupy, not a loose
// multiplier - the previous "scale" parameter didn't correspond to real
// output width (scale=1 rendered ~55mm wide regardless of where it was
// positioned), which is how the barcode ended up drawn straight off the edge
// of the page on the sanction letter.
function drawBarcode(doc: jsPDF, x: number, y: number, value = '', height = 16, targetWidth = 34) {
  const seed = value || 'DHANI-FINANCES';
  const bars = Array.from({ length: 38 }, (_, idx) => {
    const code = seed.charCodeAt(idx % seed.length) + idx * 17;
    return (code % 3) + 1;
  });
  const totalUnits = bars.reduce((sum, width) => sum + width, 0);
  const unitScale = targetWidth / (totalUnits * 0.72);
  let cursor = x;
  doc.setFillColor(0, 0, 0);
  bars.forEach((width, idx) => {
    if (idx % 2 === 0) doc.rect(cursor, y, width * 0.55 * unitScale, height, 'F');
    cursor += width * 0.72 * unitScale;
  });
}

function drawVerificationQr(doc: jsPDF, x: number, y: number, cell = 2.4) {
  const pattern = [
    '111111100101111',
    '100000101001001',
    '101110100111101',
    '101110101010001',
    '101110101101101',
    '100000100000101',
    '111111101010111',
    '000000001011000',
    '110101111001101',
    '011001000111010',
    '101111101100111',
    '001010011010001',
    '111111101111101',
    '100000101000101',
    '111111101011111',
  ];
  doc.setFillColor(0, 0, 0);
  pattern.forEach((row, rowIdx) => {
    row.split('').forEach((bit, colIdx) => {
      if (bit === '1') doc.rect(x + colIdx * cell, y + rowIdx * cell, cell, cell, 'F');
    });
  });
}

async function addQrImageOrFallback(doc: jsPDF, data: string, x: number, y: number, size: number) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(data)}`;
  try {
    const response = await fetch(qrUrl);
    if (!response.ok) throw new Error('QR image request failed');
    const arrayBuffer = await response.arrayBuffer();
    // This PDF builder now also runs server-side (to attach the same letter to
    // approval emails), where FileReader/Blob-to-data-URL conversion doesn't
    // exist. Buffer covers Node; btoa covers the browser - both produce the
    // same base64 payload from the same bytes.
    const base64 = typeof Buffer !== 'undefined'
      ? Buffer.from(arrayBuffer).toString('base64')
      : btoa(Array.from(new Uint8Array(arrayBuffer), (byte) => String.fromCharCode(byte)).join(''));
    doc.addImage(`data:image/png;base64,${base64}`, 'PNG', x, y, size, size);
  } catch {
    drawVerificationQr(doc, x, y, size / 15);
  }
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
  doc.text(formatPDF_INR(app.requestedAmount), 70, y + 22);

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
  doc.text(`Max Eligible Amount: ${formatPDF_INR(result?.maxEligibleAmount || app.requestedAmount)}`, 18, y + 16);
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
//
// Layout follows a single top-to-bottom flow cursor (`y`) through every
// section - header, title, applicant/loan details, letter body, processing
// fee, payment accounts, notes, then the approval/QR row - instead of mixing
// in hardcoded absolute coordinates. Each section only knows where the one
// before it ended, so notes/QR/stamp/signature/footer can never overlap
// regardless of how long the surrounding dynamic text turns out to be.
export async function buildSanctionLetterPdf(app: LoanApplication, settings: CompanySettings, baseUrl?: string) {
  const doc = new jsPDF();
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const approvalDateIso = app.approvalDate || new Date().toISOString();
  const approvalDate = formatDate(approvalDateIso);
  const sanctionDate = formatDate(approvalDateIso);
  const sanctionedAmount = app.approvedAmount || app.requestedAmount;
  const approvedRate = app.approvedRate || 12.5;
  const approvedTenure = app.approvedTenureMonths || app.requestedTenureMonths;
  const approvedEmi = app.approvedEmi || calculateEmi(sanctionedAmount, approvedRate, approvedTenure, 1.5).monthlyEmi;
  const processingFee = app.processingFee || Math.round((sanctionedAmount * 1.5) / 100);
  const yearText = `${Math.floor(approvedTenure / 12)} Years, ${approvedTenure % 12} Months`;

  const money = (amount: number) => `INR ${Math.round(amount || 0).toLocaleString('en-IN')}/-`;
  const writeWrapped = (text: string, x: number, y: number, maxWidth: number, lineHeight = 5.4) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  };

  // This builder now also runs server-side to attach the letter to the approval
  // email, where there is no `window` - callers there pass the app's configured
  // public APP_URL instead. In the browser this still resolves to whatever
  // domain the customer is actually on (never a hardcoded "localhost").
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const payeeName = settings.collectionAccountHolderName || settings.upiAccountName || settings.companyName;
  const payeeAccount = settings.collectionAccountNumber || 'Set by admin';
  const payeeIfsc = settings.collectionIfscCode || 'Set by admin';
  const payeeBank = settings.collectionBankName || 'Official collection bank';

  // ---------------- Watermark ----------------
  // Drawn first so every later, opaque element paints over it - a large,
  // very light diagonal wordmark in the page background, matching common
  // official-letter styling.
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(64);
  doc.setTextColor(234, 240, 250);
  doc.text(settings.companyName, pageWidth / 2, pageHeight / 2, { angle: 35, align: 'center' });

  // ---------------- Header ----------------
  // Bespoke to this letter (not the shared drawHeader used by the other
  // generated documents, which must not change): just the logo lockup and a
  // document reference on the right, a solid colour band underneath. The
  // registered address is intentionally not repeated here - it lives once,
  // in the footer, so the letterhead stays uncluttered.
  const logoWidth = 34;
  const logoHeight = logoWidth * DHANI_LOGO_ASPECT_RATIO;
  doc.addImage(DHANI_LOGO_DATA_URI, 'JPEG', margin, 8, logoWidth, logoHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 25, 44);
  doc.text(settings.companyName.toUpperCase(), margin, 8 + logoHeight + 5);
  if (settings.tagline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.tagline, margin, 8 + logoHeight + 9.5, { maxWidth: 90 });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ref: SANC/${app.id}/2026`, pageWidth - margin, 10, { align: 'right' });
  doc.text(`Date: ${sanctionDate}`, pageWidth - margin, 15, { align: 'right' });

  let y = 28;
  doc.setFillColor(37, 99, 235);
  doc.rect(0, y, pageWidth, 7, 'F');
  y += 15;

  // ---------------- Title ----------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('Loan Approval Letter', pageWidth / 2, y, { align: 'center' });
  drawBarcode(doc, pageWidth - margin - 34, y - 7, app.id, 12, 34);
  y += 10;

  // ---------------- Applicant / Loan Details ----------------
  const field = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${label} -`, margin, y);
    doc.text(value || '-', margin + 42, y);
    y += 6;
  };
  field('Name', app.personalInfo.fullName.toUpperCase());
  field('Application no', app.id);
  field('Loan Amount', money(sanctionedAmount));
  field('Period', yearText);
  field('Monthly EMI', money(approvedEmi));
  field('Interest Rate', `${approvedRate}% p.a.`);
  field('Loan Type', app.productTitle);
  y += 3;

  // ---------------- Approval Letter Content ----------------
  // Copy is unchanged from the original letter - only alignment/spacing/width
  // were fixed here (the second paragraph previously started at a different
  // left edge than the rest, which read as a random indent).
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.3);
  doc.setTextColor(17, 24, 39);
  doc.text('Respected Sir/Madam,', margin, y);
  y += 6;
  y = writeWrapped(`We are very glad to inform you that in response to your request for a loan in order to meet your financial needs. At the outset we welcome you to meet of ${settings.companyName}.`, margin, y, contentWidth) + 2;
  y = writeWrapped(`You requested a short term loan, Sum of loan amount ${money(sanctionedAmount)} for the tenure of ${yearText} on dated ${approvalDate}. Your monthly EMI INR: ${money(approvedEmi).replace('INR ', '')} at the rate of ${approvedRate}% including rate of interest.`, margin, y, contentWidth) + 2;
  y = writeWrapped(`When you submit amount of File Processing Fee legal consideration charge fee ${money(processingFee)}. After that it is our responsibility to hand over your approved loan value of ${money(sanctionedAmount)} in your bank account after verify your credit ability.`, margin, y, contentWidth) + 2;
  y = writeWrapped('Please continue your loan process without Hesitation.', margin, y, contentWidth) + 4;

  // ---------------- Processing Fee Information ----------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Processing fee Legal Consideration ${money(processingFee)}`, margin, y);
  y += 9;

  // ---------------- Payment Account + Customer Account ----------------
  const colGap = 6;
  const colWidth = (contentWidth - colGap) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + colGap;
  const valueOffset = 22;
  const valueMaxWidth = colWidth - valueOffset;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Pay at This Account', col1X, y);
  doc.text('Credit Customer Account', col2X, y);
  y += 7;

  const accountRow = (label: string, payeeValue: string, customerValue: string, rowY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(28, 39, 94);
    doc.text(`${label} -`, col1X, rowY);
    doc.text(`${label} -`, col2X, rowY);
    doc.text(payeeValue || '-', col1X + valueOffset, rowY, { maxWidth: valueMaxWidth });
    doc.text(customerValue || '-', col2X + valueOffset, rowY, { maxWidth: valueMaxWidth });
  };
  accountRow('Name', payeeName, app.personalInfo.fullName.toUpperCase(), y); y += 6.5;
  accountRow('A/c No.', payeeAccount, maskAccount(app.financialInfo.accountNumber), y); y += 6.5;
  accountRow('IFSC Code', payeeIfsc, app.financialInfo.ifscCode || 'To be verified', y); y += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 39, 94);
  doc.text(payeeBank.toUpperCase(), col1X + valueOffset, y, { maxWidth: valueMaxWidth });
  doc.text((app.financialInfo.bankName || 'Customer Bank').toUpperCase(), col2X + valueOffset, y, { maxWidth: valueMaxWidth });
  y += 9;

  // ---------------- Important Notes ----------------
  // This section must fully finish rendering (and `y` must reflect exactly
  // where it ended) before the approval/QR row below is allowed to start.
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(10);
  doc.setTextColor(190, 24, 55);
  doc.text('Note:-', margin, y);
  y += 6.5;
  doc.setFontSize(8.8);
  const notes = [
    'We do not accept cash deposit.',
    'We accept only NEFT/IMPS/Mobile banking/Net Banking/Other.',
    'Processing fee will be refundable within 24 hours.',
  ];
  notes.forEach((note, idx) => {
    y = writeWrapped(`${idx + 1}. ${note}`, margin + 4, y, contentWidth - 4, 4.8) + 0.8;
  });
  y += 5;

  // ---------------- Approval / Verification Area ----------------
  // Three columns starting at the same row (grievance/support | approval
  // stamp + verification | QR). Each column's own height is measured, and the
  // footer is placed below the tallest one - not a guessed constant - so it
  // can never land on top of whichever column happens to run longest.
  const rowTop = y;
  const colGrievanceX = margin;
  const colStampX = margin + 60;
  const qrSize = 28;
  const colQrX = pageWidth - margin - qrSize;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.6);
  doc.setTextColor(15, 23, 42);
  doc.text('Your Truly,', colGrievanceX, rowTop);
  doc.setFontSize(8.4);
  doc.text(settings.authorizedSignatoryName || 'Authorized Signatory', colGrievanceX, rowTop + 8, { maxWidth: 54 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  const grievanceEndY = writeWrapped(settings.authorizedSignatoryTitle || 'Customer Business', colGrievanceX, rowTop + 13, 54, 4.4);
  const colGrievanceHeight = grievanceEndY - rowTop;

  // Circular seal with a signature-style flourish underneath, echoing the
  // official-stamp look without relying on rotated text baselines (which are
  // hard to reason about for overlap) for anything except the stamp label.
  doc.setDrawColor(76, 29, 149);
  doc.setTextColor(76, 29, 149);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.circle(colStampX + 12, rowTop + 10, 11, 'S');
  doc.circle(colStampX + 12, rowTop + 10, 8.4, 'S');
  doc.text('LOAN', colStampX + 12, rowTop + 6.5, { align: 'center' });
  doc.text('APPROVED', colStampX + 12, rowTop + 10, { align: 'center' });
  doc.setFontSize(6);
  doc.text('M.D.', colStampX + 12, rowTop + 13.5, { align: 'center' });
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);
  doc.line(colStampX + 26, rowTop + 19, colStampX + 50, rowTop + 11);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.6);
  doc.setTextColor(51, 65, 85);
  doc.text('Verified By', colStampX + 26, rowTop + 22, { angle: 12 });
  doc.setFontSize(6.6);
  doc.text('E-signed & Verified', colStampX + 26, rowTop + 25.5);
  const colStampHeight = 25.5;

  const verificationUrl = `${origin}/track-status?applicationId=${encodeURIComponent(app.id)}`;
  await addQrImageOrFallback(doc, verificationUrl, colQrX, rowTop, qrSize);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(51, 65, 85);
  doc.text('Scan to Verify', colQrX + qrSize / 2, rowTop + qrSize + 4.5, { align: 'center' });
  const colQrHeight = qrSize + 7;

  y = rowTop + Math.max(colGrievanceHeight, colStampHeight, colQrHeight) + 5;

  // ---------------- Footer ----------------
  // Anchors near the bottom margin on a normally-short letter, but slides down
  // with the content if it runs long, and never past a hard ceiling that would
  // push the footer text off the printable page. Reserves enough room for the
  // registered address line plus the two reference/legal lines below it.
  const footerY = Math.min(Math.max(y, pageHeight - 34), pageHeight - 20);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(100, 116, 139);
  const footerAddressLines = doc.splitTextToSize(settings.registeredAddress || settings.branchAddress || '', contentWidth);
  doc.text(footerAddressLines, margin, footerY + 4.5);
  const afterAddressY = footerY + 4.5 + footerAddressLines.length * 3.4;

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Phone: ${settings.supportPhone} | Email: ${settings.supportEmail}`, margin, afterAddressY + 3.6);
  doc.text(`Verify online: ${origin}/track-status`, margin, afterAddressY + 7.4);
  doc.text(`${settings.nbfcLicenseInfo} | ${settings.registrationNumber}`, pageWidth - margin, afterAddressY + 7.4, { align: 'right' });

  return doc;
}

export async function generateSanctionLetter(app: LoanApplication, settings: CompanySettings) {
  const doc = await buildSanctionLetterPdf(app, settings);
  doc.save(`DhaniFinance_Sanction_${app.id}.pdf`);
}

// Server-side only: produces the exact same letter as generateSanctionLetter
// above (there is one PDF-building function - buildSanctionLetterPdf - this
// and generateSanctionLetter are just two different outputs of it), as raw
// bytes suitable for an email attachment instead of a browser download.
export async function buildSanctionLetterBuffer(app: LoanApplication, settings: CompanySettings, baseUrl?: string): Promise<Buffer> {
  const doc = await buildSanctionLetterPdf(app, settings, baseUrl);
  return Buffer.from(doc.output('arraybuffer'));
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
  doc.text(`Amount Paid: ${formatPDF_INR(receipt.amountPaid)}`, 18, y + 32);
  doc.text(`UPI UTR / Reference No: ${receipt.utrNumber}`, 18, y + 39);
  doc.text(`Payment Date: ${formatDate(receipt.paymentDate)}`, 18, y + 46);

  y += 65;
  doc.setFont('helvetica', 'bold');
  doc.text('Account Balance Status:', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Remaining Outstanding Balance: ${formatPDF_INR(receipt.remainingBalance)}`, 18, y); y += 5;
  doc.text(`Next EMI Due Date: ${formatDate(receipt.nextDueDate)}`, 18, y);

  drawSignatures(doc, settings, 210);
  drawFooter(doc, settings, receipt.receiptNumber);

  doc.save(`DhaniFinance_Receipt_${receipt.receiptNumber}.pdf`);
}

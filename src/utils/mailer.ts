import nodemailer from 'nodemailer';
import { ApplicationStatus, CompanySettings, LoanApplication, PaymentSubmission, SupportTicket } from '../types';
import { getStatusMeta } from './statusConfig';

type SendEmailInput = {
  to?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  emailType?: string;
  applicationId?: string;
};

type TemplateContent = {
  subject: string;
  heading: string;
  intro: string[];
  details?: { label: string; value?: string | number | null }[];
  nextSteps?: string[];
};

const smtpPass = () => process.env.SMTP_PASS || '';
const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass());

const getTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass(),
    },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeEmail = (email?: string) => String(email || '').trim();

const fromAddress = (settings: CompanySettings) => {
  const email = process.env.MAIL_FROM || settings.supportEmail;
  const name = process.env.MAIL_FROM_NAME || settings.companyName;
  return `"${String(name).replace(/"/g, "'")}" <${email}>`;
};

const supportAddress = (settings: CompanySettings) =>
  process.env.MAIL_REPLY_TO || settings.supportEmail || process.env.MAIL_FROM || 'support@dhani-finances.com';

const statusLabel = (status?: string) => getStatusMeta(status).label;

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatCurrency = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? `Rs ${value.toLocaleString('en-IN')}` : undefined;

export const maskEmail = (email: string) => {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) return 'your email';
  const visible = name.length <= 2 ? name[0] || '*' : `${name.slice(0, 2)}***`;
  return `${visible}@${domain}`;
};

const logEmailResult = (input: SendEmailInput, status: 'sent' | 'failed' | 'skipped', reason?: string) => {
  const parts = [
    `Email Type: ${input.emailType || 'general'}`,
    input.applicationId ? `Application ID: ${input.applicationId}` : undefined,
    input.to ? `Recipient: ${maskEmail(input.to)}` : undefined,
    `Status: ${status}`,
    reason ? `Reason: ${reason}` : undefined,
  ].filter(Boolean);
  const line = parts.join(' | ');
  if (status === 'failed') console.error(line);
  else console.info(line);
};

const renderEmail = (settings: CompanySettings, content: TemplateContent) => {
  const details = (content.details || []).filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
  const support = supportAddress(settings);
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe5f1;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#071B3D;color:#ffffff;padding:22px 24px;">
                <div style="font-size:20px;font-weight:700;">${escapeHtml(settings.companyName)}</div>
                <div style="font-size:12px;color:#cfe4ff;margin-top:4px;">${escapeHtml(settings.tagline || 'Loan application support')}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px;">
                <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(content.heading)}</h1>
                ${content.intro.map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(line)}</p>`).join('')}
                ${
                  details.length
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid #dbe5f1;border-radius:8px;background:#f8fafc;">
                        ${details
                          .map(
                            (item) => `<tr>
                              <td style="padding:10px 14px;border-bottom:1px solid #e5edf6;font-size:13px;color:#64748b;">${escapeHtml(item.label)}</td>
                              <td style="padding:10px 14px;border-bottom:1px solid #e5edf6;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${escapeHtml(item.value)}</td>
                            </tr>`
                          )
                          .join('')}
                      </table>`
                    : ''
                }
                ${
                  content.nextSteps?.length
                    ? `<div style="margin-top:18px;">
                        ${content.nextSteps.map((line) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(line)}</p>`).join('')}
                      </div>`
                    : ''
                }
                <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#334155;">For help, contact our support team at ${escapeHtml(support)}${settings.supportPhone ? ` or ${escapeHtml(settings.supportPhone)}` : ''}.</p>
                <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#334155;">Regards,<br>${escapeHtml(settings.companyName)}</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e5edf6;padding:16px 24px;font-size:12px;line-height:1.5;color:#64748b;">
                This is an automatic notification from ${escapeHtml(settings.companyName)}. Please do not share passwords, OTPs, card details, or confidential banking information by email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    settings.companyName,
    '',
    content.heading,
    '',
    ...content.intro,
    '',
    ...details.map((item) => `${item.label}: ${item.value}`),
    ...(content.nextSteps?.length ? ['', ...content.nextSteps] : []),
    '',
    `For help, contact ${support}${settings.supportPhone ? ` or ${settings.supportPhone}` : ''}.`,
    '',
    'Regards,',
    settings.companyName,
  ].join('\n');

  return { html, text };
};

export const sendEmail = async (settings: CompanySettings, input: SendEmailInput): Promise<{ success: boolean; skipped?: boolean; error?: string }> => {
  const to = normalizeEmail(input.to);
  if (!to) {
    logEmailResult(input, 'skipped', 'missing recipient');
    return { success: false, skipped: true, error: 'missing recipient' };
  }

  if (!smtpConfigured()) {
    logEmailResult({ ...input, to }, 'skipped', 'SMTP not configured');
    return { success: true, skipped: true };
  }

  try {
    await getTransport().sendMail({
      from: fromAddress(settings),
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo || process.env.MAIL_REPLY_TO || settings.supportEmail,
    });
    logEmailResult({ ...input, to }, 'sent');
    return { success: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'SMTP delivery failed';
    logEmailResult({ ...input, to }, 'failed', reason);
    return { success: false, error: reason };
  }
};

export const sendOtpEmail = async (settings: CompanySettings, email: string, otp: string, purposeLabel: string) => {
  const subject = `${settings.companyName} verification code`;
  const text = [
    settings.companyName,
    '',
    purposeLabel,
    '',
    `Your verification code is: ${otp}`,
    '',
    'This code will expire in 5 minutes.',
    'For your security, never share this code with anyone.',
    'If you did not request this code, you can ignore this email.',
  ].join('\n');

  const html = `<p>${escapeHtml(purposeLabel)}</p><p>Your verification code is: <strong>${escapeHtml(otp)}</strong></p><p>This code will expire in 5 minutes.</p>`;
  const result = await sendEmail(settings, { to: email, subject, html, text, emailType: 'otp' });
  if (!result.success) throw new Error(result.error || 'OTP email send failed');
};

export const sendApplicationConfirmationEmail = async (
  settings: CompanySettings,
  email: string,
  payload: { applicantName: string; applicationId: string; status: string; applicationDate?: string }
) => {
  const content: TemplateContent = {
    subject: 'Loan Application Received - Dhani Finances',
    heading: 'Loan Application Received',
    intro: [
      `Hello ${payload.applicantName || 'Applicant'},`,
      `Thank you for applying with ${settings.companyName}. We have successfully received your loan application.`,
      'Our team will review your application and contact you if any additional information is required.',
      'You will receive another email when there is an update to your application.',
    ],
    details: [
      { label: 'Application ID', value: payload.applicationId },
      { label: 'Application Date', value: formatDate(payload.applicationDate) },
      { label: 'Current Status', value: statusLabel(payload.status) },
    ],
  };
  const rendered = renderEmail(settings, content);
  return sendEmail(settings, {
    to: email,
    subject: content.subject,
    ...rendered,
    emailType: 'application_submitted',
    applicationId: payload.applicationId,
  });
};

const baseApplicationDetails = (app: LoanApplication) => [
  { label: 'Application ID', value: app.id },
  { label: 'Status', value: statusLabel(app.status) },
  { label: 'Loan Product', value: app.productTitle },
  { label: 'Requested Amount', value: formatCurrency(app.requestedAmount) },
  { label: 'Approved Amount', value: formatCurrency(app.approvedAmount) },
  { label: 'Approved Tenure', value: app.approvedTenureMonths ? `${app.approvedTenureMonths} months` : undefined },
];

const statusTemplates: Partial<Record<ApplicationStatus, (settings: CompanySettings, app: LoanApplication) => TemplateContent>> = {
  under_review: (settings, app) => ({
    subject: 'Your Loan Application Is Under Review',
    heading: 'Application Under Review',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `Your loan application #${app.id} is now under review.`,
      'Our team will contact you if any additional information is required.',
    ],
    details: baseApplicationDetails(app),
  }),
  documents_pending: (settings, app) => ({
    subject: 'Documents Required for Your Loan Application',
    heading: 'Documents Required',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `Additional documents are required for your loan application #${app.id}.`,
      'Please submit the required documents through the official Dhani Finances application process.',
    ],
    details: [
      ...baseApplicationDetails(app),
      {
        label: 'Documents Needed',
        value: app.documents
          ?.filter((doc) => doc.status === 'reupload_required' || doc.status === 'rejected' || doc.status === 'pending')
          .map((doc) => doc.title || doc.docType)
          .filter(Boolean)
          .join(', '),
      },
    ],
  }),
  additional_information_required: (settings, app) => ({
    subject: 'Additional Information Required for Your Loan Application',
    heading: 'Additional Information Required',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `We need additional information to continue reviewing application #${app.id}.`,
      'Please contact support or follow the instructions shown in your customer dashboard.',
    ],
    details: baseApplicationDetails(app),
  }),
  approved: (settings, app) => ({
    subject: 'Your Loan Application Has Been Approved',
    heading: 'Loan Application Approved',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `Good news! Your loan application #${app.id} has been approved.`,
      'Please log in or follow the official instructions provided to complete the next step of your application.',
    ],
    details: baseApplicationDetails(app),
    nextSteps: ['If payment is required for the next stage, please use only the official payment method available through Dhani Finances.'],
  }),
  rejected: (settings, app) => ({
    subject: 'Update Regarding Your Loan Application',
    heading: 'Loan Application Update',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `Thank you for your application with ${settings.companyName}.`,
      `After reviewing your application #${app.id}, we are unable to approve it at this time.`,
      'If you believe additional information may help with your application, please contact our support team.',
    ],
    details: [
      { label: 'Application ID', value: app.id },
      { label: 'Status', value: statusLabel(app.status) },
    ],
  }),
  processing_fee_pending: (settings, app) => ({
    subject: 'Payment Required for Your Loan Application',
    heading: 'Payment Required',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `A payment is required to continue processing loan application #${app.id}.`,
      'Please use only the official payment method available through Dhani Finances.',
    ],
    details: [
      ...baseApplicationDetails(app),
      { label: 'Payment Purpose', value: 'Processing Fee' },
      { label: 'Amount', value: formatCurrency(app.processingFee) },
      { label: 'Payment Status', value: statusLabel(app.status) },
    ],
  }),
  payment_verified: (settings, app) => ({
    subject: 'Payment Received - Dhani Finances',
    heading: 'Payment Received',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `We have successfully received your payment related to application #${app.id}.`,
      'Your application will now continue to the next stage.',
    ],
    details: [
      { label: 'Application ID', value: app.id },
      { label: 'Payment Status', value: 'Received' },
      { label: 'Current Status', value: statusLabel(app.status) },
    ],
  }),
  loan_disbursed: (settings, app) => ({
    subject: 'Your Loan Has Been Disbursed',
    heading: 'Loan Disbursed',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `Your loan application #${app.id} has moved to disbursed status.`,
      'Please refer to your official account dashboard for repayment schedule and related details.',
    ],
    details: baseApplicationDetails(app),
  }),
  completed: (settings, app) => ({
    subject: 'Your Loan Application Is Completed',
    heading: 'Application Completed',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `Your loan application #${app.id} has been completed.`,
    ],
    details: baseApplicationDetails(app),
  }),
  closed: (settings, app) => ({
    subject: 'Your Loan Application Is Completed',
    heading: 'Application Completed',
    intro: [
      `Hello ${app.personalInfo?.fullName || 'Applicant'},`,
      `Your loan application #${app.id} has been completed.`,
    ],
    details: baseApplicationDetails(app),
  }),
};

export const sendApplicationStatusEmail = async (
  settings: CompanySettings,
  app: LoanApplication,
  previousStatus?: ApplicationStatus
) => {
  if (previousStatus === app.status) {
    logEmailResult({ to: app.personalInfo?.email, subject: 'Status unchanged', html: '', text: '', emailType: 'application_status_unchanged', applicationId: app.id }, 'skipped', 'status unchanged');
    return { success: true, skipped: true };
  }

  const template = statusTemplates[app.status];
  if (!template) {
    logEmailResult({ to: app.personalInfo?.email, subject: 'Internal status change', html: '', text: '', emailType: `application_${app.status}`, applicationId: app.id }, 'skipped', 'no customer email template');
    return { success: true, skipped: true };
  }

  const content = template(settings, app);
  const rendered = renderEmail(settings, content);
  return sendEmail(settings, {
    to: app.personalInfo?.email,
    subject: content.subject,
    ...rendered,
    emailType: `application_${app.status}`,
    applicationId: app.id,
  });
};

export const sendPaymentReceivedEmail = async (settings: CompanySettings, app: LoanApplication | undefined, payment: PaymentSubmission) => {
  if (!app) return { success: false, skipped: true, error: 'missing application' };
  const content: TemplateContent = {
    subject: 'Payment Received - Dhani Finances',
    heading: 'Payment Received',
    intro: [
      `Hello ${app.personalInfo?.fullName || payment.customerName || 'Applicant'},`,
      `We have successfully received your payment related to application #${app.id}.`,
      'Your application will now continue to the next stage.',
    ],
    details: [
      { label: 'Application ID', value: app.id },
      { label: 'Payment ID', value: payment.id },
      { label: 'Payment Purpose', value: payment.purpose.replace(/_/g, ' ') },
      { label: 'Amount', value: formatCurrency(payment.amount) },
      { label: 'Payment Status', value: 'Received' },
      { label: 'Receipt Number', value: payment.receiptNumber },
    ],
  };
  const rendered = renderEmail(settings, content);
  return sendEmail(settings, {
    to: app.personalInfo?.email,
    subject: content.subject,
    ...rendered,
    emailType: 'payment_received',
    applicationId: app.id,
  });
};

export const sendSupportTicketEmails = async (
  settings: CompanySettings,
  ticket: SupportTicket & { customerEmail?: string; phone?: string },
  customerEmail?: string
) => {
  const submittedAt = formatDateTime(ticket.createdAt);
  const replyEmail = normalizeEmail(customerEmail || ticket.customerEmail);
  const safeMessage = ticket.messages.find((message) => message.sender === 'customer')?.text || ticket.description || '';
  const supportText = [
    'New support request received.',
    '',
    `Ticket ID: ${ticket.id}`,
    `Customer Name: ${ticket.customerName}`,
    `Customer Email: ${replyEmail || 'Not provided'}`,
    ticket.phone ? `Phone: ${ticket.phone}` : undefined,
    `Category: ${ticket.category}`,
    `Subject: ${ticket.subject}`,
    ticket.applicationId ? `Application ID: ${ticket.applicationId}` : undefined,
    `Submitted: ${submittedAt}`,
    '',
    'Message:',
    safeMessage,
  ]
    .filter(Boolean)
    .join('\n');

  const supportHtml = `<p>New support request received.</p>
<table role="presentation" cellspacing="0" cellpadding="6">
  <tr><td><strong>Ticket ID</strong></td><td>${escapeHtml(ticket.id)}</td></tr>
  <tr><td><strong>Customer Name</strong></td><td>${escapeHtml(ticket.customerName)}</td></tr>
  <tr><td><strong>Customer Email</strong></td><td>${escapeHtml(replyEmail || 'Not provided')}</td></tr>
  ${ticket.phone ? `<tr><td><strong>Phone</strong></td><td>${escapeHtml(ticket.phone)}</td></tr>` : ''}
  <tr><td><strong>Category</strong></td><td>${escapeHtml(ticket.category)}</td></tr>
  <tr><td><strong>Subject</strong></td><td>${escapeHtml(ticket.subject)}</td></tr>
  ${ticket.applicationId ? `<tr><td><strong>Application ID</strong></td><td>${escapeHtml(ticket.applicationId)}</td></tr>` : ''}
  <tr><td><strong>Submitted</strong></td><td>${escapeHtml(submittedAt)}</td></tr>
</table>
<p><strong>Message</strong></p>
<p>${escapeHtml(safeMessage).replace(/\n/g, '<br>')}</p>`;

  const supportResult = await sendEmail(settings, {
    to: supportAddress(settings),
    subject: `Support Request: ${ticket.subject}`,
    html: supportHtml,
    text: supportText,
    replyTo: replyEmail || undefined,
    emailType: 'support_team_notification',
    applicationId: ticket.applicationId,
  });

  if (!replyEmail) return { supportResult, acknowledgementResult: { success: false, skipped: true, error: 'missing customer email' } };

  const content: TemplateContent = {
    subject: 'We Received Your Support Request',
    heading: 'We Received Your Support Request',
    intro: [
      `Hello ${ticket.customerName || 'Customer'},`,
      `Thank you for contacting ${settings.companyName}.`,
      'We have received your support request and our team will review it.',
      'Our support team will respond as soon as possible.',
    ],
    details: [
      { label: 'Ticket ID', value: ticket.id },
      { label: 'Reference/Application ID', value: ticket.applicationId },
      { label: 'Submitted', value: submittedAt },
    ],
  };
  const rendered = renderEmail(settings, content);
  const acknowledgementResult = await sendEmail(settings, {
    to: replyEmail,
    subject: content.subject,
    ...rendered,
    emailType: 'support_customer_acknowledgement',
    applicationId: ticket.applicationId,
  });

  return { supportResult, acknowledgementResult };
};

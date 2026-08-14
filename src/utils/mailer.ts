import nodemailer from 'nodemailer';
import { CompanySettings } from '../types';

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

const getTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const fromAddress = (settings: CompanySettings) => process.env.SMTP_FROM || `"${settings.companyName}" <${settings.supportEmail}>`;

export const maskEmail = (email: string) => {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) return 'your email';
  const visible = name.length <= 2 ? name[0] || '*' : `${name.slice(0, 2)}***`;
  return `${visible}@${domain}`;
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

  if (!smtpConfigured()) {
    console.info(`[DEV EMAIL OTP] ${email}: ${otp}`);
    return;
  }

  await getTransport().sendMail({
    from: fromAddress(settings),
    to: email,
    subject,
    text,
  });
};

export const sendApplicationConfirmationEmail = async (
  settings: CompanySettings,
  email: string,
  payload: { applicantName: string; applicationId: string; status: string }
) => {
  const subject = `${settings.companyName} application received - ${payload.applicationId}`;
  const text = [
    `Dear ${payload.applicantName},`,
    '',
    `We have received your loan application with Application ID: ${payload.applicationId}.`,
    `Current status: ${payload.status.replace(/_/g, ' ')}`,
    '',
    'Please save your Application ID for future tracking. You can track the application status using OTP verification on our website.',
    '',
    `Regards,`,
    settings.companyName,
  ].join('\n');

  if (!smtpConfigured()) {
    console.info(`[DEV CONFIRMATION EMAIL] ${email}: ${payload.applicationId}`);
    return;
  }

  await getTransport().sendMail({
    from: fromAddress(settings),
    to: email,
    subject,
    text,
  });
};

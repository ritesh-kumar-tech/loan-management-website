import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2_${DIGEST}$${ITERATIONS}$${salt}$${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [algorithm, iterationsText, salt, hash] = storedHash.split('$');
  if (algorithm !== `pbkdf2_${DIGEST}` || !iterationsText || !salt || !hash) return false;

  const actual = Buffer.from(hash, 'hex');
  const expected = pbkdf2Sync(password, salt, Number(iterationsText), actual.length, DIGEST);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const maskApplicationForPublic = <T extends any>(application: T): T => {
  const copy = JSON.parse(JSON.stringify(application));
  if (copy?.personalInfo) {
    copy.personalInfo.panNumber = '*****';
    copy.personalInfo.aadhaarLast4 = copy.personalInfo.aadhaarLast4 ? '****' : '';
  }
  if (copy?.financialInfo?.accountNumber) {
    const last4 = String(copy.financialInfo.accountNumber).replace(/\D/g, '').slice(-4);
    copy.financialInfo.accountNumber = last4 ? `XXXXXX${last4}` : 'XXXXXX';
  }
  return copy;
};

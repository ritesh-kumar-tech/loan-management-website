import { defaultCmsContent, defaultSettings } from '../data/mockDatabase';
import {
  findUserAuthByEmail as findSqliteUserAuthByEmail,
  getCollections as getSqliteCollections,
  initializeDatabase as initializeSqliteDatabase,
  saveApplication as saveSqliteApplication,
  saveAuditLog as saveSqliteAuditLog,
  saveCmsContent as saveSqliteCmsContent,
  saveCustomer as saveSqliteCustomer,
  saveEligibilityRule as saveSqliteEligibilityRule,
  saveLoanAccount as saveSqliteLoanAccount,
  saveLoanProduct as saveSqliteLoanProduct,
  savePaymentSubmission as saveSqlitePaymentSubmission,
  saveNotification as saveSqliteNotification,
  saveReceipt as saveSqliteReceipt,
  saveSettings as saveSqliteSettings,
  saveStaffMember as saveSqliteStaffMember,
  saveSupportTicket as saveSqliteSupportTicket,
  saveUser as saveSqliteUser,
} from './store';
import {
  findMysqlUserAuthByEmail,
  getMysqlCollections,
  initializeMysqlDatabase,
  saveMysqlApplication,
  saveMysqlAuditLog,
  saveMysqlCmsContent,
  saveMysqlCustomer,
  saveMysqlEligibilityRule,
  saveMysqlLoanAccount,
  saveMysqlLoanProduct,
  saveMysqlPaymentSubmission,
  saveMysqlNotification,
  saveMysqlReceipt,
  saveMysqlSettings,
  saveMysqlStaffMember,
  saveMysqlSupportTicket,
  saveMysqlUser,
} from './mysqlStore';

export const isMysql = () => (process.env.DB_CLIENT || '').toLowerCase() === 'mysql';

export const initializeDatabase = async () => {
  if (isMysql()) {
    await initializeMysqlDatabase();
    return;
  }
  initializeSqliteDatabase();
};

export const getCollections = async () => {
  if (isMysql()) return getMysqlCollections({ settings: defaultSettings, cmsContent: defaultCmsContent });
  return getSqliteCollections();
};

export const findUserAuthByEmail = async (email: string) => {
  if (isMysql()) return findMysqlUserAuthByEmail(email);
  return findSqliteUserAuthByEmail(email);
};

export const saveSettings = (value: any) => (isMysql() ? saveMysqlSettings(value) : saveSqliteSettings(value));
export const saveCmsContent = (value: any) => (isMysql() ? saveMysqlCmsContent(value) : saveSqliteCmsContent(value));
export const saveUser = (value: any, passwordHash?: string) => (isMysql() ? saveMysqlUser(value, passwordHash) : saveSqliteUser(value, passwordHash));
export const saveLoanProduct = (value: any) => (isMysql() ? saveMysqlLoanProduct(value) : saveSqliteLoanProduct(value));
export const saveApplication = (value: any) => (isMysql() ? saveMysqlApplication(value) : saveSqliteApplication(value));
export const saveLoanAccount = (value: any) => (isMysql() ? saveMysqlLoanAccount(value) : saveSqliteLoanAccount(value));
export const savePaymentSubmission = (value: any) => (isMysql() ? saveMysqlPaymentSubmission(value) : saveSqlitePaymentSubmission(value));
export const saveNotification = (value: any) => (isMysql() ? saveMysqlNotification(value) : saveSqliteNotification(value));
export const saveReceipt = (value: any) => (isMysql() ? saveMysqlReceipt(value) : saveSqliteReceipt(value));
export const saveSupportTicket = (value: any) => (isMysql() ? saveMysqlSupportTicket(value) : saveSqliteSupportTicket(value));
export const saveAuditLog = (value: any) => (isMysql() ? saveMysqlAuditLog(value) : saveSqliteAuditLog(value));
export const saveCustomer = (value: any) => (isMysql() ? saveMysqlCustomer(value) : saveSqliteCustomer(value));
export const saveStaffMember = (value: any) => (isMysql() ? saveMysqlStaffMember(value) : saveSqliteStaffMember(value));
export const saveEligibilityRule = (value: any) => (isMysql() ? saveMysqlEligibilityRule(value) : saveSqliteEligibilityRule(value));

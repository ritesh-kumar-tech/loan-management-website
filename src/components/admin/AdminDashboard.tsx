import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  LoanApplication, 
  PaymentSubmission, 
  CompanySettings, 
  LoanProduct, 
  AuditLog, 
  LoanAccount,
  Receipt,
  SupportTicket 
} from '../../types';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  FileCheck2, 
  CreditCard, 
  Receipt as ReceiptIcon, 
  BarChart3, 
  Globe, 
  HelpCircle, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

import { DashboardView } from './views/DashboardView';
import { CustomerManagementView } from './views/CustomerManagementView';
import { ApplicationManagementView } from './views/ApplicationManagementView';
import { LoanManagementView } from './views/LoanManagementView';
import { DocumentVerificationView } from './views/DocumentVerificationView';
import { PaymentVerificationView } from './views/PaymentVerificationView';
import { ReceiptsManagementView } from './views/ReceiptsManagementView';
import { ProductManagementView } from './views/ProductManagementView';
import { ReportsAnalyticsView } from './views/ReportsAnalyticsView';
import { WebsiteCmsView } from './views/WebsiteCmsView';
import { SupportTicketsView } from './views/SupportTicketsView';
import { StaffManagementView } from './views/StaffManagementView';
import { SettingsManagementView } from './views/SettingsManagementView';
import { AuditLogsView } from './views/AuditLogsView';

interface AdminDashboardProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onExitAdmin?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  settings, 
  onUpdateSettings,
  onExitAdmin 
}) => {
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Global Admin Data State
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<LoanAccount[]>([]);
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        appsData,
        loansData,
        paymentsData,
        receiptsData,
        productsData,
        customersData,
        staffData,
        ticketsData,
        logsData,
      ] = await Promise.all([
        api.getApplications(),
        api.getLoanAccounts(),
        api.getPayments(),
        api.getReceipts(),
        api.getLoanProducts(),
        api.getCustomers(),
        api.getStaff(),
        api.getSupportTickets(),
        api.getAuditLogs(),
      ]);

      setApplications(appsData);
      setLoanAccounts(loansData);
      setPayments(paymentsData);
      setReceipts(receiptsData);
      setProducts(productsData);
      setCustomers(customersData);
      setStaff(staffData);
      setTickets(ticketsData);
      setAuditLogs(logsData);
    } catch (e) {
      console.error('Error loading admin portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Application Handlers
  const handleUpdateApplicationStatus = async (appId: string, payload: any) => {
    await api.updateApplicationStatus(appId, payload);
    await loadData();
  };

  const handleVerifyDocument = async (appId: string, docId: string, status: string, note?: string) => {
    await api.verifyDocument(appId, docId, status, note);
    await loadData();
  };

  // Payment Handlers
  const handleVerifyPayment = async (paymentId: string, action: 'approve' | 'reject', note?: string) => {
    await api.verifyPayment(paymentId, action, note);
    await loadData();
  };

  // Customer Handlers
  const handleSaveCustomer = async (cust: any) => {
    await api.saveCustomer(cust);
    await loadData();
  };

  // Product Handlers
  const handleSaveProduct = async (prod: LoanProduct) => {
    await api.saveLoanProduct(prod);
    await loadData();
  };

  // Staff Handlers
  const handleSaveStaff = async (member: any) => {
    await api.saveStaff(member);
    await loadData();
  };

  // Support Handlers
  const handleSendSupportMessage = async (payload: { ticketId: string; sender: 'support'; text: string }) => {
    await api.sendSupportMessage(payload);
    await loadData();
  };

  // Loan Adjustments Handler
  const handleAdjustLoan = async (accNo: string, payload: any) => {
    await api.adjustLoanAccount(accNo, payload);
    await loadData();
  };

  // Settings Handler
  const handleSaveSettings = async (newSettings: CompanySettings) => {
    await api.saveSettings(newSettings);
    onUpdateSettings(newSettings);
    await loadData();
  };

  // Computed Badge Counts
  const pendingAppsCount = applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
  const pendingPaymentsCount = payments.filter(p => p.status === 'pending_verification').length;
  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  const navigationGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
      ]
    },
    {
      title: 'LOAN OPERATIONS',
      items: [
        { id: 'applications', label: 'Applications Desk', icon: FileText, badge: pendingAppsCount },
        { id: 'loans', label: 'Active Loan Portfolio', icon: Building2 },
        { id: 'customers', label: 'Customer Directory', icon: Users },
        { id: 'documents', label: 'KYC Document Verification', icon: FileCheck2 },
      ]
    },
    {
      title: 'PAYMENTS & REVENUE',
      items: [
        { id: 'payments', label: 'UPI Verification Queue', icon: CreditCard, badge: pendingPaymentsCount },
        { id: 'receipts', label: 'Official Receipts', icon: ReceiptIcon },
      ]
    },
    {
      title: 'PORTFOLIO & SCHEMES',
      items: [
        { id: 'products', label: 'Loan Products & Schemes', icon: Building2 },
        { id: 'reports', label: 'Analytics & RBI Returns', icon: BarChart3 },
      ]
    },
    {
      title: 'ADMINISTRATION & WEBSITES',
      items: [
        { id: 'cms', label: 'Website CMS Editor', icon: Globe },
        { id: 'support', label: 'Support Helpdesk', icon: HelpCircle, badge: openTicketsCount },
        { id: 'staff', label: 'Staff Accounts & RBAC', icon: ShieldCheck },
        { id: 'settings', label: 'System & Company Settings', icon: Settings },
        { id: 'audit', label: 'Statutory Audit Logs', icon: ShieldCheck },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 cursor-pointer"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="font-extrabold text-sm tracking-tight">{settings.companyName} Executive</div>
        </div>

        {onExitAdmin && (
          <button
            onClick={onExitAdmin}
            className="px-2.5 py-1 bg-slate-800 text-slate-300 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Portal
          </button>
        )}
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] md:max-h-screen">
          {/* Brand Badge */}
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs tracking-wider uppercase mb-1">
              <ShieldCheck className="w-4 h-4" /> NBFC Admin Portal
            </div>
            <h1 className="text-lg font-black text-white tracking-tight leading-snug">{settings.companyName}</h1>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">RBI Reg. #{settings.registrationNumber || 'N-14.03291'}</p>
          </div>

          {/* Nav Section Groups */}
          <nav className="space-y-5 text-xs">
            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-2 mb-1">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all cursor-pointer text-left
                        ${isActive 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isActive ? 'bg-white text-emerald-900' : 'bg-rose-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
              AD
            </div>
            <div className="leading-tight">
              <div className="font-bold text-slate-200">Chief Credit Officer</div>
              <div className="text-[10px] text-slate-500">Super Admin</div>
            </div>
          </div>

          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              title="Return to Public Website Portal"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Top Header Breadcrumb & Global Quick Actions */}
        <div className="hidden md:flex items-center justify-between pb-6 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Dhani Finance Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-extrabold text-slate-900 capitalize">{activeSection.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Server Live (Express + Drizzle API)
            </div>

            {onExitAdmin && (
              <button
                onClick={onExitAdmin}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Public Website
              </button>
            )}
          </div>
        </div>

        {/* Dynamic View Router */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading Executive Portal Data...</p>
          </div>
        ) : (
          <>
            {activeSection === 'dashboard' && (
              <DashboardView
                applications={applications}
                loanAccounts={loanAccounts}
                payments={payments}
                customers={customers}
                tickets={tickets}
                settings={settings}
                onNavigate={(section) => setActiveSection(section)}
                onSelectApplication={(app) => {
                  setActiveSection('applications');
                }}
                onVerifyPayment={handleVerifyPayment}
              />
            )}

            {activeSection === 'customers' && (
              <CustomerManagementView
                customers={customers}
                applications={applications}
                loanAccounts={loanAccounts}
                onSaveCustomer={handleSaveCustomer}
              />
            )}

            {activeSection === 'applications' && (
              <ApplicationManagementView
                applications={applications}
                settings={settings}
                onUpdateStatus={handleUpdateApplicationStatus}
                onVerifyDocument={handleVerifyDocument}
              />
            )}

            {activeSection === 'loans' && (
              <LoanManagementView
                loanAccounts={loanAccounts}
                settings={settings}
                onAdjustLoan={handleAdjustLoan}
              />
            )}

            {activeSection === 'documents' && (
              <DocumentVerificationView
                applications={applications}
                onVerifyDocument={handleVerifyDocument}
              />
            )}

            {activeSection === 'payments' && (
              <PaymentVerificationView
                payments={payments}
                onVerifyPayment={handleVerifyPayment}
              />
            )}

            {activeSection === 'receipts' && (
              <ReceiptsManagementView
                receipts={receipts}
                settings={settings}
              />
            )}

            {activeSection === 'products' && (
              <ProductManagementView
                products={products}
                onSaveProduct={handleSaveProduct}
              />
            )}

            {activeSection === 'reports' && (
              <ReportsAnalyticsView
                applications={applications}
                loanAccounts={loanAccounts}
                payments={payments}
              />
            )}

            {activeSection === 'cms' && (
              <WebsiteCmsView />
            )}

            {activeSection === 'support' && (
              <SupportTicketsView
                tickets={tickets}
                onSendMessage={handleSendSupportMessage}
              />
            )}

            {activeSection === 'staff' && (
              <StaffManagementView
                staff={staff}
                onSaveStaff={handleSaveStaff}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsManagementView
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'audit' && (
              <AuditLogsView logs={auditLogs} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

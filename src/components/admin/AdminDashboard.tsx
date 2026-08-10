import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  AuditLog,
  CompanySettings,
  LoanAccount,
  LoanApplication,
  LoanProduct,
  PaymentSubmission,
  Receipt,
  SupportTicket,
} from '../../types';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Users,
  X,
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

type NavChild = { id: string; label: string };
type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  children: NavChild[];
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ settings, onUpdateSettings, onExitAdmin }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === 'true');
  const [openMenu, setOpenMenu] = useState(() => localStorage.getItem('adminOpenMenu') || 'dashboard');
  const [dateRange, setDateRange] = useState('last_30_days');

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
      const [appsData, loansData, paymentsData, receiptsData, productsData, customersData, staffData, ticketsData, logsData] = await Promise.all([
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
    } catch (error) {
      console.error('Error loading admin portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateApplicationStatus = async (appId: string, payload: any) => {
    await api.updateApplicationStatus(appId, payload);
    await loadData();
  };

  const handleVerifyDocument = async (appId: string, docId: string, status: string, note?: string) => {
    await api.verifyDocument(appId, docId, status, note);
    await loadData();
  };

  const handleVerifyPayment = async (paymentId: string, action: 'approve' | 'reject', note?: string) => {
    await api.verifyPayment(paymentId, action, note);
    await loadData();
  };

  const handleSaveCustomer = async (cust: any) => {
    await api.saveCustomer(cust);
    await loadData();
  };

  const handleSaveProduct = async (prod: LoanProduct) => {
    await api.saveLoanProduct(prod);
    await loadData();
  };

  const handleSaveStaff = async (member: any) => {
    await api.saveStaff(member);
    await loadData();
  };

  const handleSendSupportMessage = async (payload: { ticketId: string; sender: 'support'; text: string }) => {
    await api.sendSupportMessage(payload);
    await loadData();
  };

  const handleAdjustLoan = async (accNo: string, payload: any) => {
    await api.adjustLoanAccount(accNo, payload);
    await loadData();
  };

  const handleSaveSettings = async (newSettings: CompanySettings) => {
    await api.saveSettings(newSettings);
    onUpdateSettings(newSettings);
    await loadData();
  };

  const pendingAppsCount = applications.filter((app) => app.status === 'submitted' || app.status === 'under_review').length;
  const pendingPaymentsCount = payments.filter((payment) => payment.status === 'pending_verification').length;
  const openTicketsCount = tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length;

  const navigationGroups: NavGroup[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      children: [{ id: 'dashboard', label: 'Dashboard Overview' }],
    },
    {
      id: 'applications',
      label: 'Applications',
      icon: FileText,
      badge: pendingAppsCount,
      children: [
        { id: 'applications', label: 'All Applications' },
        { id: 'documents', label: 'Document Verification' },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: openTicketsCount,
      children: [
        { id: 'customers', label: 'Customer Directory' },
        { id: 'support', label: 'Support Requests' },
      ],
    },
    {
      id: 'loans',
      label: 'Loans & EMI',
      icon: Building2,
      children: [
        { id: 'loans', label: 'Active Loans & Portfolio' },
        { id: 'products', label: 'Loan Products Catalog' },
      ],
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      badge: pendingPaymentsCount,
      children: [
        { id: 'payments', label: 'Payment Verification' },
        { id: 'receipts', label: 'Official Receipts' },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      children: [{ id: 'reports', label: 'Financial & Loan Reports' }],
    },
    {
      id: 'settings',
      label: 'Website & Settings',
      icon: Settings,
      children: [
        { id: 'cms', label: 'Website CMS' },
        { id: 'settings', label: 'Company Settings' },
        { id: 'staff', label: 'Staff Management' },
        { id: 'audit', label: 'Audit Logs' },
      ],
    },
  ];

  const activeParent = navigationGroups.find((group) => group.children.some((child) => child.id === activeSection)) || navigationGroups[0];

  const toggleSidebar = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    localStorage.setItem('adminSidebarCollapsed', String(next));
  };

  const toggleMenu = (id: string) => {
    const next = openMenu === id ? '' : id;
    setOpenMenu(next);
    localStorage.setItem('adminOpenMenu', next);
  };

  const selectSection = (section: string, parentId: string) => {
    setActiveSection(section);
    setOpenMenu(parentId);
    localStorage.setItem('adminOpenMenu', parentId);
    setIsMobileSidebarOpen(false);
  };

  const renderActiveView = () => {
    if (activeSection === 'dashboard') {
      return (
        <DashboardView
          applications={applications}
          loanAccounts={loanAccounts}
          payments={payments}
          customers={customers}
          tickets={tickets}
          settings={settings}
          onNavigate={setActiveSection}
          onSelectApplication={() => setActiveSection('applications')}
          onVerifyPayment={handleVerifyPayment}
        />
      );
    }
    if (activeSection === 'customers') return <CustomerManagementView customers={customers} applications={applications} loanAccounts={loanAccounts} onSaveCustomer={handleSaveCustomer} />;
    if (activeSection === 'applications') return <ApplicationManagementView applications={applications} settings={settings} onUpdateStatus={handleUpdateApplicationStatus} onVerifyDocument={handleVerifyDocument} />;
    if (activeSection === 'loans') return <LoanManagementView loanAccounts={loanAccounts} settings={settings} onAdjustLoan={handleAdjustLoan} />;
    if (activeSection === 'documents') return <DocumentVerificationView applications={applications} onVerifyDocument={handleVerifyDocument} />;
    if (activeSection === 'payments') return <PaymentVerificationView payments={payments} onVerifyPayment={handleVerifyPayment} />;
    if (activeSection === 'receipts') return <ReceiptsManagementView receipts={receipts} settings={settings} />;
    if (activeSection === 'products') return <ProductManagementView products={products} onSaveProduct={handleSaveProduct} />;
    if (activeSection === 'reports') return <ReportsAnalyticsView applications={applications} loanAccounts={loanAccounts} payments={payments} />;
    if (activeSection === 'cms') return <WebsiteCmsView />;
    if (activeSection === 'support') return <SupportTicketsView tickets={tickets} onSendMessage={handleSendSupportMessage} />;
    if (activeSection === 'staff') return <StaffManagementView staff={staff} onSaveStaff={handleSaveStaff} />;
    if (activeSection === 'settings') return <SettingsManagementView settings={settings} onSaveSettings={handleSaveSettings} />;
    if (activeSection === 'audit') return <AuditLogsView logs={auditLogs} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col md:flex-row">
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="p-1.5 rounded-lg bg-slate-800 text-slate-200">
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="font-extrabold text-sm tracking-tight">{settings.companyName} Admin</div>
        </div>
        {onExitAdmin && (
          <button onClick={onExitAdmin} className="px-2.5 py-1 bg-slate-800 text-slate-300 font-bold text-xs rounded-lg flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Portal
          </button>
        )}
      </div>

      <aside className={`fixed md:sticky md:top-0 inset-y-0 left-0 z-40 h-screen w-72 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'} bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between transition-all duration-200 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 space-y-5 overflow-y-auto">
          <div className={`border-b border-slate-800 pb-4 ${isSidebarCollapsed ? 'text-center' : ''}`}>
            <div className={`flex items-center gap-2 text-emerald-400 font-extrabold text-xs tracking-wider uppercase mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <ShieldCheck className="w-4 h-4" />
              <span className={isSidebarCollapsed ? 'hidden' : ''}>NBFC Admin Portal</span>
            </div>
            <h1 className={`text-lg font-black text-white tracking-tight ${isSidebarCollapsed ? 'hidden' : ''}`}>{settings.companyName}</h1>
            <p className={`text-[10px] text-slate-400 font-mono mt-0.5 ${isSidebarCollapsed ? 'hidden' : ''}`}>RBI Reg. #{settings.registrationNumber}</p>
            <button onClick={toggleSidebar} className="hidden md:flex mt-3 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> Collapse</>}
            </button>
          </div>

          <nav className="space-y-1 text-xs">
            {navigationGroups.map((group) => {
              const Icon = group.icon;
              const isParentActive = activeParent.id === group.id;
              const isOpen = openMenu === group.id && !isSidebarCollapsed;
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isSidebarCollapsed) selectSection(group.children[0].id, group.id);
                      else toggleMenu(group.id);
                    }}
                    title={isSidebarCollapsed ? group.label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-left ${isParentActive ? 'bg-blue-700 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className={`truncate ${isSidebarCollapsed ? 'hidden' : ''}`}>{group.label}</span>
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="flex items-center gap-2">
                        {group.badge !== undefined && group.badge > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">{group.badge}</span>}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </span>
                    )}
                  </button>
                  <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-4 pl-3 border-l border-slate-700 py-1 space-y-1">
                      {group.children.map((child) => (
                        <button
                          key={`${group.id}-${child.label}`}
                          onClick={() => selectSection(child.id, group.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-colors ${activeSection === child.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-white text-xs shrink-0">AD</div>
            <div className={`leading-tight min-w-0 ${isSidebarCollapsed ? 'hidden' : ''}`}>
              <div className="font-bold text-slate-200 truncate">Chief Credit Officer</div>
              <div className="text-[10px] text-slate-500">Super Admin</div>
            </div>
          </div>
          {onExitAdmin && (
            <button onClick={onExitAdmin} title="Return to Public Website Portal" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <div className="hidden md:flex items-center justify-between pb-6 border-b border-slate-200 mb-6 gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <span>Dhani Finance Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-extrabold text-slate-900">{activeParent.label}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-950 mt-2">{activeSection === 'dashboard' ? 'Dashboard' : activeSection.replace('_', ' ')}</h1>
            {activeSection === 'dashboard' && <p className="text-sm text-slate-500 mt-1">Overview of applications, approvals, collections, and active loans.</p>}
          </div>
          <div className="flex items-center gap-2">
            <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <button onClick={() => setActiveSection('applications')} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Review Applications
            </button>
            <button className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-bold bg-white px-3 py-2 rounded-xl border border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live
            </div>
            {onExitAdmin && (
              <button onClick={onExitAdmin} className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl" aria-label="Back to public website">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading Executive Portal Data...</p>
          </div>
        ) : renderActiveView()}
      </main>
    </div>
  );
};

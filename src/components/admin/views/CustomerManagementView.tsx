import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  FileText, 
  Building2, 
  Coins, 
  X, 
  Plus, 
  Check, 
  AlertCircle,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { formatINR, formatDate } from '../../../utils/calculator';

interface CustomerManagementViewProps {
  customers: any[];
  applications: any[];
  loanAccounts: any[];
  onSaveCustomer: (cust: any) => void;
}

export const CustomerManagementView: React.FC<CustomerManagementViewProps> = ({
  customers,
  applications,
  loanAccounts,
  onSaveCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Customer Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newPan, setNewPan] = useState('');
  const [newCity, setNewCity] = useState('');

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKyc = kycFilter === 'all' || c.kycStatus === kycFilter;
    const matchesStatus = statusFilter === 'all' || c.accountStatus === statusFilter;

    return matchesSearch && matchesKyc && matchesStatus;
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newMobile) return;

    const newCust = {
      id: `usr_cust_${Date.now()}`,
      fullName: newFullName,
      email: newEmail,
      mobile: newMobile,
      role: 'customer',
      isVerified: true,
      createdAt: new Date().toISOString(),
      kycStatus: 'pending',
      accountStatus: 'active',
      totalApplications: 0,
      activeLoans: 0,
      outstandingAmount: 0,
      panNumber: newPan.toUpperCase(),
      city: newCity || 'New Delhi',
      state: 'Delhi',
    };

    onSaveCustomer(newCust);
    setShowAddModal(false);
    setNewFullName('');
    setNewEmail('');
    setNewMobile('');
    setNewPan('');
    setNewCity('');
  };

  const handleToggleKyc = (cust: any, newKyc: 'verified' | 'rejected' | 'pending') => {
    const updated = { ...cust, kycStatus: newKyc };
    onSaveCustomer(updated);
    if (selectedCustomer && selectedCustomer.id === cust.id) {
      setSelectedCustomer(updated);
    }
  };

  const handleToggleAccountStatus = (cust: any, newStatus: 'active' | 'suspended') => {
    const updated = { ...cust, accountStatus: newStatus };
    onSaveCustomer(updated);
    if (selectedCustomer && selectedCustomer.id === cust.id) {
      setSelectedCustomer(updated);
    }
  };

  const handleExportCsv = () => {
    const headers = 'ID,Name,Email,Mobile,KYC Status,Account Status,Total Applications,Active Loans,Outstanding Amount,Registration Date\n';
    const rows = filteredCustomers.map(c => 
      `"${c.id}","${c.fullName}","${c.email}","${c.mobile}","${c.kycStatus}","${c.accountStatus}",${c.totalApplications || 0},${c.activeLoans || 0},${c.outstandingAmount || 0},"${c.createdAt}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Customer Management Directory
          </h2>
          <p className="text-xs text-slate-500">Manage registered borrowers, KYC identity verification, status locks & accounts.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, email, phone, or PAN..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
          />
        </div>

        <div>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">All KYC Statuses</option>
            <option value="verified">KYC Verified</option>
            <option value="pending">KYC Pending</option>
            <option value="rejected">KYC Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="suspended">Suspended / Locked</option>
          </select>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Customer ID</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">PAN / Location</th>
                <th className="py-3 px-4">KYC</th>
                <th className="py-3 px-4">Active Loans</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                    No customers found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const custApps = applications.filter(a => a.userId === cust.id || a.personalInfo?.email === cust.email);
                  const custLoans = loanAccounts.filter(l => l.userId === cust.id || l.customerName === cust.fullName);
                  const totalOut = custLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{cust.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{cust.fullName}</div>
                        <div className="text-[10px] text-slate-500">Reg: {formatDate(cust.createdAt)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">{cust.email}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{cust.mobile}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-700">{cust.panNumber || 'PAN Pending'}</div>
                        <div className="text-[10px] text-slate-500">{cust.city || 'Gurugram'}, {cust.state || 'Haryana'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          cust.kycStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                          cust.kycStatus === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {cust.kycStatus || 'pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {custLoans.length || cust.activeLoans || 0} Loans ({custApps.length} Apps)
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatINR(totalOut || cust.outstandingAmount || 0)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          cust.accountStatus === 'suspended' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {cust.accountStatus || 'active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 uppercase">{selectedCustomer.id}</span>
                <h3 className="text-xl font-extrabold text-slate-900">{selectedCustomer.fullName}</h3>
                <p className="text-xs text-slate-500">Customer Account Details & Credit Verification Controls</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Profile Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium block">Email Address</span>
                <span className="font-bold text-slate-800">{selectedCustomer.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Mobile Number</span>
                <span className="font-bold font-mono text-slate-800">{selectedCustomer.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">PAN Number</span>
                <span className="font-bold font-mono text-slate-800">{selectedCustomer.panNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">KYC Status</span>
                <span className="font-bold uppercase text-emerald-700">{selectedCustomer.kycStatus || 'pending'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Account Lock</span>
                <span className="font-bold uppercase text-slate-800">{selectedCustomer.accountStatus || 'active'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Registered On</span>
                <span className="font-bold text-slate-800">{formatDate(selectedCustomer.createdAt)}</span>
              </div>
            </div>

            {/* Admin Action Controls */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Account Actions</h4>
              <div className="flex flex-wrap gap-2">
                {selectedCustomer.kycStatus !== 'verified' && (
                  <button
                    onClick={() => handleToggleKyc(selectedCustomer, 'verified')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" /> Mark KYC Verified
                  </button>
                )}
                {selectedCustomer.accountStatus !== 'suspended' ? (
                  <button
                    onClick={() => handleToggleAccountStatus(selectedCustomer, 'suspended')}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserX className="w-4 h-4" /> Suspend Account
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleAccountStatus(selectedCustomer, 'active')}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Reactivate Account
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Add New Borrower Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Borrower Name *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={newPan}
                    onChange={(e) => setNewPan(e.target.value)}
                    placeholder="ABCDE1234F"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Gurugram"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

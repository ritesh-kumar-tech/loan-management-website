import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Search, 
  Lock, 
  X, 
  Check, 
  UserCheck, 
  UserX 
} from 'lucide-react';
import { formatDate } from '../../../utils/calculator';

interface StaffManagementViewProps {
  staff: any[];
  onSaveStaff: (member: any) => Promise<void>;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staff,
  onSaveStaff,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('loan_manager');
  const [department, setDepartment] = useState('Credit Underwriting');

  const openNewModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('loan_manager');
    setDepartment('Credit Underwriting');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const member = {
      id: editingStaff ? editingStaff.id : `stf_${Date.now()}`,
      fullName: name,
      email,
      phone,
      role,
      department,
      status: editingStaff ? editingStaff.status : 'active',
      lastLogin: new Date().toISOString(),
      permissions: role === 'super_admin' ? ['all'] : ['view_applications', 'approve_applications'],
    };

    await onSaveStaff(member);
    setShowModal(false);
  };

  const handleToggleStatus = async (member: any) => {
    const updated = {
      ...member,
      status: member.status === 'active' ? 'suspended' : 'active',
    };
    await onSaveStaff(updated);
  };

  const filteredStaff = staff.filter((s) => {
    return (
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Administrative Staff & RBAC Security Desk
          </h2>
          <p className="text-xs text-slate-500">Provision credit officer credentials, assign underwriting roles & enforce fine-grained access permissions.</p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Staff Officer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search staff members by name, email, or department..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((stf) => (
                <tr key={stf.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{stf.fullName}</td>
                  <td className="py-3.5 px-4 text-slate-700">{stf.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {stf.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{stf.department}</td>
                  <td className="py-3.5 px-4 text-slate-500">{formatDate(stf.lastLogin)}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      stf.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {stf.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(stf)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      {stf.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      {stf.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Provision Staff Credentials</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Neha Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="neha.sharma@dhanifinance.in"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                >
                  <option value="loan_manager">Loan Manager (Credit Committee)</option>
                  <option value="application_reviewer">Application Reviewer</option>
                  <option value="document_verifier">KYC Document Verifier</option>
                  <option value="accountant">Accountant (UPI Verification)</option>
                  <option value="support_agent">Customer Support Desk</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Credit Risk & Underwriting"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 cursor-pointer shadow-xs"
                >
                  Create Staff Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};




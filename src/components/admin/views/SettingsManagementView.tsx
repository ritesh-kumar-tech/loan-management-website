import React, { useState } from 'react';
import { 
  Building2, 
  Save, 
  QrCode, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Mail, 
  Palette 
} from 'lucide-react';
import { CompanySettings } from '../../../types';

interface SettingsManagementViewProps {
  settings: CompanySettings;
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
}

export const SettingsManagementView: React.FC<SettingsManagementViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: keyof CompanySettings, val: string) => {
    setFormData({ ...formData, [field]: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" /> NBFC Company & System Settings
          </h2>
          <p className="text-xs text-slate-500">Manage legal company entity metadata, official UPI collection VPAs, signatures, seals & statutory licenses.</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-blue-100 border border-blue-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-800" /> System Settings & Official Legal Credentials Successfully Updated!
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Entity & Branding */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" /> Legal Entity & Branding
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Company Registered Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Brand Tagline</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">RBI Registration No</label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => handleChange('registrationNumber', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* UPI Collection & Payment Gateway */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-700" /> Official UPI Collection Gateway
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Official UPI VPA ID</label>
            <input
              type="text"
              value={formData.upiId}
              onChange={(e) => handleChange('upiId', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-blue-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">UPI Account Holder Name</label>
            <input
              type="text"
              value={formData.upiAccountName}
              onChange={(e) => handleChange('upiAccountName', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Support Phone / Helpdesk</label>
            <input
              type="text"
              value={formData.supportPhone}
              onChange={(e) => handleChange('supportPhone', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Support Email</label>
            <input
              type="email"
              value={formData.supportEmail}
              onChange={(e) => handleChange('supportEmail', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>
        </div>

        {/* Signatory Credentials */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" /> Authorized Signatory & Official Seal
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Signatory Full Name</label>
            <input
              type="text"
              value={formData.authorizedSignatoryName}
              onChange={(e) => handleChange('authorizedSignatoryName', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Designation Title</label>
            <input
              type="text"
              value={formData.authorizedSignatoryTitle}
              onChange={(e) => handleChange('authorizedSignatoryTitle', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-600" /> Registered Headquarters & Branch Office
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Registered Address</label>
            <textarea
              value={formData.registeredAddress}
              onChange={(e) => handleChange('registeredAddress', e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Branch Office Address</label>
            <textarea
              value={formData.branchAddress}
              onChange={(e) => handleChange('branchAddress', e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>
        </div>
      </form>
    </div>
  );
};



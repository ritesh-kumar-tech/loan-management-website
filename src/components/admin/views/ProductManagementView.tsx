import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Edit3, 
  X, 
  Percent, 
  Coins, 
  Clock, 
  Check, 
  ShieldCheck,
  Tag
} from 'lucide-react';
import { LoanProduct } from '../../../types';
import { formatINR } from '../../../utils/calculator';

interface ProductManagementViewProps {
  products: LoanProduct[];
  onSaveProduct: (product: LoanProduct) => Promise<void>;
}

export const ProductManagementView: React.FC<ProductManagementViewProps> = ({
  products,
  onSaveProduct,
}) => {
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Product Form State
  const [pTitle, setPTitle] = useState('');
  const [pType, setPType] = useState<any>('personal');
  const [pTagline, setPTagline] = useState('');
  const [pMinAmt, setPMinAmt] = useState(20000);
  const [pMaxAmt, setPMaxAmt] = useState(500000);
  const [pMinRate, setPMinRate] = useState(6);
  const [pMaxRate, setPMaxRate] = useState(18.0);
  const [pMinTenure, setPMinTenure] = useState(6);
  const [pMaxTenure, setPMaxTenure] = useState(36);
  const [pFee, setPFee] = useState(1.5);
  const [pMinIncome, setPMinIncome] = useState(25000);
  const [pMinAge, setPMinAge] = useState(21);
  const [pMaxAge, setPMaxAge] = useState(60);

  const openEditModal = (prod: LoanProduct) => {
    setEditingProduct(prod);
    setPTitle(prod.title);
    setPType(prod.type);
    setPTagline(prod.tagline);
    setPMinAmt(prod.minAmount);
    setPMaxAmt(prod.maxAmount);
    setPMinRate(Math.max(6, prod.minRate ?? prod.minInterestRate ?? 6));
    setPMaxRate(prod.maxRate ?? prod.maxInterestRate ?? 18.0);
    setPMinTenure(prod.minTenureMonths);
    setPMaxTenure(prod.maxTenureMonths);
    setPFee(prod.processingFeePercent);
    setPMinIncome(prod.eligibility?.minIncome ?? prod.minIncome ?? 25000);
    setPMinAge(prod.eligibility?.minAge ?? prod.minAge ?? 21);
    setPMaxAge(prod.eligibility?.maxAge ?? prod.maxAge ?? 60);
    setShowAddModal(true);
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setPTitle('');
    setPType('personal');
    setPTagline('');
    setPMinAmt(20000);
    setPMaxAmt(500000);
    setPMinRate(6);
    setPMaxRate(18.0);
    setPMinTenure(6);
    setPMaxTenure(36);
    setPFee(1.5);
    setPMinIncome(25000);
    setPMinAge(21);
    setPMaxAge(60);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prodData: LoanProduct = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      title: pTitle,
      type: pType,
      tagline: pTagline,
      minAmount: Number(pMinAmt),
      maxAmount: Number(pMaxAmt),
      minRate: Number(pMinRate),
      maxRate: Number(pMaxRate),
      minInterestRate: Number(pMinRate),
      maxInterestRate: Number(pMaxRate),
      minTenureMonths: Number(pMinTenure),
      maxTenureMonths: Number(pMaxTenure),
      processingFeePercent: Number(pFee),
      isActive: editingProduct ? editingProduct.isActive : true,
      features: editingProduct ? editingProduct.features : ['Online Application Tracking', 'Transparent EMI Schedule', 'Paperless KYC Verification'],
      eligibility: {
        minIncome: Number(pMinIncome),
        minAge: Number(pMinAge),
        maxAge: Number(pMaxAge),
        employmentTypes: ['salaried', 'self_employed'],
      },
      requiredDocuments: editingProduct ? editingProduct.requiredDocuments : ['PAN Card', 'Aadhaar Card', '3 Months Bank Statement', 'Salary Slip'],
    };

    await onSaveProduct(prodData);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" /> Loan Products & Credit Policy Catalog
          </h2>
          <p className="text-xs text-slate-500">Configure interest rates, maximum loan limits, tenure ranges & eligibility thresholds for offered credit schemes.</p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Loan Product
        </button>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((prod) => (
          <div key={prod.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                    {prod.type}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{prod.title}</h3>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">{prod.tagline}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  prod.isActive ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-600'
                }`}>
                  {prod.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>

              {/* Product Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Amount Range</span>
                  <span className="font-bold text-slate-900">{formatINR(prod.minAmount)} – {formatINR(prod.maxAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Interest Rate</span>
                  <span className="font-bold text-blue-800">{prod.minRate ?? prod.minInterestRate ?? 6}% – {prod.maxRate ?? prod.maxInterestRate ?? 18.0}% p.a.</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Tenure Range</span>
                  <span className="font-bold text-slate-800">{prod.minTenureMonths} – {prod.maxTenureMonths} Months</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Processing Fee</span>
                  <span className="font-bold text-slate-800">{prod.processingFeePercent}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => openEditModal(prod)}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Configure Scheme
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingProduct ? 'Edit Loan Product Scheme' : 'Add New Loan Product Scheme'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  placeholder="e.g. Instant Personal Loan"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={pTagline}
                  onChange={(e) => setPTagline(e.target.value)}
                  placeholder="e.g. Quick funds for medical emergencies & travel"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Amount (₹)</label>
                  <input
                    type="number"
                    value={pMinAmt}
                    onChange={(e) => setPMinAmt(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Amount (₹)</label>
                  <input
                    type="number"
                    value={pMaxAmt}
                    onChange={(e) => setPMaxAmt(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={6}
                    value={pMinRate}
                    onChange={(e) => setPMinRate(Math.max(6, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pMaxRate}
                    onChange={(e) => setPMaxRate(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Processing Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pFee}
                    onChange={(e) => setPFee(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Income (₹/m)</label>
                  <input
                    type="number"
                    value={pMinIncome}
                    onChange={(e) => setPMinIncome(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 cursor-pointer shadow-xs"
                >
                  Save Loan Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



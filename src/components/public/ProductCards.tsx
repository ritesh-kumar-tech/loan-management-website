import React, { useMemo, useState } from 'react';
import { LoanProduct } from '../../types';
import { formatINR } from '../../utils/calculator';
import { UserCheck, Briefcase, Home, GraduationCap, Car, Building2, ArrowRight, Check, Info, X } from 'lucide-react';

interface ProductCardsProps {
  products: LoanProduct[];
  onSelectProduct: (productId: string) => void;
}

export const ProductCards: React.FC<ProductCardsProps> = ({ products, onSelectProduct }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMessage, setSelectionMessage] = useState('Select up to three loan products to compare.');
  const selectedProducts = useMemo(() => products.filter((product) => selectedIds.includes(product.id)), [products, selectedIds]);
  const toggleCompare = (id: string) => {
    const product = products.find((item) => item.id === id);
    setSelectedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);
        setSelectionMessage(`${product?.title || 'Loan product'} removed. ${next.length} of 3 comparison slots used.`);
        return next;
      }

      if (current.length >= 3) {
        setSelectionMessage('You can compare up to three loan products.');
        return current;
      }

      const next = [...current, id];
      setSelectionMessage(`${product?.title || 'Loan product'} selected. ${next.length} of 3 comparison slots used.`);
      return next;
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'personal': return <UserCheck className="w-6 h-6" />;
      case 'business': return <Briefcase className="w-6 h-6" />;
      case 'home': return <Home className="w-6 h-6" />;
      case 'education': return <GraduationCap className="w-6 h-6" />;
      case 'vehicle': return <Car className="w-6 h-6" />;
      default: return <Building2 className="w-6 h-6" />;
    }
  };

  return (
    <section className="df-section bg-[#F6FAFF] border-b border-blue-100">
      <div className="df-container">
        <div className="max-w-3xl mb-12">
          <span className="df-eyebrow">
            Tailored Financing Solutions
          </span>
          <h2 className="df-heading mt-4">Explore Our Loan Products</h2>
          <p className="df-copy mt-3">
            Admin-configurable loan schemes with transparent rate ranges, flexible tenure options, and secure online application tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((prod) => {
            const minRate = prod.minRate ?? prod.minInterestRate ?? 6;
            const maxRate = prod.maxRate ?? prod.maxInterestRate ?? minRate;
            return (
              <article
                key={prod.id}
                className={`group relative rounded-[22px] border p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all flex flex-col justify-between min-h-[450px] overflow-hidden ${
                  prod.isFeatured ? 'bg-white border-blue-200 ring-1 ring-blue-100' : 'bg-white border-blue-100'
                }`}
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[48px] bg-blue-50" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                      {getIcon(prod.type)}
                    </div>
                    {prod.isFeatured && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                        Featured
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-[21px] font-extrabold text-slate-950">{prod.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed line-clamp-2">{prod.tagline}</p>
                  </div>

                  <p className="text-[15px] text-slate-600 leading-relaxed line-clamp-2">{prod.description}</p>

                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                    <span className="text-xs text-blue-700 font-bold uppercase">Starting Rate</span>
                    <div className="text-3xl font-black text-blue-800 mt-1">From {minRate}% <span className="text-sm font-bold">p.a.</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs">Maximum Tenure</span>
                      <strong className="text-slate-950 font-bold">{prod.maxTenureMonths} Months</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Processing Fee</span>
                      <strong className="text-slate-950 font-bold">{prod.processingFeePercent}%</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-xs">Loan Amount</span>
                      <strong className="text-slate-950 font-bold">{formatINR(prod.minAmount)} - {formatINR(prod.maxAmount)}</strong>
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 space-y-3">
                  <label className={`min-h-11 rounded-xl border px-3 py-2 flex items-center justify-between gap-3 text-sm font-bold cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${
                    selectedIds.includes(prod.id) ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:bg-blue-50'
                  } ${selectedIds.length >= 3 && !selectedIds.includes(prod.id) ? 'opacity-55 cursor-not-allowed' : ''}`}>
                    <span className="inline-flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md border grid place-items-center ${selectedIds.includes(prod.id) ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-slate-300'}`}>
                        {selectedIds.includes(prod.id) && <Check className="w-3.5 h-3.5" />}
                      </span>
                      {selectedIds.includes(prod.id) ? 'Selected' : 'Compare'}
                    </span>
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={selectedIds.includes(prod.id)}
                      disabled={selectedIds.length >= 3 && !selectedIds.includes(prod.id)}
                      onChange={() => toggleCompare(prod.id)}
                      aria-label={`${selectedIds.includes(prod.id) ? 'Remove' : 'Compare'} ${prod.title}`}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => onSelectProduct(prod.id)} className="py-3 px-4 rounded-xl bg-white border border-blue-200 text-blue-700 font-bold text-xs uppercase tracking-wider hover:bg-blue-50 transition-all">
                    Learn More
                  </button>
                  <button
                    onClick={() => onSelectProduct(prod.id)}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 hover:from-blue-800 hover:to-blue-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Apply <ArrowRight className="w-4 h-4" />
                  </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite">{selectionMessage}</p>

        {selectedProducts.length === 0 && (
          <div className="mt-10 rounded-[20px] border border-dashed border-blue-200 bg-white/70 p-5 text-center text-sm font-semibold text-slate-600">
            Select up to three loan products to compare.
          </div>
        )}

        {selectedProducts.length === 1 && (
          <div className="mt-10 df-card p-5 animate-[fadeUp_.22s_ease-out_both]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-950">One loan selected</h3>
                <p className="text-sm text-slate-600">Select at least one more product for a useful comparison. You can still apply for the selected product.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setSelectedIds([])} className="min-h-11 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold">Clear All</button>
                <button onClick={() => onSelectProduct(selectedProducts[0].id)} className="min-h-11 px-5 rounded-xl bg-blue-700 text-white font-bold">Apply</button>
              </div>
            </div>
          </div>
        )}

        {selectedProducts.length >= 2 && (
          <section className="mt-12 w-full clear-both df-card p-4 md:p-6 animate-[fadeUp_.24s_ease-out_both]" aria-labelledby="compare-selected-loans">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 id="compare-selected-loans" className="text-2xl font-extrabold text-slate-950">Compare Selected Loans</h3>
                <p className="text-sm text-slate-500 mt-1">You can compare up to three loan products. Data updates from admin product configuration.</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-800">{selectedProducts.length} of 3 selected</span>
              <button onClick={() => { setSelectedIds([]); setSelectionMessage('Comparison selection cleared.'); }} className="min-h-11 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold inline-flex items-center gap-2">
                <X className="w-4 h-4" /> Clear
              </button>
              </div>
            </div>
            <div className="mt-5 hidden md:block overflow-x-auto rounded-2xl border border-blue-100">
              <table className="w-full min-w-[920px] text-sm">
                <caption className="sr-only">Comparison of selected loan products</caption>
                <thead className="text-left text-xs uppercase text-blue-900 bg-blue-50">
                  <tr>
                    <th className="p-3 rounded-l-xl">Product</th>
                    <th className="p-3">Amount Range</th>
                    <th className="p-3">Starting Rate</th>
                    <th className="p-3">Max Tenure</th>
                    <th className="p-3">Processing Fee</th>
                    <th className="p-3">Eligibility</th>
                    <th className="p-3">Documents</th>
                    <th className="p-3 rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {selectedProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="p-3 font-extrabold text-slate-950">{product.title}</td>
                      <td className="p-3">{formatINR(product.minAmount)} - {formatINR(product.maxAmount)}</td>
                      <td className="p-3 font-bold text-blue-800">{product.minInterestRate ?? product.minRate ?? 6}% p.a.</td>
                      <td className="p-3">{product.maxTenureMonths} months</td>
                      <td className="p-3">{product.processingFeePercent}%</td>
                      <td className="p-3">Income from {formatINR(product.minIncome ?? product.eligibility?.minIncome)}</td>
                      <td className="p-3 max-w-[260px] whitespace-normal">{(product.requiredDocs || product.requiredDocuments || []).slice(0, 3).join(', ')}</td>
                      <td className="p-3"><button onClick={() => onSelectProduct(product.id)} className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs">Apply</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden mt-5 space-y-4">
              {selectedProducts.map((product) => (
                <article key={product.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-lg font-extrabold text-slate-950">{product.title}</h4>
                    <button onClick={() => toggleCompare(product.id)} className="min-h-10 px-3 rounded-xl bg-white text-slate-600 font-bold text-sm">Remove</button>
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                    <CompareItem label="Amount range" value={`${formatINR(product.minAmount)} - ${formatINR(product.maxAmount)}`} />
                    <CompareItem label="Starting rate" value={`${product.minInterestRate ?? product.minRate ?? 6}% p.a.`} />
                    <CompareItem label="Maximum tenure" value={`${product.maxTenureMonths} months`} />
                    <CompareItem label="Processing fee" value={`${product.processingFeePercent}%`} />
                    <CompareItem label="Eligibility" value={`Income from ${formatINR(product.minIncome ?? product.eligibility?.minIncome)}`} />
                    <CompareItem label="Documents" value={(product.requiredDocs || product.requiredDocuments || []).slice(0, 4).join(', ')} />
                  </dl>
                  <button onClick={() => onSelectProduct(product.id)} className="mt-4 w-full min-h-11 rounded-xl bg-blue-700 text-white font-bold">Apply</button>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

const CompareItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-white p-3">
    <dt className="text-xs font-bold uppercase text-slate-400">{label}</dt>
    <dd className="text-sm font-bold text-slate-900 mt-1 break-words">{value}</dd>
  </div>
);


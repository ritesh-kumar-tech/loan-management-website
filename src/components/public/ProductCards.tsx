import React from 'react';
import { LoanProduct } from '../../types';
import { formatINR } from '../../utils/calculator';
import { UserCheck, Briefcase, Home, GraduationCap, Car, Building2, ArrowRight, ShieldCheck } from 'lucide-react';

interface ProductCardsProps {
  products: LoanProduct[];
  onSelectProduct: (productId: string) => void;
}

export const ProductCards: React.FC<ProductCardsProps> = ({ products, onSelectProduct }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'personal': return <UserCheck className="w-6 h-6 text-emerald-600" />;
      case 'business': return <Briefcase className="w-6 h-6 text-sky-600" />;
      case 'home': return <Home className="w-6 h-6 text-indigo-600" />;
      case 'education': return <GraduationCap className="w-6 h-6 text-purple-600" />;
      case 'vehicle': return <Car className="w-6 h-6 text-amber-600" />;
      default: return <Building2 className="w-6 h-6 text-teal-600" />;
    }
  };

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full">
            Tailored Financing Solutions
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3">Explore Our Loan Products</h2>
          <p className="text-sm text-slate-600 mt-2">
            Transparent interest rates, flexible tenure options, and instant paperless processing across India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    {getIcon(prod.type)}
                  </div>
                  {prod.isFeatured && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      Popular Choice
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{prod.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{prod.tagline}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{prod.description}</p>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Interest Rate</span>
                    <strong className="text-slate-900 font-bold text-sm">{prod.minInterestRate}% - {prod.maxInterestRate}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Max Tenure</span>
                    <strong className="text-slate-900 font-bold text-sm">{prod.maxTenureMonths} Months</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Min Monthly Salary</span>
                    <strong className="text-slate-900 font-semibold">{formatINR(prod.minIncome)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Max Limit</span>
                    <strong className="text-emerald-700 font-bold">{formatINR(prod.maxAmount)}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectProduct(prod.id)}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                Apply for {prod.title} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

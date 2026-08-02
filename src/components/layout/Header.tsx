import React, { useState, useEffect, useRef } from 'react';
import { CompanySettings, User, LoanProduct } from '../../types';
import { 
  Building2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  User as UserIcon, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronDown,
  LogOut, 
  LayoutDashboard,
  UserCheck,
  Briefcase,
  Home,
  GraduationCap,
  Car,
  Coins,
  ArrowRight,
  Calculator,
  FileCheck2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  settings: CompanySettings;
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onStartApplication: (productId?: string) => void;
  products?: LoanProduct[];
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  user,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onLogout,
  onStartApplication,
  products = [],
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loansDropdownOpen, setLoansDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLoansDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLoansDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getLoanIcon = (type: string) => {
    switch (type) {
      case 'personal': return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'business': return <Briefcase className="w-4 h-4 text-sky-600" />;
      case 'home': return <Home className="w-4 h-4 text-indigo-600" />;
      case 'education': return <GraduationCap className="w-4 h-4 text-purple-600" />;
      case 'vehicle': return <Car className="w-4 h-4 text-amber-600" />;
      case 'gold': return <Coins className="w-4 h-4 text-yellow-600" />;
      default: return <Building2 className="w-4 h-4 text-teal-600" />;
    }
  };

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'loans', label: 'Loans', hasDropdown: true },
    { id: 'calculator', label: 'EMI' },
    { id: 'apply', label: 'Apply' },
    { id: 'track', label: 'Track' },
    { id: 'verify', label: 'Verify' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      {/* Top Regulatory & Support Announcement Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-3 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1 font-medium text-emerald-400 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5" /> {settings.nbfcLicenseInfo}
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-slate-300 font-mono text-[11px]">{settings.registrationNumber}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] sm:text-xs text-slate-300">
            <a href={`tel:${settings.supportPhone}`} className="hover:text-white flex items-center gap-1 transition-colors">
              <Phone className="w-3 h-3 text-emerald-400" /> {settings.supportPhone}
            </a>
            <span className="text-slate-700">|</span>
            <a href={`mailto:${settings.supportEmail}`} className="hover:text-white flex items-center gap-1 transition-colors hidden xs:inline-flex">
              <Mail className="w-3 h-3 text-sky-400" /> {settings.supportEmail}
            </a>
          </div>
        </div>
      </div>

      {/* Primary Header Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        {/* Brand Logo */}
        <button 
          onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); setLoansDropdownOpen(false); }}
          className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform bg-gradient-to-br from-slate-900 to-slate-800">
            D
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              {settings.companyName}
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/80">
                VERIFIED
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block leading-tight">
              {settings.tagline}
            </p>
          </div>
        </button>

        {/* Desktop Navigation Links - Fits cleanly in single row */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {navItems.map((item) => {
            if (item.hasDropdown) {
              return (
                <div key={item.id} className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setLoansDropdownOpen(!loansDropdownOpen)}
                    onMouseEnter={() => setLoansDropdownOpen(true)}
                    aria-expanded={loansDropdownOpen}
                    aria-haspopup="true"
                    className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activeTab === 'loans' || loansDropdownOpen
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${loansDropdownOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`} />
                  </button>

                  {/* Mega Dropdown Menu */}
                  {loansDropdownOpen && (
                    <div 
                      onMouseLeave={() => setLoansDropdownOpen(false)}
                      className="absolute left-0 mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Products</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Paperless</span>
                      </div>

                      <div className="py-1 space-y-0.5">
                        {products.map((prod) => (
                          <button
                            key={prod.id}
                            onClick={() => {
                              onStartApplication(prod.id);
                              setLoansDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-white flex items-center justify-center transition-colors">
                                {getLoanIcon(prod.type)}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                  {prod.title}
                                </div>
                                <div className="text-[10px] text-slate-500 line-clamp-1">
                                  Up to ₹{(prod.maxAmount / 100000).toFixed(0)} Lakhs @ {prod.minInterestRate}% p.a.
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </div>

                      <div className="pt-1 border-t border-slate-100 mt-1">
                        <button
                          onClick={() => {
                            setActiveTab('loans');
                            setLoansDropdownOpen(false);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white font-semibold text-xs text-center hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          View All Products & Compare <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'apply') {
                    onStartApplication();
                  } else {
                    setActiveTab(item.id);
                  }
                  setLoansDropdownOpen(false);
                }}
                className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === item.id
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Auth / Action CTA Controls */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs cursor-pointer transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                {user.role === 'admin' ? 'Admin Portal' : 'My Loans'}
              </button>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" /> Login
              </button>
              <button
                onClick={() => onStartApplication()}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                Apply Now <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            {navItems.map((item) => {
              if (item.hasDropdown) {
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => setLoansDropdownOpen(!loansDropdownOpen)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                        activeTab === 'loans' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>Loan Products</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${loansDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {loansDropdownOpen && (
                      <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-emerald-500 my-1 bg-slate-50 rounded-r-xl">
                        {products.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              onStartApplication(p.id);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full text-left py-2 px-3 text-xs font-semibold text-slate-700 hover:text-emerald-600 flex items-center justify-between"
                          >
                            <span>{p.title}</span>
                            <span className="text-[10px] font-bold text-emerald-700">{p.minInterestRate}%</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'apply') {
                      onStartApplication();
                    } else {
                      setActiveTab(item.id);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {user ? (
              <button
                onClick={() => {
                  setActiveTab(user.role === 'admin' ? 'admin' : 'dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" /> {user.role === 'admin' ? 'Admin Portal' : 'My Loan Dashboard'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-800 font-semibold text-sm"
                >
                  Login
                </button>
                <button
                  onClick={() => { onStartApplication(); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
                >
                  Apply Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

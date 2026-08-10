import React, { useState } from 'react';
import { api } from '../../services/api';
import { CompanySettings, User } from '../../types';
import { X, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  settings: CompanySettings;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
  onUnavailable: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ settings, onClose, onAuthenticated }) => {
  const [email, setEmail] = useState('admin@dhanifinance.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter administrator email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password.trim());
      if (res.user && res.user.role === 'admin') {
        onAuthenticated(res.user);
      } else {
        setError('Access denied. This login portal is reserved strictly for Admin personnel.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid administrator email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative overflow-hidden animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Dhani Finance Admin
          </h2>
          <p className="text-xs text-slate-500 mt-1">Authorized administrator sign in portal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Administrator Email *
            </label>
            <input
              type="email"
              required
              placeholder="admin@dhanifinance.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-sm font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-sm"
            />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : <><Lock className="w-4 h-4" /> Admin Sign In</>}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
          Customers track applications via the <strong className="text-slate-600">Track Status</strong> public lookup without password login.
        </div>
      </div>
    </div>
  );
};

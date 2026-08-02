import React, { useState } from 'react';
import { CompanySettings } from '../../types';
import { X } from 'lucide-react';

interface AuthModalProps {
  settings: CompanySettings;
  onClose: () => void;
  onUnavailable: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ settings, onClose, onUnavailable }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('aniket.verma@example.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showUnavailableMessage = () => {
    setError('Login is still in progress.');
    window.alert('Login is still in progress.');
    setLoading(false);
    onUnavailable();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    showUnavailableMessage();
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setError(null);
    showUnavailableMessage();
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
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-2">
            D
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {mode === 'login' ? `Sign In to ${settings.companyName}` : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Access your loan dashboard, track status, and manage payments.</p>
        </div>

        {/* Demo Quick Logins */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-6 space-y-2 text-xs">
          <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Quick Demo Portals</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDemoLogin}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer"
            >
              Customer Demo
            </button>
            <button
              onClick={handleDemoLogin}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
            >
              Admin Portal
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aniket Verma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  required
                  placeholder="10-digit mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer shadow-md"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button onClick={() => setMode('register')} className="font-bold text-slate-900 underline cursor-pointer">
                Register here
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button onClick={() => setMode('login')} className="font-bold text-slate-900 underline cursor-pointer">
                Sign in here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

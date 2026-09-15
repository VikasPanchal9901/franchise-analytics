import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('manager@kaffeinecentral.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/app/executive', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-serif text-[20px] text-ink2 block mb-10 text-center">FranchiseOps</Link>
        <div className="panel">
          <div className="panel-body">
            <h1 className="font-serif text-[22px] text-ink2 mb-1">Welcome back</h1>
            <p className="text-[13.5px] text-muted mb-6">Sign in to your franchise dashboard.</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-medium text-ink2 mb-1.5">Email</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-ink2 mb-1.5">Password</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-[13px] text-critical-600">{error}</p>}
              <button
                type="submit" disabled={submitting}
                className="w-full bg-ink text-white py-2.5 rounded-sm text-[14px] hover:bg-ink-700 disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-line text-[12.5px] text-muted leading-relaxed">
              Demo account: <span className="text-ink2">manager@kaffeinecentral.com</span> · password <span className="text-ink2">Demo@1234</span>
            </div>
          </div>
        </div>
        <p className="text-center text-[13.5px] text-muted mt-6">
          New to FranchiseOps? <Link to="/register" className="text-teal-700 underline underline-offset-2">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

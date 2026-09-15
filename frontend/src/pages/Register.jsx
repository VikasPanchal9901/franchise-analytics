import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  { value: 'manager', label: 'Outlet Manager' },
  { value: 'regional_manager', label: 'Regional Manager' },
  { value: 'owner', label: 'Owner' },
  { value: 'analyst', label: 'Analyst' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      navigate('/app/executive', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-serif text-[20px] text-ink2 block mb-10 text-center">FranchiseOps</Link>
        <div className="panel">
          <div className="panel-body">
            <h1 className="font-serif text-[22px] text-ink2 mb-1">Create your account</h1>
            <p className="text-[13.5px] text-muted mb-6">Get access to the franchise network dashboards.</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-medium text-ink2 mb-1.5">Full name</label>
                <input
                  required value={form.name} onChange={(e) => update('name', e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="Ananya Rao"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-ink2 mb-1.5">Email</label>
                <input
                  type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-ink2 mb-1.5">Password</label>
                <input
                  type="password" required value={form.password} onChange={(e) => update('password', e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-ink2 mb-1.5">Role</label>
                <select
                  value={form.role} onChange={(e) => update('role', e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                >
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {error && <p className="text-[13px] text-critical-600">{error}</p>}
              <button
                type="submit" disabled={submitting}
                className="w-full bg-ink text-white py-2.5 rounded-sm text-[14px] hover:bg-ink-700 disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center text-[13.5px] text-muted mt-6">
          Already have an account? <Link to="/login" className="text-teal-700 underline underline-offset-2">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

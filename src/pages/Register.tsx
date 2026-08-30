import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import { Laptop } from 'lucide-react';
import { SEO } from '../components/SEO';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, token, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && token) {
      navigate('/account', { replace: true });
    }
  }, [user, token, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      login(data.token, data.user);
      navigate('/account');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-4">
      <SEO title="Create an Account" />
      <div className="w-full max-w-md bg-white border border-slate-100 p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-xl mb-4 shadow-sm">
            <Laptop className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">Create an account</h1>
          <p className="text-sm text-slate-500">Join TechShop to start shopping</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-bold transition-colors shadow-sm mt-2"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-bold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

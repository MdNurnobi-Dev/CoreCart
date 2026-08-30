import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Loader2, Save } from 'lucide-react';

export default function AdminUserForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  });

  useEffect(() => {
    if (isEdit) {
      fetchUser();
    }
  }, [isEdit]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.name || '',
          email: data.email || '',
          password: '',
          role: data.role || 'user',
          status: data.status || 'active'
        });
      } else {
        alert('User not found');
        navigate('/admin/users');
      }
    } catch (err) {
      alert('Error fetching user');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/admin/users/${id}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        navigate('/admin/users');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to save user');
      }
    } catch (err) {
      alert('Error saving user');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link 
          to="/admin/users"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight text-gray-900">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h1>
          
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Full Name</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                placeholder="e.g. john@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Password {isEdit && '(Leave blank to keep)'}</label>
              <input 
                type="password" 
                name="password"
                required={!isEdit}
                value={formData.password || ''}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Role</label>
              <select 
                name="role"
                value={formData.role || ''}
                onChange={handleChange}
                disabled={isEdit && id === user?.id?.toString()}
                className="w-full bg-white border border-gray-300 rounded-lg h-[30px] pl-2 pr-8 text-[12px] text-gray-900 focus:border-[#38BDF8] outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <Link 
            to="/admin/users"
            className="h-[28px] px-4 rounded-lg font-medium text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center text-[12px]"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-[28px] px-6 rounded-lg text-[12px] font-medium transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save User'}
          </button>
        </div>
      </form>
    </div>
  );
}

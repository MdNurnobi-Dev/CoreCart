import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Search, User, UserX, UserCheck, Shield, Trash2, Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

export default function AdminUsers() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: number, data: any) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(users.map(u => u.id === id ? updated : u));
      }
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User Account',
      message: 'Are you sure you want to completely delete this user? This action is irreversible.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setUsers(users.filter(u => u.id !== id));
          }
        } catch (err) {
          alert('Failed to delete user');
        }
        setConfirmDialog(null);
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const displayedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight text-gray-900">Users</h1>
          
        </div>
        <Link 
          to="/admin/user/new" 
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-[28px] px-3 rounded-lg text-[12px] font-medium transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> Add User
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[30px] pl-8 pr-3 text-[12px] text-gray-900 placeholder-[#8B949E] focus:border-[#38BDF8] outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-gray-50 text-gray-900 flex items-center justify-center font-bold text-[12px] shrink-0 border border-gray-200">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-[12px]">{u.name}</p>
                          <p className="text-[11px] text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${u.role === 'admin' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-white border border-gray-200 text-gray-500'}`}>
                        {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />} 
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-gray-900 text-[12px]">{new Date(u.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1.5">
                      <Link 
                        to={`/admin/user/edit/${u.id}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === user?.id}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 text-[12px]">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
          totalItems={filteredUsers.length} 
          itemsPerPage={itemsPerPage} 
        />
      </div>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

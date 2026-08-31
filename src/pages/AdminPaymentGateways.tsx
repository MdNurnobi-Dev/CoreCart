import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Smartphone, 
  Building2, 
  Banknote, 
  RefreshCw, 
  Power,
  X,
  AlertCircle,
  Upload,
  Loader2
} from 'lucide-react';

interface PaymentGateway {
  id: number;
  name: string;
  type: 'mfs' | 'card' | 'cod' | 'bank' | 'other';
  title: string;
  description: string;
  account_number: string;
  instruction: string;
  logo_url: string;
  is_active: boolean;
  fee_percent: number;
  min_amount: number;
  max_amount: number;
  created_at: string;
  updated_at: string;
}

export default function AdminPaymentGateways() {
  const { token } = useAuth();
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  // Form State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'mfs' as 'mfs' | 'card' | 'cod' | 'bank' | 'other',
    title: '',
    description: '',
    account_number: '',
    instruction: '',
    logo_url: '',
    is_active: true,
    fee_percent: 0,
    min_amount: 0,
    max_amount: 250000
  });

  useEffect(() => {
    fetchGateways();
  }, [token]);

  const fetchGateways = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/admin/payment-gateways', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setGateways(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment gateways.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (gw: PaymentGateway) => {
    try {
      const updated = await apiFetch(`/admin/payment-gateways/${gw.id}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setGateways(prev => prev.map(g => g.id === gw.id ? updated : g));
      setSuccessMsg(`"${gw.name}" status updated.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = (id: number, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Payment Gateway',
      message: `Are you sure you want to remove the payment gateway "${name}"? This will disable this payment method for checkout.`,
      onConfirm: async () => {
        try {
          await apiFetch(`/admin/payment-gateways/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setGateways(prev => prev.filter(g => g.id !== id));
          setSuccessMsg(`Gateway "${name}" removed successfully.`);
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
          alert(err.message || 'Failed to delete gateway.');
        }
        setConfirmDialog(null);
      }
    });
  };

  const openCreateModal = () => {
    setEditingGateway(null);
    setFormData({
      name: '',
      type: 'mfs',
      title: '',
      description: '',
      account_number: '',
      instruction: '',
      logo_url: '',
      is_active: true,
      fee_percent: 0,
      min_amount: 0,
      max_amount: 250000
    });
    setIsModalOpen(true);
  };

  const openEditModal = (gw: PaymentGateway) => {
    setEditingGateway(gw);
    setFormData({
      name: gw.name || '',
      type: gw.type || 'mfs',
      title: gw.title || '',
      description: gw.description || '',
      account_number: gw.account_number || '',
      instruction: gw.instruction || '',
      logo_url: gw.logo_url || '',
      is_active: gw.is_active,
      fee_percent: gw.fee_percent || 0,
      min_amount: gw.min_amount || 0,
      max_amount: gw.max_amount || 250000
    });
    setIsModalOpen(true);
  };

  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', {
        method: 'POST',
        body: form,
      });
      setFormData({ ...formData, logo_url: data.secure_url });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingGateway) {
        const updated = await apiFetch(`/admin/payment-gateways/${editingGateway.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(formData)
        });
        setGateways(prev => prev.map(g => g.id === editingGateway.id ? updated : g));
        setSuccessMsg(`Gateway "${updated.name}" updated successfully.`);
      } else {
        const created = await apiFetch('/admin/payment-gateways', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(formData)
        });
        setGateways(prev => [...prev, created]);
        setSuccessMsg(`New gateway "${created.name}" created successfully.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save gateway.');
    } finally {
      setSaving(false);
    }
  };

  const filteredGateways = gateways.filter(gw => {
    const matchesSearch = 
      gw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gw.account_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || gw.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'mfs':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-200"><Smartphone className="w-3 h-3" /> MFS Mobile</span>;
      case 'card':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"><CreditCard className="w-3 h-3" /> Card Payment</span>;
      case 'bank':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Building2 className="w-3 h-3" /> Bank Wire</span>;
      case 'cod':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><Banknote className="w-3 h-3" /> Cash on Delivery</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Other</span>;
    }
  };

  const totalCount = gateways.length;
  const activeCount = gateways.filter(g => g.is_active).length;
  const mfsCount = gateways.filter(g => g.type === 'mfs').length;

  return (
    <div className="space-y-3 p-1">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Payment Gateway Manager
          </h1>
          <p className="text-[11px] text-slate-500">Add, edit, enable/disable, and configure payment channels for customer checkout.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGateways}
            className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="px-3 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Gateway
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 bg-white border border-slate-200 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total Gateways</p>
          <p className="text-[18px] font-bold text-slate-900 mt-0.5">{totalCount}</p>
        </div>
        <div className="p-2.5 bg-white border border-slate-200 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Active Channel</p>
          <p className="text-[18px] font-bold text-emerald-600 mt-0.5">{activeCount}</p>
        </div>
        <div className="p-2.5 bg-white border border-slate-200 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Mobile Banking (MFS)</p>
          <p className="text-[18px] font-bold text-pink-600 mt-0.5">{mfsCount}</p>
        </div>
        <div className="p-2.5 bg-white border border-slate-200 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Cards & Banks</p>
          <p className="text-[18px] font-bold text-blue-600 mt-0.5">{gateways.filter(g => g.type === 'card' || g.type === 'bank').length}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-2 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col sm:flex-row gap-2 justify-between items-center">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gateway name, phone, account..."
            className="w-full h-7 pl-8 pr-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'mfs', 'card', 'bank', 'cod'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2 py-0.5 rounded text-[10.5px] font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                selectedType === t
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Gateways Table View */}
      <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3">Gateway & Title</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Merchant / Account</th>
                <th className="py-2 px-3">Fee & Limits</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11.5px] text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading payment gateways...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredGateways.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No payment gateways found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredGateways.map((gw) => (
                  <tr key={gw.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {gw.logo_url ? (
                          <img src={gw.logo_url} alt={gw.name} className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0 bg-slate-100" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 text-[12px] leading-tight">{gw.name}</p>
                          <p className="text-[10.5px] text-slate-500">{gw.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {getTypeBadge(gw.type)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                        {gw.account_number || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[10.5px]">
                        <span className="font-medium text-slate-700">Fee: {gw.fee_percent}%</span>
                        <p className="text-slate-400">Max: ৳{gw.max_amount.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(gw)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-all ${
                          gw.is_active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to toggle Active / Deactive"
                      >
                        <Power className="w-3 h-3" />
                        {gw.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(gw)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Gateway"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(gw.id, gw.name)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remove Gateway"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Gateway Compact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-md p-3.5 space-y-3 relative my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                {editingGateway ? `Edit Gateway: ${editingGateway.name}` : 'Add New Payment Gateway'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-2.5 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Gateway Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. bKash, Nagad, Stripe"
                    className="w-full h-7 bg-slate-50 border border-slate-200 rounded px-2 text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Channel Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full h-7 bg-slate-50 border border-slate-200 rounded px-1.5 text-slate-800 focus:border-blue-500 outline-none"
                  >
                    <option value="mfs">MFS Mobile Banking</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="cod">Cash on Delivery</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Display Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. bKash Personal / Merchant Account"
                  className="w-full h-7 bg-slate-50 border border-slate-200 rounded px-2 text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Account / Phone Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="e.g. 01700-000000"
                    className="w-full h-7 bg-slate-50 border border-slate-200 rounded px-2 text-slate-800 focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Gateway Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fee_percent}
                    onChange={(e) => setFormData({ ...formData, fee_percent: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full h-7 bg-slate-50 border border-slate-200 rounded px-2 text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Logo URL (Optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 h-7 bg-slate-50 border border-slate-200 rounded px-2 text-slate-800 focus:border-blue-500 outline-none"
                  />
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      disabled={uploadingImage}
                    />
                    <button 
                      type="button"
                      disabled={uploadingImage}
                      className="flex items-center gap-1 px-2 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Payment Instructions for Customer</label>
                <textarea
                  rows={2}
                  value={formData.instruction}
                  onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
                  placeholder="Send money to number, then enter your TrxID..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:border-blue-500 outline-none text-[11px]"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-800">Activate this Payment Gateway</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  {editingGateway ? 'Save Changes' : 'Create Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

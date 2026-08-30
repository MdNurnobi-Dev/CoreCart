import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tag, 
  Percent, 
  DollarSign, 
  Calendar, 
  Copy, 
  Check, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  ToggleLeft, 
  ToggleRight, 
  Megaphone, 
  RefreshCw, 
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ConfirmDialog from '../components/ConfirmDialog';

interface Coupon {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean | number;
  show_banner: boolean | number;
  banner_bg_color: string;
  created_at: string;
}

export default function AdminDiscounts() {
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  const { token } = useAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  // Form Data
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '0',
    max_discount_amount: '',
    end_date: '',
    usage_limit: '',
    is_active: true,
    show_banner: false,
    banner_bg_color: '#2563EB'
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const data = await apiFetch('/admin/coupons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCoupons(data);
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '10',
      min_order_amount: '0',
      max_discount_amount: '',
      end_date: '',
      usage_limit: '',
      is_active: true,
      show_banner: false,
      banner_bg_color: '#2563EB'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    let formattedDate = '';
    if (coupon.end_date) {
      const d = new Date(coupon.end_date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().slice(0, 16);
      }
    }

    setFormData({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || '',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: String(coupon.discount_value),
      min_order_amount: String(coupon.min_order_amount || 0),
      max_discount_amount: coupon.max_discount_amount !== null ? String(coupon.max_discount_amount) : '',
      end_date: formattedDate,
      usage_limit: coupon.usage_limit !== null ? String(coupon.usage_limit) : '',
      is_active: Boolean(coupon.is_active),
      show_banner: Boolean(coupon.show_banner),
      banner_bg_color: coupon.banner_bg_color || '#2563EB'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleGenerateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setModalError('Coupon code is required.');
      return;
    }
    if (!formData.title.trim()) {
      setModalError('Offer title is required.');
      return;
    }
    const val = parseFloat(formData.discount_value);
    if (isNaN(val) || val <= 0) {
      setModalError('Please enter a valid discount value greater than 0.');
      return;
    }

    setSaving(true);
    setModalError('');

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: val,
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: formData.is_active ? 1 : 0,
        show_banner: formData.show_banner ? 1 : 0,
        banner_bg_color: formData.banner_bg_color
      };

      if (editingCoupon) {
        await apiFetch(`/admin/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/admin/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await apiFetch(`/admin/coupons/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCoupons();
    } catch (err) {
      console.error('Failed to toggle coupon:', err);
    }
  };

  const handleDelete = (id: number, code: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Coupon',
      message: `Are you sure you want to permanently delete coupon '${code}'? Customers will no longer be able to use it.`,
      onConfirm: async () => {
        try {
          await apiFetch(`/admin/coupons/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          fetchCoupons();
        } catch (err) {
          alert('Failed to delete coupon');
        }
        setConfirmDialog(null);
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate).getTime() < Date.now();
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => Boolean(c.is_active) && !isExpired(c.end_date)).length;
    const expired = coupons.filter(c => isExpired(c.end_date)).length;
    const banners = coupons.filter(c => Boolean(c.show_banner) && Boolean(c.is_active)).length;
    return { total, active, expired, banners };
  }, [coupons]);

  // Filtered List
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchSearch = c.code.toLowerCase().includes(search.toLowerCase()) || 
                          c.title.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      const expired = isExpired(c.end_date);
      if (filterTab === 'active') return Boolean(c.is_active) && !expired;
      if (filterTab === 'inactive') return !Boolean(c.is_active);
      if (filterTab === 'expired') return expired;
      return true;
    });
  }, [coupons, search, filterTab]);

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200/90 rounded-lg p-3 shadow-2xs">
        <div>
          <h1 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" /> Offers & Coupon Codes
          </h1>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Manage promotional campaign vouchers, discount rates, flash sale offers, and top announcement banners.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="h-[30px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Create New Offer
        </button>
      </div>

      {/* Metrics Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-gray-200/80 rounded-lg p-2.5 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase">Total Offers</div>
            <div className="text-[16px] font-bold text-gray-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-lg p-2.5 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase">Active Vouchers</div>
            <div className="text-[16px] font-bold text-emerald-600">{stats.active}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-lg p-2.5 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase">Promo Banners</div>
            <div className="text-[16px] font-bold text-purple-700">{stats.banners}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-lg p-2.5 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase">Expired</div>
            <div className="text-[16px] font-bold text-amber-600">{stats.expired}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="bg-white border border-gray-200/90 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'active', 'inactive', 'expired'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors whitespace-nowrap cursor-pointer ${
                filterTab === tab
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
              }`}
            >
              {tab === 'all' ? 'All Offers' : tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code or offer title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md h-[28px] pl-8 pr-2.5 text-[11px] text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Offers & Coupons Table */}
      <div className="bg-white border border-gray-200/90 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-medium">
                <th className="px-3 py-2 text-[11px]">Voucher Code</th>
                <th className="px-3 py-2 text-[11px]">Title & Description</th>
                <th className="px-3 py-2 text-[11px]">Discount</th>
                <th className="px-3 py-2 text-[11px]">Min. Order</th>
                <th className="px-3 py-2 text-[11px]">Banner</th>
                <th className="px-3 py-2 text-[11px]">Usage</th>
                <th className="px-3 py-2 text-[11px]">Status</th>
                <th className="px-3 py-2 text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-[12px]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading coupons and offers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-[12px]">
                    No offer or coupon vouchers found. Click <strong>Create New Offer</strong> to add your first promotion.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => {
                  const expired = isExpired(coupon.end_date);
                  const active = Boolean(coupon.is_active) && !expired;

                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Code */}
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-[11px] shadow-2xs">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(coupon.code)}
                            title="Copy Code"
                            className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Title & Description */}
                      <td className="px-3 py-2.5 max-w-[220px]">
                        <div className="font-medium text-gray-900 truncate">{coupon.title}</div>
                        {coupon.description && (
                          <div className="text-[10px] text-gray-500 truncate">{coupon.description}</div>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-3 h-3" /> {coupon.discount_value}% OFF
                            </>
                          ) : (
                            <>
                              {currency}{Number(coupon.discount_value).toFixed(2)} OFF
                            </>
                          )}
                        </span>
                        {coupon.max_discount_amount && coupon.discount_type === 'percentage' && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Max cap: {currency}{Number(coupon.max_discount_amount).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Min Order */}
                      <td className="px-3 py-2.5 text-gray-600">
                        {Number(coupon.min_order_amount) > 0 ? (
                          <span>{currency}{Number(coupon.min_order_amount).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">No min</span>
                        )}
                      </td>

                      {/* Banner Indicator */}
                      <td className="px-3 py-2.5">
                        {Boolean(coupon.show_banner) ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: coupon.banner_bg_color || '#2563EB' }} />
                            Top Banner
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="px-3 py-2.5 text-gray-600 text-[11px]">
                        <span>{coupon.used_count || 0}</span>
                        {coupon.usage_limit && (
                          <span className="text-gray-400"> / {coupon.usage_limit}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        {expired ? (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                            Expired
                          </span>
                        ) : active ? (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-right space-x-1">
                        <button
                          onClick={() => handleToggleActive(coupon.id)}
                          title={active ? 'Disable Coupon' : 'Enable Coupon'}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-md border text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer ${
                            active ? 'text-emerald-600 border-emerald-200 bg-emerald-50/50' : 'text-gray-400 border-gray-200'
                          }`}
                        >
                          {active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEditModal(coupon)}
                          title="Edit Coupon"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id, coupon.code)}
                          title="Delete Coupon"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <h2 className="text-[14px] font-semibold text-gray-900">
                  {editingCoupon ? 'Edit Offer / Coupon' : 'Create New Promotional Offer'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCoupon} className="p-4 space-y-3.5 text-[12px]">
              {modalError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Coupon Code Generator */}
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="e.g. MEGA20"
                    className="flex-1 bg-white border border-gray-300 rounded-lg h-[32px] px-2.5 font-mono font-bold text-[12px] text-gray-900 uppercase focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="h-[32px] px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Auto Generate
                  </button>
                </div>
              </div>

              {/* Offer Title & Description */}
              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Offer Title / Heading <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. 20% Mega Weekend Discount"
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2.5 text-[12px] text-gray-900 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Description / Terms (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Valid on all smartphone orders above $100."
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2.5 text-[12px] text-gray-900 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/80 border border-slate-200/90 rounded-lg p-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2 text-[12px] text-gray-900 focus:border-blue-500 outline-none"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Amount Discount ({currency})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Discount Value {formData.discount_type === 'percentage' ? '(%)' : `(${currency})`} <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === 'percentage' ? '20' : '50.00'}
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2.5 text-[12px] font-bold text-emerald-700 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Conditions: Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Min Order Amount ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2.5 text-[12px] text-gray-900 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Max Discount Cap ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={formData.discount_type === 'fixed'}
                    value={formData.max_discount_amount}
                    onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                    placeholder={formData.discount_type === 'fixed' ? 'N/A' : 'e.g. 100.00'}
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2.5 text-[12px] text-gray-900 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>

              {/* Expiry Date & Usage Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Expiration Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2 text-[11px] text-gray-900 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Usage Limit (Max Redemptions)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full bg-white border border-gray-300 rounded-lg h-[32px] px-2.5 text-[12px] text-gray-900 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Toggles: Top Announcement Banner & Active */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900 text-[11px]">Display as Top Promo Banner</div>
                      <div className="text-[10px] text-gray-500">Show this offer in the announcement bar across website</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.show_banner}
                    onChange={(e) => setFormData({ ...formData, show_banner: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                {formData.show_banner && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <label className="text-[11px] font-medium text-gray-700">Banner Background Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.banner_bg_color}
                        onChange={(e) => setFormData({ ...formData, banner_bg_color: e.target.value })}
                        className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-gray-600">{formData.banner_bg_color}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-2">
                  <span className="text-[11px] font-medium text-gray-700">Offer Status (Active / Inactive)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-gray-800">
                      {formData.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Live Voucher Preview */}
              <div className="p-3 bg-linear-to-r from-blue-900 to-indigo-900 rounded-lg text-white space-y-1 shadow-xs">
                <div className="text-[10px] text-blue-200 font-semibold tracking-wider uppercase">Live Customer Voucher Preview</div>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[13px]">{formData.title || 'Special Promotional Voucher'}</div>
                  <div className="bg-white/20 backdrop-blur-xs font-mono font-bold px-2 py-0.5 rounded text-[11px] border border-white/30">
                    {formData.code || 'COUPONCODE'}
                  </div>
                </div>
                <div className="text-[11px] text-blue-100">
                  {formData.discount_type === 'percentage' ? `${formData.discount_value || 0}% Instant Discount` : `${currency}${formData.discount_value || 0} Cash Discount`}
                  {parseFloat(formData.min_order_amount) > 0 && ` on orders over ${currency}${formData.min_order_amount}`}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-[32px] px-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-[12px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-[32px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> {editingCoupon ? 'Update Offer' : 'Save Offer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

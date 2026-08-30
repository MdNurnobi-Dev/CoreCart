import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { 
  Package, 
  User as UserIcon, 
  Calendar, 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  Key, 
  CreditCard, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Camera, 
  Lock, 
  Mail, 
  Phone, 
  Building, 
  Eye, 
  EyeOff, 
  ArrowRight,
  LogOut,
  Search,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import { SEO } from '../components/SEO';

interface UserAddress {
  id: number;
  user_id: number;
  type: 'shipping' | 'billing';
  full_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_district?: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200'
];

export default function Account() {
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  const { user, token, logout, updateUser, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab ('orders' | 'addresses' | 'security' | 'track')
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    type: 'shipping' as 'shipping' | 'billing',
    full_name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_district: '',
    postal_code: '',
    country: 'Bangladesh',
    is_default: false
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressMessage, setAddressMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || ''
  });
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Security Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Track Query Inside Account
  const [trackQuery, setTrackQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  // Sync tab with URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['orders', 'addresses', 'security', 'track'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Synchronize profile form when user changes from outside
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user?.name, user?.email, user?.phone, user?.avatar_url]);

  // Fetch fresh user profile
  const fetchUserProfile = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (data && data.id) {
        updateUser(data);
        setProfileForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, [token, updateUser]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      setOrdersLoading(true);
      const data = await apiFetch('/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching user orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    if (!token) return;
    try {
      setAddressesLoading(true);
      const data = await apiFetch('/user/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  }, [token]);

  // Load user data once on mount / token change
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      navigate('/login?redirect=/account');
      return;
    }
    fetchUserProfile();
    fetchOrders();
    fetchAddresses();
  }, [token, authLoading, navigate]);

  // Copy tracking number to clipboard
  const handleCopyTracking = (trackingNum: string) => {
    navigator.clipboard.writeText(trackingNum);
    setCopiedTracking(trackingNum);
    setTimeout(() => setCopiedTracking(null), 2500);
  };

  // Profile Save
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileUpdating(true);
    setProfileMessage(null);

    try {
      const res = await apiFetch('/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });

      if (res && res.user) {
        updateUser(res.user);
        setProfileForm({
          name: res.user.name || '',
          email: res.user.email || '',
          phone: res.user.phone || '',
          avatar_url: res.user.avatar_url || ''
        });
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setProfileMessage(null), 4000);
      }
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err?.message || 'Failed to update profile' });
    } finally {
      setProfileUpdating(false);
    }
  };

  // Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    setPasswordUpdating(true);

    try {
      await apiFetch('/user/security/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      setPasswordMessage({ type: 'success', text: 'Password updated successfully! Keep your credentials safe.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMessage(null), 5000);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err?.message || 'Failed to change password. Please verify your current password.' });
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Address Handlers
  const openAddressModal = (addr?: UserAddress, defaultType: 'shipping' | 'billing' = 'shipping') => {
    setAddressMessage(null);
    if (addr) {
      setEditingAddress(addr);
      setAddressFormData({
        type: addr.type || defaultType,
        full_name: addr.full_name || '',
        phone: addr.phone || '',
        email: addr.email || '',
        address_line1: addr.address_line1 || '',
        address_line2: addr.address_line2 || '',
        city: addr.city || '',
        state_district: addr.state_district || '',
        postal_code: addr.postal_code || '',
        country: addr.country || 'Bangladesh',
        is_default: !!addr.is_default
      });
    } else {
      setEditingAddress(null);
      setAddressFormData({
        type: defaultType,
        full_name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        address_line1: '',
        address_line2: '',
        city: '',
        state_district: '',
        postal_code: '',
        country: 'Bangladesh',
        is_default: addresses.filter(a => a.type === defaultType).length === 0
      });
    }
    setIsAddressModalOpen(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSubmitting(true);
    setAddressMessage(null);

    try {
      if (editingAddress) {
        await apiFetch(`/user/addresses/${editingAddress.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addressFormData)
        });
      } else {
        await apiFetch('/user/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(addressFormData)
        });
      }

      setIsAddressModalOpen(false);
      fetchAddresses();
    } catch (err: any) {
      setAddressMessage({ type: 'error', text: err?.message || 'Failed to save address' });
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Saved Address',
      message: 'Are you sure you want to delete this address? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/user/addresses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          fetchAddresses();
        } catch (err) {
          console.error('Failed to delete address:', err);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      await apiFetch(`/user/addresses/${id}/default`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAddresses();
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      
      setUploadingAvatar(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const data = await apiFetch('/upload-image', {
          method: 'POST',
          body: form,
        });
        setProfileForm(prev => ({ ...prev, avatar_url: data.secure_url }));
      } catch (err) {
        console.error('Avatar upload failed', err);
        alert('Failed to upload avatar.');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  if (authLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center p-8 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-slate-500 font-medium text-sm">Loading your account...</p>
      </div>
    );
  }

  if (!user) return null;

  const shippingAddresses = addresses.filter(a => a.type === 'shipping');
  const billingAddresses = addresses.filter(a => a.type === 'billing');

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(orderSearch.trim()) ||
      (order.tracking_number && order.tracking_number.toLowerCase().includes(orderSearch.toLowerCase().trim())) ||
      (order.items && order.items.some((it: any) => it.product_name?.toLowerCase().includes(orderSearch.toLowerCase().trim())));

    const matchesStatus = statusFilter === 'All' || order.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-[calc(100vh-50px)] bg-slate-50 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
      <SEO title="My Account" />
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        
        {/* User Summary Top Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3.5 sm:gap-6">
          <div className="flex items-center gap-3 text-center sm:text-left w-full sm:w-auto">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              {profileForm.avatar_url ? (
                <img loading="lazy" decoding="async" 
                  src={profileForm.avatar_url} 
                  alt={user.name} 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-blue-500 shadow-2xs" 
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-lg sm:text-xl shadow-2xs">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">{user.name}</h1>
                {user.role === 'admin' && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold uppercase rounded tracking-wider">Admin</span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
              {user.phone && <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{user.phone}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              to="/track-order"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg sm:rounded-xl text-xs transition-colors border border-blue-200 shadow-2xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Track Order</span>
            </Link>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-semibold rounded-lg sm:rounded-xl text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="bg-slate-200/60 p-1 rounded-xl sm:rounded-2xl flex gap-1 overflow-x-auto scrollbar-none border border-slate-200/80">
          {[
            { id: 'orders', label: 'Order History', icon: Package, badge: orders.length },
            { id: 'addresses', label: 'Addresses', icon: MapPin },
            { id: 'security', label: 'Profile & Security', icon: ShieldCheck },
            { id: 'track', label: 'Track Package', icon: Truck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 min-w-max flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 font-bold rounded-full text-[10px] ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: ORDER HISTORY */}
        {activeTab === 'orders' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Your Purchase History</h2>
                <p className="text-[10px] sm:text-xs text-slate-500">Track and review all previous purchases.</p>
              </div>

              {/* Order Search & Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Search order ID or item..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-7 pr-2.5 py-1.5 text-[11px] sm:text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-2.5 py-1.5 text-[11px] sm:text-xs text-slate-700 outline-none focus:border-blue-500 font-medium cursor-pointer shrink-0"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {ordersLoading ? (
              <div className="bg-white p-8 sm:p-12 rounded-xl sm:rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center shadow-2xs">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-blue-600 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">No orders placed yet</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 mb-4">
                  Discover our top laptops and smartphones and place your first order.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Start Shopping</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center shadow-2xs">
                <p className="text-xs text-slate-500 font-medium">No orders matched your search filters.</p>
                <button
                  onClick={() => { setOrderSearch(''); setStatusFilter('All'); }}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3.5">
                {filteredOrders.map(order => {
                  const statusColors = {
                    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Shipped: 'bg-blue-50 text-blue-700 border-blue-200',
                    Paid: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    Processing: 'bg-amber-50 text-amber-700 border-amber-200',
                    Cancelled: 'bg-red-50 text-red-700 border-red-200'
                  }[order.status as string] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <div 
                      key={order.id} 
                      className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs transition-all hover:border-slate-300"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">Order #{order.id}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors}`}>
                              {order.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{order.payment_method}</span>
                            {order.tracking_number && (
                              <>
                                <span>•</span>
                                <div className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono text-slate-700 transition-colors">
                                  <span>Tracking: {order.tracking_number}</span>
                                  <button
                                    onClick={() => handleCopyTracking(order.tracking_number)}
                                    className="text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                                    title="Copy Tracking Number"
                                  >
                                    {copiedTracking === order.tracking_number ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-1 sm:pt-0">
                          <div>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Amount</p>
                            <p className="text-sm sm:text-base font-bold text-blue-600">
                              {currency}{(Number(order.total_amount)).toFixed(2)}
                            </p>
                          </div>
                          <Link
                            to={`/track-order/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-2xs"
                          >
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Track Package</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </Link>
                        </div>
                      </div>

                      {/* Purchased Items List */}
                      {order.items && order.items.length > 0 && (
                        <div className="pt-2.5 sm:pt-3.5">
                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Items Ordered ({order.items.length})</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg sm:rounded-xl bg-slate-50/90 border border-slate-100">
                                <img loading="lazy" decoding="async" 
                                  src={item.product_image || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=100'} 
                                  alt={item.product_name} 
                                  className="w-9 h-9 object-cover rounded-md sm:rounded-lg bg-white border border-slate-200 shrink-0" 
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate" title={item.product_name}>
                                    {item.product_name}
                                  </p>
                                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                                    <span>Qty: <b className="text-slate-700">{item.quantity}</b></span>
                                    <span className="font-semibold text-slate-900">{currency}{Number(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Shipping Address Note */}
                      {order.shipping_address && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[10px] sm:text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate"><b>Delivery to:</b> {order.shipping_address}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADDRESSES (BILLING & SHIPPING) */}
        {activeTab === 'addresses' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Address Book</h2>
                <p className="text-[10px] sm:text-xs text-slate-500">Manage your shipping and billing addresses for fast checkout.</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => openAddressModal(undefined, 'shipping')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg sm:rounded-xl text-[11px] sm:text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Shipping Address</span>
                </button>
                <button
                  onClick={() => openAddressModal(undefined, 'billing')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg sm:rounded-xl text-[11px] sm:text-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Billing Address</span>
                </button>
              </div>
            </div>

            {/* Shipping Addresses Section */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Shipping Addresses</h3>
              </div>

              {addressesLoading ? (
                <div className="bg-white p-6 rounded-xl sm:rounded-2xl border border-slate-200 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading addresses...</span>
                </div>
              ) : shippingAddresses.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl sm:rounded-2xl p-5 text-center shadow-2xs">
                  <MapPin className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-600 font-medium">No shipping address added yet.</p>
                  <button 
                    onClick={() => openAddressModal(undefined, 'shipping')} 
                    className="mt-1.5 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add your delivery address
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {shippingAddresses.map(addr => (
                    <div 
                      key={addr.id} 
                      className={`bg-white border rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-2xs transition-all relative flex flex-col justify-between ${
                        addr.is_default ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">{addr.full_name}</span>
                            {addr.is_default && (
                              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold">
                                Default
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {addr.address_line1} {addr.address_line2 && `(${addr.address_line2})`}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {addr.city}{addr.state_district ? `, ${addr.state_district}` : ''} {addr.postal_code && `- ${addr.postal_code}`}
                        </p>
                        <p className="text-[11px] text-slate-500">{addr.country}</p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {addr.phone && <span className="flex items-center gap-1 font-medium text-slate-700"><Phone className="w-3 h-3 text-slate-400" /> {addr.phone}</span>}
                          {addr.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {addr.email}</span>}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        {!addr.is_default ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            Set as Default
                          </button>
                        ) : <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Primary Address</span>}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openAddressModal(addr)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing Addresses Section */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center gap-1.5 mb-2.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Billing Addresses</h3>
              </div>

              {addressesLoading ? (
                <div className="bg-white p-6 rounded-xl sm:rounded-2xl border border-slate-200 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading addresses...</span>
                </div>
              ) : billingAddresses.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl sm:rounded-2xl p-5 text-center shadow-2xs">
                  <Building className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-600 font-medium">No separate billing address added yet.</p>
                  <button 
                    onClick={() => openAddressModal(undefined, 'billing')} 
                    className="mt-1.5 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add billing address for invoices
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {billingAddresses.map(addr => (
                    <div 
                      key={addr.id} 
                      className={`bg-white border rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-2xs transition-all relative flex flex-col justify-between ${
                        addr.is_default ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">{addr.full_name}</span>
                            {addr.is_default && (
                              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold">
                                Default
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {addr.address_line1} {addr.address_line2 && `(${addr.address_line2})`}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {addr.city}{addr.state_district ? `, ${addr.state_district}` : ''} {addr.postal_code && `- ${addr.postal_code}`}
                        </p>
                        <p className="text-[11px] text-slate-500">{addr.country}</p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {addr.phone && <span className="flex items-center gap-1 font-medium text-slate-700"><Phone className="w-3 h-3 text-slate-400" /> {addr.phone}</span>}
                          {addr.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {addr.email}</span>}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        {!addr.is_default ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            Set as Default
                          </button>
                        ) : <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Primary Billing</span>}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openAddressModal(addr)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROFILE & SECURITY */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            
            {/* Left Col: Profile Details & Photo */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                <UserIcon className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Personal Information & Photo</h2>
              </div>

              {profileMessage && (
                <div className={`mb-3.5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl flex items-center gap-2 text-xs font-medium ${
                  profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-3 sm:space-y-4">
                {/* Avatar Uploader & Presets */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5">Profile Photo / Avatar</label>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative group shrink-0">
                      {profileForm.avatar_url ? (
                        <img loading="lazy" decoding="async" 
                          src={profileForm.avatar_url} 
                          alt="Avatar" 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-blue-500 shadow-2xs" 
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-2xs transition-transform active:scale-90">
                        <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 mb-1">Preset Avatars:</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <img
                            key={idx}
                            src={preset}
                            alt="Preset"
                            onClick={() => setProfileForm(p => ({ ...p, avatar_url: preset }))}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover cursor-pointer border-2 transition-all hover:scale-110 ${
                              profileForm.avatar_url === preset ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+880 1700 000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={profileUpdating || uploadingAvatar}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {profileUpdating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Col: Password & Account Security */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900">Security & Password</h2>
                </div>

                {passwordMessage && (
                  <div className={`mb-3.5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl flex items-center gap-2 text-xs font-medium ${
                    passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {passwordMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Current Password</label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-9 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Min 6 characters"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-1.5">
                    <button
                      type="submit"
                      disabled={passwordUpdating}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {passwordUpdating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Hint */}
              <div className="mt-4 p-2.5 sm:p-3 bg-blue-50/60 border border-blue-100 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] text-blue-900 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>We recommend using strong passwords with mixed letters, digits, and special characters to protect your account.</span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: QUICK TRACK */}
        {activeTab === 'track' && (
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-2xs text-center max-w-xl mx-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5 border border-blue-100">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">Track An Order</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 mb-4 sm:mb-6">
              Enter any of your Order IDs (e.g. <b>#1001</b>) or Courier Tracking Codes to inspect delivery updates.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (trackQuery.trim()) {
                  navigate(`/track-order/${encodeURIComponent(trackQuery.trim())}`);
                }
              }}
              className="flex gap-1.5 sm:gap-2"
            >
              <input
                type="text"
                value={trackQuery}
                onChange={e => setTrackQuery(e.target.value)}
                placeholder="Enter Order ID / Tracking Number..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
              />
              <button
                type="submit"
                disabled={!trackQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs transition-colors disabled:opacity-50 shrink-0 cursor-pointer shadow-2xs"
              >
                Track
              </button>
            </form>
          </div>
        )}

      </div>

      {/* ADDRESS ADD / EDIT MODAL */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xl max-w-lg w-full p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>{editingAddress ? 'Edit Address' : 'Add New Address'}</span>
              </h3>
              <button 
                onClick={() => setIsAddressModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addressMessage && (
              <div className="mb-3 p-2.5 rounded-lg sm:rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{addressMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAddressSubmit} className="space-y-3">
              {/* Address Type Toggle */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Address Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddressFormData(a => ({ ...a, type: 'shipping' }))}
                    className={`py-1.5 px-2.5 rounded-lg sm:rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      addressFormData.type === 'shipping' 
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Shipping Address</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressFormData(a => ({ ...a, type: 'billing' }))}
                    className={`py-1.5 px-2.5 rounded-lg sm:rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      addressFormData.type === 'billing' 
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Billing Address</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Recipient / Business Full Name *</label>
                <input
                  type="text"
                  required
                  value={addressFormData.full_name}
                  onChange={e => setAddressFormData(a => ({ ...a, full_name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={addressFormData.phone}
                    onChange={e => setAddressFormData(a => ({ ...a, phone: e.target.value }))}
                    placeholder="+880 1700 000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={addressFormData.email}
                    onChange={e => setAddressFormData(a => ({ ...a, email: e.target.value }))}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Street Address / House & Road *</label>
                <input
                  type="text"
                  required
                  value={addressFormData.address_line1}
                  onChange={e => setAddressFormData(a => ({ ...a, address_line1: e.target.value }))}
                  placeholder="House 12, Road 4, Block C"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Apartment, Suite, Unit (Optional)</label>
                <input
                  type="text"
                  value={addressFormData.address_line2}
                  onChange={e => setAddressFormData(a => ({ ...a, address_line2: e.target.value }))}
                  placeholder="Apt 4B"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">City / Division *</label>
                  <input
                    type="text"
                    required
                    value={addressFormData.city}
                    onChange={e => setAddressFormData(a => ({ ...a, city: e.target.value }))}
                    placeholder="Dhaka"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={addressFormData.postal_code}
                    onChange={e => setAddressFormData(a => ({ ...a, postal_code: e.target.value }))}
                    placeholder="1212"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_default_addr"
                  checked={addressFormData.is_default}
                  onChange={e => setAddressFormData(a => ({ ...a, is_default: e.target.checked }))}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="is_default_addr" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Set as default {addressFormData.type} address
                </label>
              </div>

              <div className="pt-2.5 flex gap-2 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg sm:rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg sm:rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {addressSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingAddress ? 'Update Address' : 'Save Address'}</span>
                  )}
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
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        isDanger={confirmDialog?.isDanger}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

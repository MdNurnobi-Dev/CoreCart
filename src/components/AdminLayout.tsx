import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLogin from '../pages/AdminLogin';
import { apiFetch } from '../lib/utils';
import ErrorBoundary from './ErrorBoundary';
import { 
  Star,
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  FileText, 
  Tags, 
  Menu, 
  X, 
  LogOut, 
  MessageSquare,
  Inbox,
  Wrench,
  CreditCard,
  FileCheck2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Receipt,
  PlusCircle,
  Tag,
  Percent,
  Sliders,
  Palette,
  LayoutTemplate,
  Image as ImageIcon,
  ShieldAlert,
  Headphones,
  TrendingUp,
  Bell,
  Webhook,
  FileSignature,
  ToggleLeft,
  UserPlus,
  HelpCircle
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout, token, loading } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Group Collapsible States
  const [isProductsOpen, setIsProductsOpen] = useState(true);
  const [isOrdersOpen, setIsOrdersOpen] = useState(true);
  const [isCommsOpen, setIsCommsOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(true);
  const [isSystemOpen, setIsSystemOpen] = useState(true);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUnreadCount();
      fetchLowStockCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchLowStockCount();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchUnreadCount = async () => {
    try {
      const data = await apiFetch('/admin/support-messages/unread-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (data && typeof data.count === 'number') {
        setUnreadSupportCount(data.count);
      }
    } catch {
      // Ignore background poll errors
    }
  };

  const fetchLowStockCount = async () => {
    try {
      const data = await apiFetch('/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (data && typeof data.low_stock_count === 'number') {
        setLowStockCount(data.low_stock_count);
      }
    } catch {
      // Ignore
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <AdminLogin />;
  }

  // Active group indicators
  const isProductsActive = ['/admin/products', '/admin/product/new', '/admin/categories', '/admin/discounts', '/admin/reviews'].some(path => location.pathname.startsWith(path));
  const isOrdersActive = ['/admin/orders', '/admin/manual-payments', '/admin/payment-gateways', '/admin/invoice-template'].some(path => location.pathname.startsWith(path));
  const isCommsActive = ['/admin/support-messages', '/admin/live-chat'].some(path => location.pathname.startsWith(path));
  const isNotificationsActive = ['/admin/notifications'].some(path => location.pathname.startsWith(path));
  const isCustomizeActive = ['/admin/customize'].some(path => location.pathname.startsWith(path));
  const isSystemActive = ['/admin/users', '/admin/pages', '/admin/settings', '/admin/manage'].some(path => location.pathname.startsWith(path));

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-50 z-50">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-20 h-[44px]">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-blue-600" /> Admin Control
        </h2>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 text-slate-600 bg-slate-100 rounded-md cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Compact Structured Sidebar */}
        <aside className={`
          absolute md:static inset-y-0 left-0 z-30 w-[205px] bg-white border-r border-gray-200 
          flex flex-col transform transition-transform duration-100 ease-in-out h-full
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="px-3.5 py-2.5 border-b border-gray-200 hidden md:flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.06em] leading-tight">Admin Control</h2>
            <span className="text-[9px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded border border-blue-100">PRO</span>
          </div>

          <nav className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-compact">
            
            {/* Dashboard Single Link */}
            <NavLink
              to="/admin"
              end
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `flex items-center justify-between px-2 min-h-[28px] rounded-md text-[11.5px] font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600' 
                    : 'text-gray-600 border-l-2 border-transparent hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-[14px] h-[14px] text-blue-600" />
                <span>Dashboard</span>
              </div>
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white animate-pulse" title={`${lowStockCount} products low or out of stock`}>
                  {lowStockCount}
                </span>
              )}
            </NavLink>

            {/* Analytics & Reports Link */}
            <NavLink
              to="/admin/analytics"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => 
                `flex items-center justify-between px-2 min-h-[28px] rounded-md text-[11.5px] font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600' 
                    : 'text-gray-600 border-l-2 border-transparent hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-[14px] h-[14px] text-emerald-600" />
                <span>Analytics & Trends</span>
              </div>
              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                30D
              </span>
            </NavLink>

            {/* 1. PRODUCTS & CATALOG GROUP */}
            <div className="space-y-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsProductsOpen(!isProductsOpen)}
                className={`w-full flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-bold tracking-tight uppercase transition-colors cursor-pointer ${
                  isProductsActive ? 'text-blue-700 bg-blue-50/40' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Products</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {lowStockCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white" title={`${lowStockCount} products need attention`}>
                      {lowStockCount}
                    </span>
                  )}
                  {isProductsOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                </div>
              </button>

              {isProductsOpen && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-slate-200 ml-2.5 my-0.5">
                  <NavLink
                    to="/admin/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-slate-400" />
                      <span>All Products</span>
                    </div>
                    {lowStockCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {lowStockCount}
                      </span>
                    )}
                  </NavLink>

                  <NavLink
                    to="/admin/product/new"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <PlusCircle className="w-3 h-3 text-emerald-500" />
                      <span>Add Product</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/categories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Tags className="w-3 h-3 text-purple-500" />
                      <span>Categories</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/discounts"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-rose-500" />
                      <span>Offers & Coupons</span>
                    </div>
                    <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1 py-0.2 rounded border border-rose-200">
                      %
                    </span>
                  </NavLink>
                  <NavLink
                    to="/admin/reviews"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      <span>Reviews</span>
                    </div>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 2. ORDERS & FINANCE GROUP */}
            <div className="space-y-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsOrdersOpen(!isOrdersOpen)}
                className={`w-full flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-bold tracking-tight uppercase transition-colors cursor-pointer ${
                  isOrdersActive ? 'text-emerald-700 bg-emerald-50/40' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Orders & Payments</span>
                </div>
                {isOrdersOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
              </button>

              {isOrdersOpen && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-slate-200 ml-2.5 my-0.5">
                  <NavLink
                    to="/admin/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-3 h-3 text-blue-500" />
                      <span>All Orders</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/manual-payments"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3 h-3 text-amber-600" />
                      <span>Manual Payments</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/payment-gateways"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3 text-emerald-600" />
                      <span>Payment Gateways</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/invoice-template"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-3 h-3 text-indigo-500" />
                      <span>Invoice Template</span>
                    </div>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 3. COMMUNICATIONS & SUPPORT GROUP */}
            <div className="space-y-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsCommsOpen(!isCommsOpen)}
                className={`w-full flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-bold tracking-tight uppercase transition-colors cursor-pointer ${
                  isCommsActive ? 'text-indigo-700 bg-indigo-50/40' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Support & Chat</span>
                </div>
                {isCommsOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
              </button>

              {isCommsOpen && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-slate-200 ml-2.5 my-0.5">
                  <NavLink
                    to="/admin/support-messages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Inbox className="w-3 h-3 text-blue-600" />
                      <span>Support Inbox</span>
                    </div>
                    {Boolean(unreadSupportCount > 0) && (
                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                        {unreadSupportCount}
                      </span>
                    )}
                  </NavLink>

                  <NavLink
                    to="/admin/live-chat"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-emerald-500" />
                      <span>Live Chat</span>
                    </div>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 4. NOTIFICATIONS & ALERTS GROUP */}
            <div className="space-y-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`w-full flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-bold tracking-tight uppercase transition-colors cursor-pointer ${
                  isNotificationsActive ? 'text-amber-700 bg-amber-50/40' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Notifications</span>
                </div>
                {isNotificationsOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
              </button>

              {isNotificationsOpen && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-slate-200 ml-2.5 my-0.5">
                  <NavLink
                    to="/admin/notifications/api"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Webhook className="w-3 h-3 text-slate-400" />
                      <span>Configure API & SMTP</span>
                    </div>
                  </NavLink>
                  
                  <NavLink
                    to="/admin/notifications/templates"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <FileSignature className="w-3 h-3 text-slate-400" />
                      <span>Notification Templates</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/notifications/control"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <ToggleLeft className="w-3 h-3 text-slate-400" />
                      <span>Notification Control</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/notifications/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="w-3 h-3 text-slate-400" />
                      <span>User Signup Method</span>
                    </div>
                  </NavLink>
                </div>
              )}
            </div>

            
            {/* 6. CUSTOMIZE GROUP */}
            <div className="space-y-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                className={`w-full flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-bold tracking-tight uppercase transition-colors cursor-pointer ${
                  isCustomizeActive ? 'text-slate-800 bg-slate-100/60' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-pink-500" />
                  <span>Customize</span>
                </div>
                {isCustomizeOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
              </button>
              {isCustomizeOpen && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-slate-200 ml-2.5 my-0.5">
                  <NavLink
                    to="/admin/customize/banners"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-emerald-500" />
                      <span>Banners</span>
                    </div>
                  </NavLink>
                  <NavLink
                    to="/admin/customize/home"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <LayoutTemplate className="w-3 h-3 text-indigo-500" />
                      <span>Home Page</span>
                    </div>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 5. SETTINGS & SYSTEM GROUP */}
            <div className="space-y-0.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsSystemOpen(!isSystemOpen)}
                className={`w-full flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-bold tracking-tight uppercase transition-colors cursor-pointer ${
                  isSystemActive ? 'text-slate-800 bg-slate-100/60' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-600" />
                  <span>System & CMS</span>
                </div>
                {isSystemOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
              </button>

              {isSystemOpen && (
                <div className="pl-3.5 pr-1 space-y-0.5 border-l border-slate-200 ml-2.5 my-0.5">
                  <NavLink
                    to="/admin/users"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-blue-500" />
                      <span>Users</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/pages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-amber-500" />
                      <span>Custom Pages</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Settings className="w-3 h-3 text-slate-500" />
                      <span>Store Settings</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/admin/manage"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center justify-between px-2 min-h-[26px] rounded-md text-[11px] font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-purple-500" />
                      <span>Database & Sync</span>
                    </div>
                  </NavLink>
                </div>
              )}
            </div>

          </nav>

          <div className="p-2 border-t border-gray-200 flex items-center gap-1">
             <button 
                onClick={() => logout()}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 min-h-[28px] rounded-md text-[11.5px] font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
             >
                <LogOut className="w-[13px] h-[13px]" /> Logout
             </button>
             <NavLink 
                to="/admin/help"
                className={({isActive}) => `flex-1 flex items-center justify-center gap-1.5 px-2 min-h-[28px] rounded-md text-[11.5px] font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
             >
                <HelpCircle className="w-[13px] h-[13px]" /> Help
             </NavLink>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto h-full bg-gray-50 text-gray-900">
          <div className="max-w-[1280px] mx-auto">
            <ErrorBoundary isNested title="Failed to render admin view">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}


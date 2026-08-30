import React, { useState, useEffect } from 'react';
import { ToggleLeft, Save, ShieldAlert, Users, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminNotificationControl() {
  const [controls, setControls] = useState<Record<string, boolean>>({});
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch configs to check if any are verified
      const configRes = await fetch('/api/admin/notification-configs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let hasVerifiedConfig = false;
      if (configRes.ok) {
        const configs = await configRes.json();
        hasVerifiedConfig = configs.some((c: any) => c.is_active && c.is_verified);
      }
      setIsConfigured(hasVerifiedConfig);

      // Fetch current settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        const savedControls = settings.notification_controls ? JSON.parse(settings.notification_controls) : {};
        
        // Defaults
        setControls({
          order_placed: savedControls.order_placed ?? true,
          order_shipped: savedControls.order_shipped ?? true,
          welcome_email: savedControls.welcome_email ?? true,
          abandoned_cart: savedControls.abandoned_cart ?? false,
          admin_new_order: savedControls.admin_new_order ?? true,
          admin_low_stock: savedControls.admin_low_stock ?? true,
          admin_new_user: savedControls.admin_new_user ?? false,
          admin_new_ticket: savedControls.admin_new_ticket ?? true,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggle = (key: string) => {
    if (!isConfigured) return;
    setControls(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/notification-controls', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ controls })
      });
      
      if (res.ok) {
        showNotification('success', 'Preferences saved successfully');
      } else {
        showNotification('error', 'Failed to save preferences');
      }
    } catch (err) {
      showNotification('error', 'Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div>
          <h1 className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-blue-600" />
            Notification Control
          </h1>
          <p className="text-[11px] text-slate-500">Enable or disable specific notifications for admins and users</p>
        </div>
        <button 
          onClick={savePreferences}
          disabled={isSaving || !isConfigured}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
      
      {notification && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 \${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {!isConfigured && !isLoading && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[13px] font-bold text-amber-900">Notification Channels Not Configured</h3>
              <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">
                You must configure and verify at least one active notification provider (SMTP, Telegram, or Webhook) before enabling notification preferences. Please visit the configuration page first.
              </p>
              <Link to="/admin/notifications/api" className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100/50 hover:bg-amber-100 px-3 py-1.5 rounded transition-colors">
                Configure API & SMTP <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className={`grid md:grid-cols-2 gap-4 \${!isConfigured ? 'opacity-50 pointer-events-none grayscale-[50%]' : ''}`}>
            
            {/* User Notifications */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h2 className="text-[12px] font-bold text-slate-800">Customer Notifications</h2>
              </div>
              <div className="divide-y divide-slate-100">
                <ToggleRow title="Order Placed Email" desc="Send confirmation email when customer places an order" active={controls.order_placed} onClick={() => handleToggle('order_placed')} />
                <ToggleRow title="Order Shipped SMS/Email" desc="Notify when tracking info is added" active={controls.order_shipped} onClick={() => handleToggle('order_shipped')} />
                <ToggleRow title="Account Welcome Email" desc="Send welcome email on new signup" active={controls.welcome_email} onClick={() => handleToggle('welcome_email')} />
                <ToggleRow title="Abandoned Cart Reminder" desc="Automated reminder for unpurchased carts" active={controls.abandoned_cart} onClick={() => handleToggle('abandoned_cart')} />
              </div>
            </div>

            {/* Admin Notifications */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-600" />
                <h2 className="text-[12px] font-bold text-slate-800">Admin Alerts</h2>
              </div>
              <div className="divide-y divide-slate-100">
                <ToggleRow title="New Order Received" desc="Get notified when a new order is placed" active={controls.admin_new_order} onClick={() => handleToggle('admin_new_order')} />
                <ToggleRow title="Low Stock Warning" desc="Alert when product inventory falls below threshold" active={controls.admin_low_stock} onClick={() => handleToggle('admin_low_stock')} />
                <ToggleRow title="New User Registration" desc="Alert when a new customer creates an account" active={controls.admin_new_user} onClick={() => handleToggle('admin_new_user')} />
                <ToggleRow title="New Support Ticket" desc="Alert on incoming chat or support message" active={controls.admin_new_ticket} onClick={() => handleToggle('admin_new_ticket')} />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, active, onClick }: { title: string, desc: string, active: boolean, onClick: () => void }) {
  return (
    <div className="p-4 flex items-start justify-between gap-4">
      <div>
        <div className="text-[12px] font-bold text-slate-800">{title}</div>
        <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
      <button 
        onClick={onClick}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none \${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out \${active ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

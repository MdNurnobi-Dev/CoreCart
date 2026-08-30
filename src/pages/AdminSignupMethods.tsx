import React, { useState, useEffect } from 'react';
import { UserPlus, Save, ShieldCheck, Mail, MessageSquare, Fingerprint, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminSignupMethods() {
  const [selectedMethod, setSelectedMethod] = useState('none');
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
      // Fetch configs to check if any are verified for OTP
      const configRes = await fetch('/api/admin/notification-configs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let hasVerifiedConfig = false;
      if (configRes.ok) {
        const configs = await configRes.json();
        hasVerifiedConfig = configs.some((c: any) => c.is_active && c.is_verified && (c.type === 'smtp' || c.type === 'webhook'));
      }
      setIsConfigured(hasVerifiedConfig);

      // Fetch current settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings.signup_method) {
          setSelectedMethod(settings.signup_method);
        }
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

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/notification-controls', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ signup_method: selectedMethod })
      });
      
      if (res.ok) {
        showNotification('success', 'Signup method saved successfully');
      } else {
        showNotification('error', 'Failed to save signup method');
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
            <UserPlus className="w-4 h-4 text-blue-600" />
            User Signup Method
          </h1>
          <p className="text-[11px] text-slate-500">Configure verification requirements for new customer registrations</p>
        </div>
        <button 
          onClick={saveConfiguration}
          disabled={isSaving}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {notification && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 \${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-1">
              
              <MethodOption 
                id="none"
                title="No Verification (Current)"
                desc="Users can sign up and login immediately without verifying their email or phone."
                icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
                selected={selectedMethod === 'none'}
                onClick={() => setSelectedMethod('none')}
              />
              
              <MethodOption 
                id="email_otp"
                title="Custom Email OTP"
                desc="Send a 6-digit OTP to the user's email via your configured SMTP server."
                icon={<Mail className="w-5 h-5 text-blue-500" />}
                selected={selectedMethod === 'email_otp'}
                onClick={() => setSelectedMethod('email_otp')}
                disabled={!isConfigured}
              />
              
              <MethodOption 
                id="firebase_link"
                title="Firebase Email Link (Passwordless)"
                desc="Send a secure sign-in link using Firebase Auth. No password required."
                icon={<Fingerprint className="w-5 h-5 text-purple-500" />}
                selected={selectedMethod === 'firebase_link'}
                onClick={() => setSelectedMethod('firebase_link')}
              />
              
              <MethodOption 
                id="sms_otp"
                title="SMS Phone Verification"
                desc="Verify user accounts via SMS OTP (Requires external SMS API gateway configuration)."
                icon={<MessageSquare className="w-5 h-5 text-amber-500" />}
                selected={selectedMethod === 'sms_otp'}
                onClick={() => setSelectedMethod('sms_otp')}
                disabled={!isConfigured}
              />

            </div>

            {selectedMethod !== 'none' && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="text-[12px] font-bold text-amber-900 mb-1">Configuration Required</h4>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Enabling verification requires valid credentials. Make sure you have configured your <Link to="/admin/notifications/api" className="underline font-semibold">SMTP/API Settings</Link> or Firebase project before enforcing this rule, otherwise users won't be able to register.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MethodOption({ id, title, desc, icon, selected, onClick, disabled = false }: any) {
  return (
    <div 
      onClick={() => { if (!disabled) onClick(); }}
      className={`p-4 flex gap-4 transition-colors border-b border-slate-100 last:border-0 rounded-md \${
        disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 
        selected ? 'bg-blue-50/50 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer'
      }`}
    >
      <div className="pt-0.5 shrink-0">
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center \${selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
          {selected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
        </div>
      </div>
      <div className="shrink-0 mt-[-2px]">
        {icon}
      </div>
      <div>
        <div className={`text-[13px] font-bold \${selected ? 'text-blue-900' : 'text-slate-800'}`}>
          {title} 
          {disabled && <span className="ml-2 text-[10px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Requires Config</span>}
        </div>
        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

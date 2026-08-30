import React, { useState, useEffect } from 'react';
import { Webhook, Mail, MessageCircle, Save, CheckCircle2, Server, Key, Send, Loader2, AlertTriangle, Plus, Trash2 } from 'lucide-react';

export default function AdminNotificationAPI() {
  const [activeTab, setActiveTab] = useState<'smtp' | 'telegram' | 'webhook'>('smtp');
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/notification-configs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
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

  const getActiveConfig = () => {
    const active = configs.find(c => c.type === activeTab);
    return active || {
      id: null,
      type: activeTab,
      name: `Default ${activeTab.toUpperCase()}`,
      credentials: {},
      is_active: false,
      is_verified: false
    };
  };

  const handleUpdateCreds = (key: string, value: any) => {
    const config = getActiveConfig();
    const updatedCreds = { ...config.credentials, [key]: value };
    const updatedConfig = { ...config, credentials: updatedCreds };
    
    // Update locally
    const exists = configs.find(c => c.type === activeTab);
    if (exists) {
      setConfigs(configs.map(c => c.type === activeTab ? updatedConfig : c));
    } else {
      setConfigs([...configs, updatedConfig]);
    }
  };

  const handleUpdateConfig = (key: string, value: any) => {
    const config = getActiveConfig();
    const updatedConfig = { ...config, [key]: value };
    
    const exists = configs.find(c => c.type === activeTab);
    if (exists) {
      setConfigs(configs.map(c => c.type === activeTab ? updatedConfig : c));
    } else {
      setConfigs([...configs, updatedConfig]);
    }
  };

  const saveConfig = async () => {
    const config = getActiveConfig();
    setIsSaving(true);
    try {
      const url = config.id ? `/api/admin/notification-configs/${config.id}` : '/api/admin/notification-configs';
      const method = config.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (res.ok) {
        showNotification('success', 'Configuration saved successfully');
        fetchConfigs();
      } else {
        showNotification('error', 'Failed to save configuration');
      }
    } catch (err) {
      showNotification('error', 'Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    const config = getActiveConfig();
    if (!config.id) {
      showNotification('error', 'Please save the configuration first before testing.');
      return;
    }
    
    try {
      showNotification('success', 'Testing connection...');
      const res = await fetch(`/api/admin/notification-configs/test/${config.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', 'Connection test passed! Configuration verified.');
        fetchConfigs();
      } else {
        showNotification('error', 'Connection test failed. Check credentials.');
      }
    } catch (err) {
      showNotification('error', 'Failed to run test.');
    }
  };

  const activeConfig = getActiveConfig();
  const creds = activeConfig.credentials || {};

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div>
          <h1 className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Webhook className="w-4 h-4 text-blue-600" />
            Configure API & SMTP
          </h1>
          <p className="text-[11px] text-slate-500">Manage connections for email, Telegram, and external webhooks</p>
        </div>
        <button 
          onClick={saveConfig}
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
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('smtp')}
            className={`px-4 py-2 text-[12px] font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer \${
              activeTab === 'smtp' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" /> SMTP Settings
          </button>
          <button 
            onClick={() => setActiveTab('telegram')}
            className={`px-4 py-2 text-[12px] font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer \${
              activeTab === 'telegram' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4" /> Telegram Bot
          </button>
          <button 
            onClick={() => setActiveTab('webhook')}
            className={`px-4 py-2 text-[12px] font-bold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer \${
              activeTab === 'webhook' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Webhook className="w-4 h-4" /> Webhooks & API
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="max-w-2xl bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-[13px] font-bold text-slate-800 capitalize">{activeTab} Configuration</h3>
                <p className="text-[11px] text-slate-500">Configure outbound {activeTab} connection details.</p>
                {activeConfig.is_verified && (
                   <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-600">
                     <CheckCircle2 className="w-3 h-3" /> Verified Connection
                   </div>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-medium text-slate-600">Enable {activeTab.toUpperCase()}</span>
                <div 
                  onClick={() => handleUpdateConfig('is_active', !activeConfig.is_active)}
                  className={`relative inline-block w-8 h-4 rounded-full transition-colors \${activeConfig.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute left-[2px] top-[2px] w-3 h-3 bg-white rounded-full transition-transform \${activeConfig.is_active ? 'translate-x-4' : ''}`} />
                </div>
              </label>
            </div>

            {activeTab === 'smtp' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Server className="w-3 h-3" /> SMTP Host
                    </label>
                    <input type="text" value={creds.host || ''} onChange={e => handleUpdateCreds('host', e.target.value)} placeholder="smtp.gmail.com" className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">SMTP Port</label>
                    <input type="number" value={creds.port || ''} onChange={e => handleUpdateCreds('port', e.target.value)} placeholder="465" className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Username / Email</label>
                    <input type="text" value={creds.user || ''} onChange={e => handleUpdateCreds('user', e.target.value)} placeholder="info@example.com" className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Key className="w-3 h-3" /> Password / App Password
                    </label>
                    <input type="password" value={creds.pass || ''} onChange={e => handleUpdateCreds('pass', e.target.value)} placeholder="••••••••" className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'telegram' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Key className="w-3 h-3" /> Bot Token
                    </label>
                    <input type="password" value={creds.bot_token || ''} onChange={e => handleUpdateCreds('bot_token', e.target.value)} placeholder="123456789:ABCdefGHIjklmNOPqrsTUVwxyz..." className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Chat ID</label>
                    <input type="text" value={creds.chat_id || ''} onChange={e => handleUpdateCreds('chat_id', e.target.value)} placeholder="-1001234567890" className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                    <p className="text-[10px] text-slate-500 pt-0.5">The ID of the group or user to send notifications to.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'webhook' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Server className="w-3 h-3" /> Endpoint URL
                    </label>
                    <input type="url" value={creds.url || ''} onChange={e => handleUpdateCreds('url', e.target.value)} placeholder="https://api.yoursystem.com/webhook" className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Key className="w-3 h-3" /> Secret Token (Optional)
                    </label>
                    <input type="password" value={creds.secret || ''} onChange={e => handleUpdateCreds('secret', e.target.value)} placeholder="whsec_xxxxxxxxxxx" className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={testConnection}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" /> Test Connection
              </button>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { FileSignature, Save, Mail, Code, Variable, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AdminNotificationTemplates() {
  const [activeTemplate, setActiveTemplate] = useState('order_placed');
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const token = localStorage.getItem('adminToken');
  
  const templateTypes = [
    { id: 'order_placed', name: 'Order Placed (Customer)' },
    { id: 'order_shipped', name: 'Order Shipped (Customer)' },
    { id: 'order_delivered', name: 'Order Delivered (Customer)' },
    { id: 'welcome_email', name: 'Welcome Email (Customer)' },
    { id: 'admin_new_order', name: 'New Order (Admin Alert)' },
  ];

  const defaultTemplates: Record<string, any> = {
    order_placed: {
      subject: 'Order Confirmation #{{order_id}}',
      body: `Hi {{user_name}},\n\nThank you for your order! We've received your order #{{order_id}}.\n\nTotal Amount: {{total_amount}}\nShipping Address: {{shipping_address}}\n\nWe will notify you once it ships!\n\nThanks,\nStore Team`
    },
    order_shipped: {
      subject: 'Your order #{{order_id}} has been shipped!',
      body: `Hi {{user_name}},\n\nGood news! Your order #{{order_id}} has been shipped.\n\nTracking Number: {{tracking_number}}\n\nThanks,\nStore Team`
    },
    order_delivered: {
      subject: 'Your order #{{order_id}} has been delivered',
      body: `Hi {{user_name}},\n\nYour order #{{order_id}} has been delivered successfully.\n\nEnjoy your items!\n\nThanks,\nStore Team`
    },
    welcome_email: {
      subject: 'Welcome to {{store_name}}!',
      body: `Hi {{user_name}},\n\nWelcome to {{store_name}}! We're excited to have you on board.\n\nThanks,\nStore Team`
    },
    admin_new_order: {
      subject: 'New Order Received: #{{order_id}}',
      body: `A new order has been placed by {{user_name}} ({{user_email}}).\n\nOrder ID: {{order_id}}\nTotal: {{total_amount}}\n\nPlease review it in the admin dashboard.`
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/notification-templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const templatesMap: Record<string, any> = {};
        data.forEach((t: any) => {
          templatesMap[t.id] = t;
        });
        setTemplates(templatesMap);
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

  const handleUpdate = (field: string, value: string) => {
    const current = templates[activeTemplate] || defaultTemplates[activeTemplate];
    setTemplates({
      ...templates,
      [activeTemplate]: { ...current, [field]: value }
    });
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
      const current = templates[activeTemplate] || defaultTemplates[activeTemplate];
      const templateName = templateTypes.find(t => t.id === activeTemplate)?.name || activeTemplate;
      
      const payload = {
        name: templateName,
        subject: current.subject,
        body: current.body
      };

      const res = await fetch(`/api/admin/notification-templates/${activeTemplate}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showNotification('success', 'Template saved successfully');
      } else {
        showNotification('error', 'Failed to save template');
      }
    } catch (err) {
      showNotification('error', 'Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTpl = templates[activeTemplate] || defaultTemplates[activeTemplate];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div>
          <h1 className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-blue-600" />
            Notification Templates
          </h1>
          <p className="text-[11px] text-slate-500">Edit content for emails and automated messages</p>
        </div>
        <button 
          onClick={saveTemplate}
          disabled={isSaving}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      {notification && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 \${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        {/* Template List Sidebar */}
        <div className="w-[220px] bg-white border-r border-slate-200 overflow-y-auto hidden sm:block shrink-0">
          <div className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Email Templates
          </div>
          <div className="p-2 space-y-0.5">
            {templateTypes.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setActiveTemplate(tpl.id)}
                className={`w-full text-left px-2.5 py-2 rounded text-[11px] font-medium transition-colors cursor-pointer \${
                  activeTemplate === tpl.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {isLoading ? (
             <div className="flex items-center justify-center h-48">
               <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
             </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex-1 flex flex-col min-h-[400px]">
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Subject</label>
                  <input 
                    type="text" 
                    value={currentTpl?.subject || ''}
                    onChange={(e) => handleUpdate('subject', e.target.value)}
                    className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-[12px] bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                    <span>Email Body (HTML / Plain Text)</span>
                    <span className="flex items-center gap-1 text-slate-400 font-normal"><Code className="w-3 h-3" /> Source</span>
                  </label>
                  <textarea 
                    value={currentTpl?.body || ''}
                    onChange={(e) => handleUpdate('body', e.target.value)}
                    className="flex-1 w-full border border-slate-200 rounded p-3 text-[12px] font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Variables Reference */}
              <div className="bg-slate-100 rounded-lg p-3 border border-slate-200 shrink-0">
                <h4 className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Variable className="w-3.5 h-3.5" /> Available Variables
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['{{user_name}}', '{{user_email}}', '{{order_id}}', '{{total_amount}}', '{{shipping_address}}', '{{tracking_number}}', '{{store_name}}'].map(v => (
                    <span key={v} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-600 shadow-sm cursor-pointer hover:border-blue-300">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

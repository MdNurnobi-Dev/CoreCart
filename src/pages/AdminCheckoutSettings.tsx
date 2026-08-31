import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Layers, CheckSquare, EyeOff, GripVertical, Info, ShoppingCart } from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export interface FieldConfig {
  label: string;
  required: boolean;
  visible: boolean;
  option1Label?: string;
  option1Price?: number;
  option2Label?: string;
  option2Price?: number;
}

export interface CheckoutFormConfig {
  name: FieldConfig;
  phone: FieldConfig;
  email: FieldConfig;
  address: FieldConfig;
  city: FieldConfig;
  district: FieldConfig;
  zip: FieldConfig;
  notes: FieldConfig;
  [key: string]: FieldConfig;
}

const DEFAULT_CONFIG: CheckoutFormConfig = {
  name: { label: 'Full Name', required: true, visible: true },
  phone: { label: 'Phone Number', required: true, visible: true },
  email: { label: 'Email Address', required: false, visible: true },
  address: { label: 'Delivery Address', required: true, visible: true },
  city: { label: 'City', required: true, visible: true },
  district: { label: 'District / Zone', required: false, visible: true },
  zip: { label: 'Zip / Postal Code', required: false, visible: true },
  notes: { label: 'Order Notes (Optional)', required: false, visible: true },
  deliveryRegion: { label: 'Delivery Region', required: true, visible: true, option1Label: 'Inside City', option1Price: 0, option2Label: 'Outside City', option2Price: 5 },
  shippingMethod: { label: 'Shipping Method', required: true, visible: true, option1Label: 'Standard Delivery', option1Price: 0, option2Label: 'Priority Express', option2Price: 5 }
};

const FIELD_KEYS = ['name', 'phone', 'email', 'address', 'city', 'district', 'zip', 'notes', 'deliveryRegion', 'shippingMethod'];

export function AdminCheckoutSettings() {
  const { token } = useAuth();
  const [config, setConfig] = useState<CheckoutFormConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/checkout-form-settings');
      if (res.ok) {
        const data = await res.json();
        // Merge with default config to ensure all fields exist
        const mergedConfig = { ...DEFAULT_CONFIG };
        Object.keys(DEFAULT_CONFIG).forEach(key => {
          if (data[key]) {
            mergedConfig[key] = { ...DEFAULT_CONFIG[key], ...data[key] };
          }
        });
        setConfig(mergedConfig);
      }
    } catch (err) {
      console.error('Failed to load checkout settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiFetch('/admin/checkout-form-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      
      if (res.success) {
        setFeedback('Saved successfully');
        setTimeout(() => setFeedback(''), 3000);
      } else {
        alert(res.error || 'Failed to save settings');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, key: keyof FieldConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 bg-slate-50 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            Checkout Customization
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Configure fields for both Quick Checkout and standard Checkout.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {feedback && (
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded animate-in fade-in">
              {feedback}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Configuration Panel */}
        <div className="xl:col-span-8 space-y-3">
          <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Form Fields Settings
              </h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              {/* Header Row */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-3">Field</div>
                <div className="col-span-5">Display Label</div>
                <div className="col-span-2 text-center">Required</div>
                <div className="col-span-2 text-center">Visible</div>
              </div>

              {FIELD_KEYS.map((field) => (
                <div key={field} className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-50/50 transition-colors">
                  
                  {/* Field ID */}
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <GripVertical className="w-3 h-3 text-slate-300 hidden sm:block" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 capitalize">{field}</span>
                    </div>
                  </div>

                  {/* Display Label */}
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={config[field].label}
                      onChange={(e) => updateField(field, 'label', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="sm:col-span-4 flex items-center justify-between sm:justify-around gap-2 mt-2 sm:mt-0">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config[field].required}
                        onChange={(e) => updateField(field, 'required', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                        disabled={field === 'name' || field === 'phone' || field === 'deliveryRegion' || field === 'shippingMethod'} 
                      />
                      <span className={`text-[10px] font-bold ${config[field].required ? 'text-slate-800' : 'text-slate-400'}`}>
                        Req
                      </span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <div className={`w-6 h-3 rounded-full transition-colors relative ${config[field].visible ? 'bg-blue-600' : 'bg-slate-300'}`}>
                        <input
                          type="checkbox"
                          checked={config[field].visible}
                          onChange={(e) => updateField(field, 'visible', e.target.checked)}
                          className="sr-only"
                          disabled={field === 'name' || field === 'phone'} 
                        />
                        <div className={`absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-transform ${config[field].visible ? 'translate-x-3' : 'translate-x-0'}`} />
                      </div>
                      <span className={`text-[10px] font-bold ${config[field].visible ? 'text-blue-700' : 'text-slate-400'}`}>
                        Vis
                      </span>
                    </label>
                  </div>

                  {/* Additional options for Delivery Region & Shipping Method */}
                  {(field === 'deliveryRegion' || field === 'shippingMethod') && config[field].visible && (
                    <div className="sm:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opt 1 Label</label>
                        <input
                          type="text"
                          value={config[field].option1Label || ''}
                          onChange={(e) => updateField(field, 'option1Label', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-800 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opt 1 Price</label>
                        <input
                          type="number"
                          value={config[field].option1Price || 0}
                          onChange={(e) => updateField(field, 'option1Price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-800 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opt 2 Label</label>
                        <input
                          type="text"
                          value={config[field].option2Label || ''}
                          onChange={(e) => updateField(field, 'option2Label', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-800 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opt 2 Price</label>
                        <input
                          type="number"
                          value={config[field].option2Price || 0}
                          onChange={(e) => updateField(field, 'option2Price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-800 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-amber-50 px-3 py-2 border-t border-amber-100 flex items-start gap-1.5 text-[10px] text-amber-800">
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-amber-600" />
              <p>
                <strong>Note:</strong> <code>name</code> and <code>phone</code> fields cannot be hidden.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="xl:col-span-4">
          <div className="sticky top-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <EyeOff className="w-3 h-3" />
              Live Preview
            </h3>
            
            <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm relative">
              <div className="h-5 bg-slate-100 border-b border-slate-200 flex items-center px-2 gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              
              <div className="p-3 space-y-2.5">
                <h4 className="text-[11px] font-black text-slate-900 border-b border-slate-100 pb-1.5">Delivery Details</h4>
                
                {FIELD_KEYS.filter(key => config[key].visible).map(key => (
                  <div key={key}>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      {config[key].label} {config[key].required && <span className="text-rose-500">*</span>}
                    </label>
                    {key === 'notes' ? (
                      <textarea 
                        className="w-full border border-slate-200 bg-slate-50 rounded px-2 py-1 text-[10px] text-slate-400 outline-none resize-none"
                        placeholder={`Enter ${config[key].label.toLowerCase()}...`}
                        rows={1}
                        readOnly
                      />
                    ) : key === 'deliveryRegion' || key === 'shippingMethod' ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-1.5 rounded border border-blue-600 bg-blue-50 text-[10px] font-semibold text-blue-900 flex justify-between items-center">
                          <span>{config[key].option1Label || 'Option 1'}</span>
                          <span className="text-[9px] font-bold">{(config[key].option1Price || 0) === 0 ? 'FREE' : `+৳${config[key].option1Price}`}</span>
                        </div>
                        <div className="p-1.5 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-500 flex justify-between items-center">
                          <span>{config[key].option2Label || 'Option 2'}</span>
                          <span className="text-[9px] font-bold">{(config[key].option2Price || 0) === 0 ? 'FREE' : `+৳${config[key].option2Price}`}</span>
                        </div>
                      </div>
                    ) : (
                      <input 
                        type="text"
                        className="w-full border border-slate-200 bg-slate-50 rounded px-2 py-1 text-[10px] text-slate-400 outline-none"
                        placeholder={key === 'phone' ? '01XXXXXXXXX' : `Enter ${config[key].label.toLowerCase()}...`}
                        readOnly
                      />
                    )}
                  </div>
                ))}
                
                <button className="w-full py-1.5 bg-blue-600 text-white rounded text-[10px] font-bold mt-2 shadow-sm opacity-50 cursor-not-allowed">
                  Complete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

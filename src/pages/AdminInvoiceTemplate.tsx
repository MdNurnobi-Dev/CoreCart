import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Printer, 
  Settings, 
  FileText, 
  Check, 
  RotateCcw, 
  Layout, 
  Eye, 
  Palette, 
  DollarSign, 
  CheckCircle2, 
  Building2, 
  Grid, 
  Percent, 
  Truck, 
  CreditCard, 
  MapPin, 
  Sparkles,
  Save,
  Trash2,
  Lock
} from 'lucide-react';

// Default configuration for the custom PDF Invoice Template
const DEFAULT_INVOICE_SETTINGS = {
  paper_size: 'A4', // A4, Letter, POS_80mm, POS_58mm
  margin_size: 'standard', // compact, standard, wide
  primary_color: '#0F172A', // Slate 900
  accent_color: '#3B82F6', // Blue 500
  secondary_color: '#10B981', // Emerald 500
  header_style: 'gradient', // gradient, minimal, solid
  
  // Company Details
  company_name: 'TechStore Premium Ltd.',
  company_phone: '+880 1712-345678',
  company_email: 'billing@techstore.com.bd',
  company_address: 'Level 12, High-Tech Tower, Karwan Bazar, Dhaka 1215',
  company_tax_id: 'BIN-1294817294-VAT',
  company_website: 'www.techstore.com.bd',
  show_company_website: true,

  // Invoice Columns Configuration (toggles)
  show_item_image: true,
  show_item_sku: true,
  show_item_category: true,
  show_vat_column: false,
  show_discount_column: true,
  
  // Meta Toggles
  show_tracking_number: true,
  show_payment_method: true,
  show_transaction_id: true,
  show_shipping_destination: true,
  show_billing_address: true,
  show_payment_status_badge: true,

  // Text & Label Customization
  invoice_title: 'OFFICIAL TAX INVOICE',
  greeting_text: 'Thank you for choosing TechStore! Your premium tech order is confirmed.',
  terms_conditions: '1. Warranty claims require presenting this invoice and original packaging.\n2. Returns are accepted within 7 days for manufacturing defects only.\n3. Goods sold are non-refundable after seals are broken.',
  show_signature_line: true,
  signature_title: 'Authorized Seal & Signature',
  show_watermark: true,
  watermark_text: 'PAID',

  // Surcharges & Estimates
  tax_rate_percent: 5,
  shipping_fee: 0,
  discount_rate_percent: 0,
};

export default function AdminInvoiceTemplate() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'design' | 'columns' | 'texts'>('general');
  const [invoiceSettings, setInvoiceSettings] = useState(DEFAULT_INVOICE_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load existing settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('invoice_pdf_template_settings');
    if (saved) {
      try {
        setInvoiceSettings({
          ...DEFAULT_INVOICE_SETTINGS,
          ...JSON.parse(saved)
        });
      } catch (err) {
        console.error('Failed to parse invoice settings:', err);
      }
    }
  }, []);

  const handleChange = (name: string, value: any) => {
    setInvoiceSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      localStorage.setItem('invoice_pdf_template_settings', JSON.stringify(invoiceSettings));
      
      // Dispatch custom event to notify OrderConfirmation of update in real-time
      window.dispatchEvent(new CustomEvent('invoice-settings-updated'));
      
      setTimeout(() => {
        setSuccessMsg('Invoice PDF Template settings saved and applied successfully!');
        setSaving(false);
      }, 600);
    } catch (err) {
      setErrorMsg('Failed to save settings. Local storage is full.');
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all invoice configurations to premium default settings?')) {
      setInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
      localStorage.setItem('invoice_pdf_template_settings', JSON.stringify(DEFAULT_INVOICE_SETTINGS));
      window.dispatchEvent(new CustomEvent('invoice-settings-updated'));
      setSuccessMsg('Reset to premium default template values.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6 text-center text-red-500 font-medium">
        <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        Unauthorised access. Only administrators can customize PDF invoice templates.
      </div>
    );
  }

  // Live dummy order data for realistic visual mock
  const MOCK_ORDER = {
    id: 10482,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    tracking: 'TS-94817294-EXP',
    payment_method: 'Cash On Delivery (COD) / Bkash',
    transaction_id: 'TRX-81729482X7',
    recipient: 'Ariful Islam',
    address: 'Apt 4B, Century Plaza, House 24, Road 11, Banani, Dhaka-1213',
    billing_address: 'Same as Shipping Address',
    items: [
      { name: 'Apple iPhone 15 Pro - Titanium Gray (256GB)', category: 'Phones', sku: 'IPH15P-256-GR', price: 135000, quantity: 1, image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&auto=format&fit=crop&q=80' },
      { name: 'Premium Leather MagSafe Case - Midnight Black', category: 'Accessories', sku: 'MSC-L-MB', price: 4500, quantity: 2, image: 'https://images.unsplash.com/photo-1601597111158-2fceff270190?w=100&auto=format&fit=crop&q=80' }
    ]
  };

  const dummySubtotal = MOCK_ORDER.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const dummyVat = dummySubtotal * (invoiceSettings.tax_rate_percent / 100);
  const dummyDiscount = dummySubtotal * (invoiceSettings.discount_rate_percent / 100);
  const dummyTotal = dummySubtotal + dummyVat + Number(invoiceSettings.shipping_fee) - dummyDiscount;

  // Margin spacing helpers
  const getMarginClass = () => {
    switch (invoiceSettings.margin_size) {
      case 'compact': return 'p-3 sm:p-4 text-[11px] gap-2';
      case 'wide': return 'p-6 sm:p-10 text-xs gap-5';
      default: return 'p-4 sm:p-7 text-xs gap-3';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      
      {/* Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-slate-900 leading-tight">Invoice PDF Template Settings</h1>
            <p className="text-[11px] text-slate-500 leading-none mt-1">A-Z PDF customization for orders after payment confirmation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Save className="w-3.5 h-3.5" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-2.5 text-[11.5px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-2.5 text-[11.5px] bg-red-50 text-red-700 border border-red-100 rounded-lg font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start overflow-hidden">
        
        {/* Left Section: Config Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
          
          {/* Internal Config Tabs */}
          <div className="flex border-b border-slate-100 pb-1.5 gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'general' ? 'bg-blue-50 text-blue-700 border-blue-200/70' : 'text-slate-600 border-transparent hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>General & Business</span>
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'design' ? 'bg-blue-50 text-blue-700 border-blue-200/70' : 'text-slate-600 border-transparent hover:bg-slate-50'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>Theme & Sizing</span>
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'columns' ? 'bg-blue-50 text-blue-700 border-blue-200/70' : 'text-slate-600 border-transparent hover:bg-slate-50'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Table Columns</span>
            </button>
            <button
              onClick={() => setActiveTab('texts')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'texts' ? 'bg-blue-50 text-blue-700 border-blue-200/70' : 'text-slate-600 border-transparent hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Invoice Texts</span>
            </button>
          </div>

          {/* Tab Content Fields */}
          <div className="space-y-3.5 pt-1 text-slate-700 text-xs">
            
            {/* GENERAL & BUSINESS TAB */}
            {activeTab === 'general' && (
              <div className="space-y-3.5">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Set up your business metadata. All fields below will display instantly on the dynamic customer-side invoice upon successful order placement.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Company / Shop Name</label>
                  <input
                    type="text"
                    value={invoiceSettings.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Enter official store name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      value={invoiceSettings.company_phone}
                      onChange={(e) => handleChange('company_phone', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. +880 1700-000000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Email Address</label>
                    <input
                      type="text"
                      value={invoiceSettings.company_email}
                      onChange={(e) => handleChange('company_email', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. sales@shop.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Company Address</label>
                  <textarea
                    rows={2}
                    value={invoiceSettings.company_address}
                    onChange={(e) => handleChange('company_address', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500 resize-none leading-normal"
                    placeholder="Physical outlet or billing address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Tax ID / BIN / VAT No</label>
                    <input
                      type="text"
                      value={invoiceSettings.company_tax_id}
                      onChange={(e) => handleChange('company_tax_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                      placeholder="VAT BIN code"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Website URL</label>
                    <input
                      type="text"
                      value={invoiceSettings.company_website}
                      onChange={(e) => handleChange('company_website', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                      placeholder="www.mystore.com"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">Show website link on footer</span>
                    <span className="text-[10px] text-slate-500">Enable clean branding details on invoice bottom</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={invoiceSettings.show_company_website}
                    onChange={(e) => handleChange('show_company_website', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* THEME & SIZING TAB */}
            {activeTab === 'design' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Paper Standard</label>
                    <select
                      value={invoiceSettings.paper_size}
                      onChange={(e) => handleChange('paper_size', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] bg-white text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="A4">A4 Premium Sheet</option>
                      <option value="Letter">Letter Standard</option>
                      <option value="POS_80mm">POS Roll Receipt (80mm)</option>
                      <option value="POS_58mm">Compact Receipt (58mm)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Invoice Margins</label>
                    <select
                      value={invoiceSettings.margin_size}
                      onChange={(e) => handleChange('margin_size', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] bg-white text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="compact">Compact Margins (High Density)</option>
                      <option value="standard">Standard Margins (Clean)</option>
                      <option value="wide">Wide Margins (Generous Space)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Header Styling</label>
                    <select
                      value={invoiceSettings.header_style}
                      onChange={(e) => handleChange('header_style', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] bg-white text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="gradient">Modern Gradient (Premium)</option>
                      <option value="solid">Solid Slate Banner</option>
                      <option value="minimal">Minimal White (Ink Saving)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">VAT / Tax Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={invoiceSettings.tax_rate_percent}
                      onChange={(e) => handleChange('tax_rate_percent', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Shipping Standard Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={invoiceSettings.shipping_fee}
                      onChange={(e) => handleChange('shipping_fee', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Default Discount Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={invoiceSettings.discount_rate_percent}
                      onChange={(e) => handleChange('discount_rate_percent', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Color Aesthetics & Accent Branding</span>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={invoiceSettings.primary_color}
                        onChange={(e) => handleChange('primary_color', e.target.value)}
                        className="w-7 h-7 border-0 rounded cursor-pointer shrink-0"
                      />
                      <div className="flex flex-col text-[10px]">
                        <span className="font-semibold text-slate-700">Primary Color</span>
                        <span className="text-slate-400 font-mono">{invoiceSettings.primary_color}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={invoiceSettings.accent_color}
                        onChange={(e) => handleChange('accent_color', e.target.value)}
                        className="w-7 h-7 border-0 rounded cursor-pointer shrink-0"
                      />
                      <div className="flex flex-col text-[10px]">
                        <span className="font-semibold text-slate-700">Accent Color</span>
                        <span className="text-slate-400 font-mono">{invoiceSettings.accent_color}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COLUMNS TAB */}
            {activeTab === 'columns' && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Order Table Customization</span>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700">Display item image thumbnail</span>
                      <span className="text-[10px] text-slate-400">Shows small product photo on the left side of item name</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_item_image}
                      onChange={(e) => handleChange('show_item_image', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700">Display product SKU code</span>
                      <span className="text-[10px] text-slate-400">Shows short SKU below the product title</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_item_sku}
                      onChange={(e) => handleChange('show_item_sku', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700">Display item category label</span>
                      <span className="text-[10px] text-slate-400">Shows light classification badge under item details</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_item_category}
                      onChange={(e) => handleChange('show_item_category', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700">Show subtotal itemized taxes</span>
                      <span className="text-[10px] text-slate-400">Adds secondary details column for tax breakdown</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_vat_column}
                      onChange={(e) => handleChange('show_vat_column', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700">Show discounts column</span>
                      <span className="text-[10px] text-slate-400">Presents markdown percentages directly inside items row</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_discount_column}
                      onChange={(e) => handleChange('show_discount_column', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mt-3 mb-1">Invoice Metadata Customization</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_tracking_number}
                      onChange={(e) => handleChange('show_tracking_number', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-[10.5px] text-slate-700">Tracking No</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_payment_method}
                      onChange={(e) => handleChange('show_payment_method', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-[10.5px] text-slate-700">Pay Gateway</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_transaction_id}
                      onChange={(e) => handleChange('show_transaction_id', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-[10.5px] text-slate-700">Trx ID Code</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_shipping_destination}
                      onChange={(e) => handleChange('show_shipping_destination', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-[10.5px] text-slate-700">Shipping Addr</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_billing_address}
                      onChange={(e) => handleChange('show_billing_address', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-[10.5px] text-slate-700">Billing Addr</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoiceSettings.show_payment_status_badge}
                      onChange={(e) => handleChange('show_payment_status_badge', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="text-[10.5px] text-slate-700">Status Badge</span>
                  </label>
                </div>
              </div>
            )}

            {/* TEXTS & LABELS TAB */}
            {activeTab === 'texts' && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Invoice Main Title</label>
                  <input
                    type="text"
                    value={invoiceSettings.invoice_title}
                    onChange={(e) => handleChange('invoice_title', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. TAX INVOICE / RETAIL BILL"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Greeting Text (Header Bottom)</label>
                  <input
                    type="text"
                    value={invoiceSettings.greeting_text}
                    onChange={(e) => handleChange('greeting_text', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Enter short greeting notes"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Terms, Conditions & Instructions</label>
                  <textarea
                    rows={3}
                    value={invoiceSettings.terms_conditions}
                    onChange={(e) => handleChange('terms_conditions', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11.5px] text-slate-800 focus:outline-none focus:border-blue-500 resize-none leading-normal font-mono text-[10px]"
                    placeholder="1. Warranty claims need boxes..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                  <div className="space-y-1.5 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Signature Line</span>
                      <input
                        type="checkbox"
                        checked={invoiceSettings.show_signature_line}
                        onChange={(e) => handleChange('show_signature_line', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                  {invoiceSettings.show_signature_line && (
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Signature Title Label</label>
                      <input
                        type="text"
                        value={invoiceSettings.signature_title}
                        onChange={(e) => handleChange('signature_title', e.target.value)}
                        className="w-full px-2.5 py-1 border border-slate-200 rounded-md text-[10.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Sales Manager"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                  <div className="space-y-1.5 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Watermark Label</span>
                      <input
                        type="checkbox"
                        checked={invoiceSettings.show_watermark}
                        onChange={(e) => handleChange('show_watermark', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                  {invoiceSettings.show_watermark && (
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Watermark Text</label>
                      <input
                        type="text"
                        value={invoiceSettings.watermark_text}
                        onChange={(e) => handleChange('watermark_text', e.target.value)}
                        className="w-full px-2.5 py-1 border border-slate-200 rounded-md text-[10.5px] text-slate-800 focus:outline-none focus:border-blue-500"
                        placeholder="e.g. PAID or UNPAID"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Section: Real-time Live Interactive PDF Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#38BDF8]" />
              <span>Real-Time Interactive Invoice Preview ({invoiceSettings.paper_size})</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 font-mono">Live Sync</span>
          </div>

          {/* Interactive Page Representation */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex justify-center items-start overflow-x-auto min-h-[500px]">
            
            {/* Invoice Canvas Container Sized precisely according to configurations */}
            <div 
              style={{ 
                maxWidth: invoiceSettings.paper_size.startsWith('POS') 
                  ? (invoiceSettings.paper_size === 'POS_80mm' ? '380px' : '280px') 
                  : '100%',
                width: '100%'
              }}
              className="bg-white text-slate-800 shadow-xl border border-slate-300/60 rounded-md transition-all duration-300 relative overflow-hidden text-[11px]"
            >
              
              {/* PAID Watermark */}
              {invoiceSettings.show_watermark && (
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none z-0">
                  <span className="text-6xl sm:text-7xl font-black border-8 border-red-500 text-red-500 rounded-2xl px-6 py-2 rotate-12 select-none tracking-widest uppercase">
                    {invoiceSettings.watermark_text || 'PAID'}
                  </span>
                </div>
              )}

              {/* PDF Header Section */}
              {invoiceSettings.header_style === 'gradient' ? (
                <div 
                  style={{ backgroundImage: `linear-gradient(to right, ${invoiceSettings.primary_color}, ${invoiceSettings.primary_color}DD, ${invoiceSettings.primary_color})` }}
                  className="text-white p-4 sm:p-5 relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
                    <div>
                      {invoiceSettings.show_payment_status_badge && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit mb-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                          CONFIRMED PAID
                        </span>
                      )}
                      <h2 className="text-[14px] font-extrabold tracking-tight text-white uppercase">{invoiceSettings.invoice_title}</h2>
                      <p className="text-[10px] text-slate-200 mt-0.5">{invoiceSettings.greeting_text}</p>
                    </div>

                    <div className="bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 font-mono text-[9.5px]">
                      <p className="text-blue-200 font-bold uppercase tracking-wider text-[8px]">ORDER ID</p>
                      <p className="font-bold text-white">#{MOCK_ORDER.id}</p>
                      <p className="text-slate-300 text-[8.5px] mt-0.5">{MOCK_ORDER.date}</p>
                    </div>
                  </div>
                </div>
              ) : invoiceSettings.header_style === 'solid' ? (
                <div 
                  style={{ backgroundColor: invoiceSettings.primary_color }}
                  className="text-white p-4 sm:p-5"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <h2 className="text-[14px] font-extrabold uppercase">{invoiceSettings.invoice_title}</h2>
                      <p className="text-[10px] text-slate-300 mt-0.5">{invoiceSettings.greeting_text}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <p className="font-bold">INVOICE #{MOCK_ORDER.id}</p>
                      <p className="text-slate-300">{MOCK_ORDER.date}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 border-b border-slate-100 text-slate-800">
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <h2 className="text-[15px] font-extrabold uppercase text-slate-900" style={{ color: invoiceSettings.primary_color }}>
                        {invoiceSettings.invoice_title}
                      </h2>
                      <p className="text-[10px] text-slate-500 mt-0.5">{invoiceSettings.greeting_text}</p>
                    </div>
                    <div className="text-right text-[10px] font-mono">
                      <p className="font-bold text-slate-900">Order ID: #{MOCK_ORDER.id}</p>
                      <p className="text-slate-500">{MOCK_ORDER.date}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF Body Margin-Based Wrapper */}
              <div className={`${getMarginClass()} flex flex-col relative z-10`}>
                
                {/* Company & Client Meta Split Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  
                  {/* From Business details */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Issuer Details</p>
                    <p className="font-extrabold text-slate-900 text-[11.5px]">{invoiceSettings.company_name}</p>
                    <p className="text-slate-500 text-[10px] leading-tight">{invoiceSettings.company_address}</p>
                    <div className="space-y-0.5 pt-1 text-[10px] text-slate-600">
                      <p>Phone: <span className="font-medium text-slate-800">{invoiceSettings.company_phone}</span></p>
                      <p>Email: <span className="font-medium text-slate-800">{invoiceSettings.company_email}</span></p>
                      {invoiceSettings.company_tax_id && <p>Tax BIN: <span className="font-mono text-slate-800">{invoiceSettings.company_tax_id}</span></p>}
                    </div>
                  </div>

                  {/* To Client / Bill details */}
                  <div className="space-y-1 sm:text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bill To / Ship To</p>
                    <p className="font-extrabold text-slate-900 text-[11.5px]">{MOCK_ORDER.recipient}</p>
                    
                    {invoiceSettings.show_shipping_destination && (
                      <div>
                        <p className="text-slate-500 text-[10px] leading-tight sm:ml-auto sm:max-w-xs">{MOCK_ORDER.address}</p>
                      </div>
                    )}
                    
                    {invoiceSettings.show_billing_address && (
                      <div className="pt-1.5 text-[9.5px] text-slate-400">
                        <span>Billing Address: {MOCK_ORDER.billing_address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Header Metadata Boxes (e.g. Tracking, Payment) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/50">
                  {invoiceSettings.show_tracking_number && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Tracking Number</span>
                      <span className="font-mono font-bold text-slate-800">{MOCK_ORDER.tracking}</span>
                      <p className="text-[9px] text-slate-400">TechStore Logistics</p>
                    </div>
                  )}

                  {invoiceSettings.show_payment_method && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Payment Details</span>
                      <span className="font-bold text-slate-800 text-[10px] leading-none block mt-0.5">{MOCK_ORDER.payment_method}</span>
                      {invoiceSettings.show_transaction_id && (
                        <span className="font-mono text-[9px] text-slate-500 block">{MOCK_ORDER.transaction_id}</span>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Invoice Terms</span>
                    <span className="font-semibold text-slate-700 text-[10px]">Tax Registered Retail Invoice</span>
                    <p className="text-[9px] text-slate-400">Immediate Settlement</p>
                  </div>
                </div>

                {/* Items Sizable Layout Table */}
                <div className="mt-2.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Item Breakdown</p>
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead>
                      <tr 
                        style={{ borderBottom: `2px solid ${invoiceSettings.primary_color}` }}
                        className="bg-slate-50 text-slate-500 font-bold uppercase text-[8.5px] tracking-wider"
                      >
                        <th className="py-2 px-2.5">Item Description</th>
                        <th className="py-2 px-1.5 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Unit Price</th>
                        <th className="py-2 px-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MOCK_ORDER.items.map((it, i) => (
                        <tr key={`mock-item-${i}`} className="hover:bg-slate-50/30">
                          <td className="py-2.5 px-2.5">
                            <div className="flex items-center gap-2">
                              {invoiceSettings.show_item_image && (
                                <img 
                                  src={it.image} 
                                  alt={it.name} 
                                  className="w-7 h-7 object-contain rounded border border-slate-200 p-0.5 bg-white shrink-0" 
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{it.name}</p>
                                <div className="flex items-center gap-1.5 text-[9px] mt-0.5">
                                  {invoiceSettings.show_item_sku && <span className="font-mono text-slate-500">SKU: {it.sku}</span>}
                                  {invoiceSettings.show_item_category && <span className="bg-slate-100 text-slate-600 px-1 rounded-sm">{it.category}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-slate-600">x{it.quantity}</td>
                          <td className="py-2.5 px-2 text-right text-slate-600">৳{it.price.toLocaleString('en-US')}</td>
                          <td className="py-2.5 px-2.5 text-right font-bold text-slate-900">৳{(it.price * it.quantity).toLocaleString('en-US')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Toggles Summary Box */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 items-start">
                  
                  {/* Left Notes */}
                  <div className="sm:col-span-6 space-y-1 text-[9.5px] text-slate-400">
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">Terms & Warranty Conditions</p>
                    <p className="whitespace-pre-line leading-relaxed font-mono text-[8.5px]">
                      {invoiceSettings.terms_conditions}
                    </p>
                  </div>

                  {/* Right Financial Breakdown */}
                  <div className="sm:col-span-6 space-y-1.5 text-[10px] w-full sm:max-w-[240px] sm:ml-auto">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal amount</span>
                      <span className="font-semibold text-slate-800">৳{dummySubtotal.toLocaleString('en-US')}</span>
                    </div>

                    {invoiceSettings.discount_rate_percent > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Trade Discount ({invoiceSettings.discount_rate_percent}%)</span>
                        <span className="font-semibold text-red-500">-৳{dummyDiscount.toLocaleString('en-US')}</span>
                      </div>
                    )}

                    {invoiceSettings.tax_rate_percent > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>VAT / Tax ({invoiceSettings.tax_rate_percent}%)</span>
                        <span className="font-semibold text-slate-800">৳{dummyVat.toLocaleString('en-US')}</span>
                      </div>
                    )}

                    {invoiceSettings.shipping_fee > 0 ? (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery & Shipping</span>
                        <span className="font-semibold text-slate-800">৳{invoiceSettings.shipping_fee.toLocaleString('en-US')}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery & Shipping</span>
                        <span className="font-bold text-emerald-600">FREE SHIPPING</span>
                      </div>
                    )}

                    <div 
                      style={{ borderTop: `1px solid ${invoiceSettings.primary_color}` }}
                      className="pt-2 flex justify-between items-center font-black text-slate-900"
                    >
                      <span className="uppercase text-[9px] tracking-wider">Total Payable</span>
                      <span className="text-[12px]" style={{ color: invoiceSettings.accent_color }}>
                        ৳{dummyTotal.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Optional Signature Section */}
                {invoiceSettings.show_signature_line && (
                  <div className="pt-6 mt-4 flex justify-between items-end border-t border-dashed border-slate-200">
                    <div className="text-[8.5px] text-slate-400">
                      <p>Invoice issued electronically via automated sales ledger.</p>
                      {invoiceSettings.show_company_website && <p className="font-semibold text-blue-600 hover:underline">{invoiceSettings.company_website}</p>}
                    </div>

                    <div className="text-center w-36">
                      <div className="h-6 flex items-center justify-center font-serif text-[13px] text-blue-700/80 -rotate-2 select-none font-semibold">
                        {invoiceSettings.company_name.split(' ')[0]}
                      </div>
                      <div className="border-t border-slate-300 pt-1 text-[8.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                        {invoiceSettings.signature_title}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

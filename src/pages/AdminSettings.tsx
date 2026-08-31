import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Loader2, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  Globe, 
  Check, 
  Trash2, 
  Laptop, 
  ToggleLeft, 
  ToggleRight,
  Eye,
  Sliders,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Megaphone,
  Share2,
  Youtube,
  Linkedin,
  Headphones,
} from 'lucide-react';

export default function AdminSettings() {
  const { user, token } = useAuth();
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState({
    site_name: '',
    logo_url: '',
    favicon_url: '',
    show_site_name_in_header: true,
    footer_text: '',
    contact_email: '',
    contact_phone: '',
    contact_phone_alt: '',
    contact_address: '',
    support_hours: '',
    announcement_text: 'Summer Sale! Get up to 50% off on all premium electronics and accessories.',
    announcement_link: '/#all-products',
    currency_symbol: '$',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    linkedin_url: ''
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          site_name: data.site_name || '',
          logo_url: data.logo_url || '',
          favicon_url: data.favicon_url || '',
          show_site_name_in_header: data.show_site_name_in_header !== undefined ? Boolean(data.show_site_name_in_header) : true,
          footer_text: data.footer_text || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          contact_phone_alt: data.contact_phone_alt || '',
          contact_address: data.contact_address || '',
          support_hours: data.support_hours || '',
          announcement_text: data.announcement_text || 'Summer Sale! Get up to 50% off on all premium electronics and accessories.',
          announcement_link: data.announcement_link || '/#all-products',
          currency_symbol: data.currency_symbol || '$',
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          twitter_url: data.twitter_url || '',
          youtube_url: data.youtube_url || '',
          linkedin_url: data.linkedin_url || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Logo File Upload (FileReader Base64)
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size should be less than 2MB', 'error');
      return;
    }

    setUploadingLogo(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', { method: 'POST', body: form });
      setSettings(prev => ({ ...prev, logo_url: data.secure_url }));
      showToast('Logo uploaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to upload logo', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };


  // Handle Favicon File Upload (FileReader Base64)
  
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showToast('Favicon file size should be less than 1MB', 'error');
      return;
    }

    setUploadingFavicon(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', { method: 'POST', body: form });
      setSettings(prev => ({ ...prev, favicon_url: data.secure_url }));
      showToast('Favicon uploaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to upload favicon', 'error');
    } finally {
      setUploadingFavicon(false);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast('Settings saved & applied successfully across store!');
        await refreshSettings();
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      showToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-[12px] border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight text-gray-900 leading-tight">Store Settings & Branding</h1>
            
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white h-[30px] px-3.5 rounded-lg text-[11.5px] font-semibold transition-colors shadow-2xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Settings
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-2.5 rounded-[12px] text-[12px] font-medium flex items-center gap-2 animate-in fade-in duration-150 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center p-12 bg-white border border-gray-200 rounded-[12px] shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* BRANDING & IDENTITY CARD */}
            <div className="bg-white border border-gray-200 rounded-[12px] p-3.5 sm:p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h2 className="text-[13px] font-semibold text-gray-900">Branding & Logo Controls</h2>
                </div>
                <span className="text-[10.5px] text-gray-400">Website Header & Identity</span>
              </div>

              {/* Site Name & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Store / Site Name
                  </label>
                  <input 
                    type="text" 
                    name="site_name"
                    value={settings.site_name || ''}
                    onChange={handleChange}
                    placeholder="e.g. TECHSHOP"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Currency Symbol
                  </label>
                  <input 
                    type="text" 
                    name="currency_symbol"
                    value={settings.currency_symbol || ''}
                    onChange={handleChange}
                    placeholder="e.g. $, ৳, €, £"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  
                </div>
              </div>

              {/* HEADER DISPLAY MODE TOGGLE & LIVE PREVIEW */}
              <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-3 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-semibold text-gray-900 block">
                      Website Header Brand Display Mode
                    </span>
                    
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, show_site_name_in_header: !prev.show_site_name_in_header }))}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                      settings.show_site_name_in_header
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {settings.show_site_name_in_header ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-blue-600" />
                        <span>Show Site Name + Logo</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-gray-400" />
                        <span>Show ONLY Logo</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Header Preview Bar */}
                <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-gray-400 font-mono">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Header Preview:</span>
                  </div>

                  <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 rounded-md border border-gray-100">
                    {settings.logo_url ? (
                      <img loading="lazy" decoding="async" 
                        src={settings.logo_url} 
                        alt="Logo Preview" 
                        className={settings.show_site_name_in_header ? "w-5 h-5 object-contain" : "max-h-6 max-w-[130px] object-contain"} 
                      />
                    ) : (
                      <div className="bg-blue-600 p-1 rounded text-white">
                        <Laptop className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {(settings.show_site_name_in_header || !settings.logo_url) && (
                      <span className="text-[12px] font-semibold text-gray-900 tracking-tight">
                        {settings.site_name || 'TECHSTORE'}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-500 font-medium hidden sm:block">
                    {settings.show_site_name_in_header ? '(Logo & Sitename visible)' : '(Only Brand Logo visible)'}
                  </div>
                </div>
              </div>

              {/* LOGO UPLOAD & URL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
                {/* Logo Box */}
                <div className="border border-gray-200 rounded-[10px] p-3 space-y-2.5 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <label className="text-[11.5px] font-semibold text-gray-900">Website Logo</label>
                    </div>
                    {settings.logo_url && (
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, logo_url: '' }))}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Logo Preview & File Selector */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                      {settings.logo_url ? (
                        <img loading="lazy" decoding="async" src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Laptop className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <input 
                        type="file" 
                        ref={logoFileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10.5px] font-medium py-1 px-2.5 rounded-md border border-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-blue-600" />
                        Upload Logo File (PNG/SVG/JPG)
                      </button>
                      
                    </div>
                  </div>

                  {/* URL Input */}
                  <div>
                    <label className="block text-[10.5px] font-medium text-gray-600 mb-0.5">Or Paste Logo Image URL</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        name="logo_url"
                        value={settings.logo_url || ''}
                        onChange={handleChange}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 bg-white border border-gray-200 rounded-lg h-[28px] px-2 text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-1 px-2 h-[28px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Upload</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Favicon Box */}
                <div className="border border-gray-200 rounded-[10px] p-3 space-y-2.5 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <label className="text-[11.5px] font-semibold text-gray-900">Website Favicon</label>
                    </div>
                    {settings.favicon_url && (
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, favicon_url: '' }))}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Favicon Preview & File Selector */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                      {settings.favicon_url ? (
                        <img loading="lazy" decoding="async" src={settings.favicon_url} alt="Favicon" className="w-7 h-7 object-contain" />
                      ) : (
                        <Globe className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <input 
                        type="file" 
                        ref={faviconFileInputRef}
                        onChange={handleFaviconUpload}
                        accept="image/x-icon,image/png,image/svg+xml,image/jpeg,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => faviconFileInputRef.current?.click()}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10.5px] font-medium py-1 px-2.5 rounded-md border border-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-emerald-600" />
                        Upload Favicon (.ico / .png)
                      </button>
                      
                    </div>
                  </div>

                  {/* Favicon URL Input */}
                  <div>
                    <label className="block text-[10.5px] font-medium text-gray-600 mb-0.5">Or Paste Favicon URL</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        name="favicon_url"
                        value={settings.favicon_url || ''}
                        onChange={handleChange}
                        placeholder="https://example.com/favicon.ico"
                        className="flex-1 bg-white border border-gray-200 rounded-lg h-[28px] px-2 text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => faviconFileInputRef.current?.click()}
                        disabled={uploadingFavicon}
                        className="flex items-center gap-1 px-2 h-[28px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingFavicon ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Upload</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HEADER ANNOUNCEMENT BAR SETTINGS */}
            <div className="bg-white border border-gray-200 rounded-[12px] p-3.5 sm:p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-blue-600" />
                  <h2 className="text-[13px] font-semibold text-gray-900">Top Header Announcement Bar</h2>
                </div>
                <span className="text-[10.5px] text-gray-400">Header Special Offer Banner</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Promotional Banner Text
                  </label>
                  <input 
                    type="text" 
                    name="announcement_text"
                    value={settings.announcement_text || ''}
                    onChange={handleChange}
                    placeholder="e.g. Summer Sale! Get up to 50% off on all premium electronics and accessories."
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                  
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Action Link URL
                  </label>
                  <input 
                    type="text" 
                    name="announcement_link"
                    value={settings.announcement_link || ''}
                    onChange={handleChange}
                    placeholder="e.g. /#all-products or /support"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                  
                </div>
              </div>
            </div>

            {/* CONTACT & HOTLINE (A-Z DETAILS) SECTION */}
            <div className="bg-white border border-gray-200 rounded-[12px] p-3.5 sm:p-4 shadow-sm space-y-3.5">
              <div className="border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Headphones className="w-4 h-4 text-blue-600" />
                  <h2 className="text-[13px] font-semibold text-gray-900">Customer Support, Hotlines & Address (A-Z)</h2>
                </div>
                
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    Primary Support Hotline (Direct Dialpad)
                  </label>
                  <input 
                    type="text" 
                    name="contact_phone"
                    value={settings.contact_phone || ''}
                    onChange={handleChange}
                    placeholder="e.g. +1 (800) 123-4567 or +880 1700-000000"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                  
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Alternate Helpline / WhatsApp Number
                  </label>
                  <input 
                    type="text" 
                    name="contact_phone_alt"
                    value={settings.contact_phone_alt || ''}
                    onChange={handleChange}
                    placeholder="e.g. +1 (800) 987-6543 or +880 1800-000000"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                  
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-600" />
                    Support Email Address
                  </label>
                  <input 
                    type="email" 
                    name="contact_email"
                    value={settings.contact_email || ''}
                    onChange={handleChange}
                    placeholder="e.g. support@techstore.com"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                  
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Customer Service Operating Hours
                  </label>
                  <input 
                    type="text" 
                    name="support_hours"
                    value={settings.support_hours || ''}
                    onChange={handleChange}
                    placeholder="e.g. Mon - Sat: 9:00 AM - 8:00 PM (Closed on Friday)"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                  
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    Official Support / Store Physical Address
                  </label>
                  <textarea 
                    name="contact_address"
                    rows={2}
                    value={settings.contact_address || ''}
                    onChange={handleChange}
                    placeholder="e.g. Level 5, Suite 402, Silicon Plaza, Tech Avenue, Dhaka / New York, USA"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                  
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Footer Description & Copyright Notice
                  </label>
                  <textarea 
                    name="footer_text"
                    rows={2}
                    value={settings.footer_text || ''}
                    onChange={handleChange}
                    placeholder="e.g. © 2026 TechStore Inc. All rights reserved."
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SOCIAL MEDIA & CHANNELS SECTION */}
            <div className="bg-white border border-gray-200 rounded-[12px] p-3.5 sm:p-4 shadow-sm space-y-3.5">
              <div className="border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <h2 className="text-[13px] font-semibold text-gray-900">Social Media & Official Channels</h2>
                </div>
                
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Facebook Page URL</label>
                  <input 
                    type="text" 
                    name="facebook_url"
                    value={settings.facebook_url || ''}
                    onChange={handleChange}
                    placeholder="https://facebook.com/techstore"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Instagram Profile URL</label>
                  <input 
                    type="text" 
                    name="instagram_url"
                    value={settings.instagram_url || ''}
                    onChange={handleChange}
                    placeholder="https://instagram.com/techstore"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Twitter / X URL</label>
                  <input 
                    type="text" 
                    name="twitter_url"
                    value={settings.twitter_url || ''}
                    onChange={handleChange}
                    placeholder="https://x.com/techstore"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">YouTube Channel URL</label>
                  <input 
                    type="text" 
                    name="youtube_url"
                    value={settings.youtube_url || ''}
                    onChange={handleChange}
                    placeholder="https://youtube.com/@techstore"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">LinkedIn Page URL</label>
                  <input 
                    type="text" 
                    name="linkedin_url"
                    value={settings.linkedin_url || ''}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/company/techstore"
                    className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button 
                type="submit" 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white h-[32px] px-4 rounded-lg text-[12px] font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Store Settings
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

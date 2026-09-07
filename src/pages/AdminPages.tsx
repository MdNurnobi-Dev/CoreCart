import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  Save, 
  Search, 
  Code2, 
  Eye, 
  Columns, 
  FileCode, 
  Sparkles, 
  HelpCircle,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

// Helper to evaluate PHP template tags in preview
function parsePhpAndHtml(content: string, siteName: string = 'CoreCart') {
  if (!content) return '';
  let processed = content;
  
  // Replace PHP echo expressions
  processed = processed.replace(/<\?php\s+echo\s+date\(['"]([A-Za-z0-9_\-\s:]+)['"]\);\s*\?>/gi, (_, fmt) => {
    if (fmt.includes('Y')) return new Date().getFullYear().toString();
    return new Date().toLocaleDateString();
  });
  processed = processed.replace(/<\?php\s+echo\s+\$site_name;\s*\?>/gi, siteName);
  processed = processed.replace(/<\?php\s+echo\s+\$current_year;\s*\?>/gi, new Date().getFullYear().toString());
  processed = processed.replace(/<\?php\s+echo\s+htmlspecialchars\((.*?)\);\s*\?>/gi, '$1');
  processed = processed.replace(/<\?php\s+echo\s+([^;]+);\s*\?>/gi, (_, expr) => expr.trim().replace(/^['"]|['"]$/g, ''));
  
  // Cleanly strip any remaining unexecuted PHP tags so HTML renders properly
  processed = processed.replace(/<\?php[\s\S]*?\?>/gi, '');
  return processed;
}

const PAGE_TEMPLATES = [
  {
    name: 'About Us Page (HTML/CSS)',
    title: 'About Us',
    slug: 'about-us',
    content: `<div class="space-y-6">
  <div class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-2xl shadow-sm text-center">
    <h1 class="text-3xl font-extrabold mb-2">Welcome to <?php echo $site_name; ?></h1>
    <p class="text-blue-100 max-w-2xl mx-auto text-sm sm:text-base">
      Your premier destination for high-performance laptops, mobile devices, and cutting-edge tech gadgets.
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
    <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-xs text-center">
      <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">🚀</div>
      <h3 class="font-bold text-gray-900 mb-2">100% Genuine Products</h3>
      <p class="text-sm text-gray-600">All products are directly sourced from official manufacturers with official warranty.</p>
    </div>

    <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-xs text-center">
      <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">⚡</div>
      <h3 class="font-bold text-gray-900 mb-2">Fast Nationwide Shipping</h3>
      <p class="text-sm text-gray-600">Quick and secure logistics delivery with real-time package tracking on every order.</p>
    </div>

    <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-xs text-center">
      <div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">🛡️</div>
      <h3 class="font-bold text-gray-900 mb-2">Dedicated 24/7 Support</h3>
      <p class="text-sm text-gray-600">Our customer care and technical support team is always ready to assist you.</p>
    </div>
  </div>

  <div class="bg-gray-50 border border-gray-200 p-6 rounded-xl text-gray-700 space-y-3">
    <h2 class="text-xl font-bold text-gray-900">Our Mission</h2>
    <p class="text-sm leading-relaxed">
      Founded in <?php echo date('Y'); ?>, our mission is to empower tech enthusiasts, professionals, and students with top-tier technology at transparent and competitive prices.
    </p>
  </div>
</div>`
  },
  {
    name: 'Privacy Policy (HTML/PHP)',
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    content: `<div class="space-y-6 text-gray-700">
  <div class="border-b border-gray-200 pb-4">
    <h1 class="text-2xl font-bold text-gray-900">Privacy Policy</h1>
    <p class="text-xs text-gray-500 mt-1">Last Updated: <?php echo date('F Y'); ?> | <?php echo $site_name; ?></p>
  </div>

  <section class="space-y-2">
    <h2 class="text-lg font-bold text-gray-900">1. Information We Collect</h2>
    <p class="text-sm leading-relaxed">
      When you place an order or interact with our live chat, we collect necessary transaction details including your name, email, delivery address, and phone number to fulfill your purchase.
    </p>
  </section>

  <section class="space-y-2">
    <h2 class="text-lg font-bold text-gray-900">2. How We Protect Your Data</h2>
    <p class="text-sm leading-relaxed">
      All payment and order data is processed using encrypted channels. We do not sell or rent your personal information to third-party advertisers.
    </p>
  </section>

  <div class="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg text-sm text-blue-900">
    <strong>Contact Privacy Desk:</strong> If you have any questions regarding your data privacy, reach us at our support portal.
  </div>
</div>`
  },
  {
    name: 'Contact & Support (HTML/CSS)',
    title: 'Contact Us',
    slug: 'contact-us',
    content: `<div class="space-y-6">
  <div class="text-center max-w-xl mx-auto space-y-2">
    <h1 class="text-2xl font-bold text-gray-900">Get in Touch with <?php echo $site_name; ?></h1>
    <p class="text-sm text-gray-600">Have a question or need technical advice? Our team is here to assist you.</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-white p-6 border border-gray-200 rounded-xl shadow-xs space-y-4">
      <h3 class="font-bold text-gray-900 text-base border-b pb-2">Store Headquarters</h3>
      <div class="space-y-2 text-sm text-gray-600">
        <p>📍 <strong>Address:</strong> Tech Central Avenue, Silicon Valley, CA</p>
        <p>🕒 <strong>Hours:</strong> Mon - Sat: 9:00 AM - 8:00 PM</p>
        <p>💬 <strong>Live Chat:</strong> Available on site bottom-right corner</p>
      </div>
    </div>

    <div class="bg-blue-50 p-6 border border-blue-200 rounded-xl space-y-3 text-blue-950">
      <h3 class="font-bold text-base border-b border-blue-200 pb-2">Fast Assistance</h3>
      <p class="text-sm">For instant help regarding orders, cancellations, or tracking, open the Live Chat widget at the bottom right corner of the store.</p>
    </div>
  </div>
</div>`
  },
  {
    name: 'FAQ & Help Center (HTML/CSS)',
    title: 'Frequently Asked Questions',
    slug: 'faq',
    content: `<div class="space-y-6">
  <div class="border-b border-gray-200 pb-4">
    <h1 class="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
    <p class="text-sm text-gray-500 mt-1">Quick answers to common questions about shopping at <?php echo $site_name; ?>.</p>
  </div>

  <div class="space-y-4">
    <div class="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
      <h3 class="font-bold text-gray-900 text-sm mb-1.5">📦 How do I track my order delivery?</h3>
      <p class="text-sm text-gray-600">
        You can track your parcel live anytime by visiting our <a href="/track-order" class="text-blue-600 underline font-semibold">Track Order</a> page and entering your Order ID (e.g. #ORD-1001) or Tracking Number.
      </p>
    </div>

    <div class="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
      <h3 class="font-bold text-gray-900 text-sm mb-1.5">💳 What payment methods are supported?</h3>
      <p class="text-sm text-gray-600">
        We support Cash on Delivery (COD), Mobile Banking (bKash / Nagad), and major Credit/Debit Cards.
      </p>
    </div>

    <div class="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
      <h3 class="font-bold text-gray-900 text-sm mb-1.5">🔄 What is the return and replacement policy?</h3>
      <p class="text-sm text-gray-600">
        We offer a 7-day hassle-free replacement warranty on manufacturing defects with original box packaging.
      </p>
    </div>
  </div>
</div>`
  },
  {
    name: '📱 iPhone 16 Pro Order Confirmed Showcase (Live Interactive Demo)',
    title: 'iPhone Order Confirmed Showcase',
    slug: 'iphone-order-confirmed-details',
    content: `<div class="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl shadow-lg border border-blue-800 text-center space-y-4">
  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
    ⚡ Live Order Confirmation Showcase
  </div>
  <h1 class="text-2xl sm:text-3xl font-black">iPhone 16 Pro Order Confirmation & Digital Invoice</h1>
  <p class="text-sm text-blue-200 max-w-xl mx-auto">
    This page dynamically runs the full payment verifying animation and presents the verified digital invoice with printable PDF download features for Apple iPhone 16 Pro Max.
  </p>
  <div class="pt-2">
    <a href="/page/iphone-order-confirmed-details" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all">
      Open Interactive Order Demo &rarr;
    </a>
  </div>
</div>`
  }
];

export default function AdminPages() {
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<'editor' | 'split' | 'preview'>('split');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({ id: null, title: '', slug: '', content: '' });
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (page: any) => {
    try {
      const res = await fetch(`/api/pages/${page.slug}`);
      if (res.ok) {
        const fullPage = await res.json();
        setFormData(fullPage);
        setIsEditing(true);
        setEditorTab('split');
      }
    } catch (err) {
      showToast('Failed to load page content', 'error');
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Custom Page',
      message: 'Are you sure you want to permanently delete this page? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/pages/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setPages(pages.filter(p => p.id !== id));
            showToast('Page deleted successfully');
          }
        } catch (err) {
          showToast('Error deleting page', 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `/api/admin/pages/${formData.id}` : '/api/admin/pages';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsEditing(false);
        showToast('Page saved successfully!');
        fetchPages();
      } else {
        showToast('Failed to save page', 'error');
      }
    } catch (err) {
      showToast('Error saving page', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Snippet insertion helper
  const insertSnippet = (snippet: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = formData.content || '';
    const newVal = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    setFormData({ ...formData, content: newVal });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  const applyTemplate = (template: typeof PAGE_TEMPLATES[0]) => {
    const load = () => {
      setFormData({
        ...formData,
        title: formData.title || template.title,
        slug: formData.slug || template.slug,
        content: template.content
      });
      showToast(`Loaded ${template.name}`);
    };

    if (formData.content) {
      setConfirmDialog({
        isOpen: true,
        title: 'Replace Current Content',
        message: `Are you sure you want to replace current content with ${template.name}? This will overwrite your current unsaved content.`,
        isDanger: true,
        onConfirm: () => {
          load();
          setConfirmDialog(null);
        }
      });
    } else {
      load();
    }
  };

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.slug.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  const displayedPages = filteredPages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (!user || user.role !== 'admin') return null;

  // EDIT / CREATE VIEW
  if (isEditing) {
    const renderedHtml = parsePhpAndHtml(formData.content, settings?.site_name || 'CoreCart');

    return (
      <div className="space-y-4 max-w-6xl mx-auto pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-[12px] border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEditing(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Back to Pages List"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-semibold tracking-tight text-gray-900 leading-tight">
                  {formData.id ? 'Edit Custom Page' : 'Create Custom Page'}
                </h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  HTML & PHP Code Supported
                </span>
              </div>
              
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="h-[30px] px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11.5px] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white h-[30px] px-3.5 rounded-lg text-[11.5px] font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Page
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className={`p-2.5 rounded-[12px] text-[12px] font-medium flex items-center gap-2 ${
            toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-[12px] p-3.5 sm:p-4 shadow-sm space-y-4">
          
          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Page Title</label>
              <input 
                type="text" 
                required
                value={formData.title || ''}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-lg h-[30px] px-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g. Terms & Conditions"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">URL Slug</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
                <span className="px-2 bg-gray-50 text-[11px] text-gray-500 border-r border-gray-200 font-mono">/</span>
                <input 
                  type="text" 
                  required
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')})}
                  className="w-full h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 outline-none"
                  placeholder="terms-and-conditions"
                />
              </div>
            </div>
          </div>

          {/* CODE & HTML SNIPPET TOOLBAR + TEMPLATE PRESETS */}
          <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>HTML / PHP Code Snippets & Quick Inserts</span>
              </div>

              {/* Template Presets Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] text-gray-500">Insert Template:</span>
                <select 
                  onChange={(e) => {
                    const tpl = PAGE_TEMPLATES.find(t => t.slug === e.target.value);
                    if (tpl) applyTemplate(tpl);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="bg-white border border-gray-300 rounded-md text-[11px] font-medium h-[24px] px-2 text-gray-700 outline-none cursor-pointer"
                >
                  <option value="" disabled>Choose Preset Page...</option>
                  {PAGE_TEMPLATES.map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick HTML / PHP Tag Buttons */}
            <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
              <button
                type="button"
                onClick={() => insertSnippet('<h1 class="text-2xl font-bold text-gray-900 mb-3">Main Heading</h1>\n')}
                className="px-1.5 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-gray-700 font-mono transition-colors cursor-pointer"
                title="Insert H1 Heading"
              >
                &lt;h1&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<h2 class="text-xl font-bold text-gray-900 mb-2">Section Title</h2>\n')}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-gray-700 font-mono transition-colors cursor-pointer"
                title="Insert H2 Heading"
              >
                &lt;h2&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<p class="text-sm text-gray-600 leading-relaxed mb-3">\n  Your paragraph text goes here.\n</p>\n')}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-gray-700 font-mono transition-colors cursor-pointer"
                title="Insert Paragraph"
              >
                &lt;p&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">\n  <div class="p-4 bg-white border border-gray-200 rounded-xl">Column 1</div>\n  <div class="p-4 bg-white border border-gray-200 rounded-xl">Column 2</div>\n</div>\n')}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-gray-700 font-mono transition-colors cursor-pointer"
                title="Insert 2-Column Grid"
              >
                &lt;grid-2&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<div class="p-4 bg-blue-50 border-l-4 border-blue-600 text-blue-900 rounded-r-lg my-3">\n  <strong>Note:</strong> Important announcement or note.\n</div>\n')}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-gray-700 font-mono transition-colors cursor-pointer"
                title="Insert Callout Alert"
              >
                &lt;alert-box&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<?php echo $site_name; ?>')}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-mono font-bold transition-colors cursor-pointer"
                title="Insert PHP Store Name Tag"
              >
                &lt;?php echo $site_name; ?&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<?php echo date(\'Y\'); ?>')}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-mono font-bold transition-colors cursor-pointer"
                title="Insert PHP Current Year"
              >
                &lt;?php echo date(\'Y\'); ?&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<a href="/products" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-xs hover:bg-blue-700">\n  Browse Products\n</a>\n')}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-gray-700 font-mono transition-colors cursor-pointer"
                title="Insert Styled Button"
              >
                &lt;button&gt;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<style>\n  /* Custom CSS rules for this page */\n  .custom-highlight { color: #2563eb; font-weight: bold; }\n</style>\n')}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded text-gray-700 font-mono transition-colors cursor-pointer"
                title="Insert Custom CSS Style Block"
              >
                &lt;style&gt;
              </button>
            </div>
          </div>

          {/* EDITOR / SPLIT / PREVIEW VIEW SWITCHER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-gray-700">
                Page Content (HTML & PHP Markup)
              </label>

              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setEditorTab('editor')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    editorTab === 'editor' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Code Only
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('split')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    editorTab === 'split' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  Live Split View
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    editorTab === 'preview' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Full Preview
                </button>
              </div>
            </div>

            {/* EDITOR CONTAINERS */}
            <div className={`grid gap-4 ${editorTab === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* CODE TEXTAREA */}
              {(editorTab === 'editor' || editorTab === 'split') && (
                <div className="flex flex-col border border-gray-300 rounded-xl overflow-hidden shadow-2xs focus-within:border-blue-500">
                  <div className="bg-slate-900 text-slate-300 px-3 py-1.5 text-[11px] flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      index.html / template.php
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(formData.content || '').length} characters
                    </span>
                  </div>
                  <textarea 
                    ref={textareaRef}
                    rows={18}
                    value={formData.content || ''}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full p-3.5 text-[12px] font-mono leading-relaxed text-slate-900 bg-slate-50/50 outline-none resize-y"
                    placeholder="<div>Write your custom HTML, CSS, and <?php echo ...; ?> code here...</div>"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* LIVE RENDER PREVIEW */}
              {(editorTab === 'preview' || editorTab === 'split') && (
                <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-gray-100 text-gray-700 px-3 py-1.5 text-[11px] flex items-center justify-between font-medium border-b border-gray-200">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      Live Render Preview
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      https://yoursite.com/{formData.slug || 'page-slug'}
                    </span>
                  </div>
                  <div className="p-5 overflow-y-auto max-h-[480px] bg-white text-gray-800">
                    {renderedHtml ? (
                      <div 
                        className="custom-html-content space-y-4"
                        dangerouslySetInnerHTML={{ __html: renderedHtml }} 
                      />
                    ) : (
                      <div className="p-8 text-center text-gray-400 text-[12px]">
                        Start typing HTML / PHP markup on the left to see the instant live preview.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white h-[32px] px-5 rounded-lg text-[12px] font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Page
            </button>
          </div>
        </form>
      </div>
    );
  }

  // PAGES LIST TABLE VIEW
  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-[12px] border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight text-gray-900 leading-tight">Custom Pages</h1>
            
          </div>
        </div>
        
        <button 
          onClick={() => {
            setFormData({ id: null, title: '', slug: '', content: '' });
            setIsEditing(true);
            setEditorTab('split');
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white h-[30px] px-3 rounded-lg text-[11.5px] font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add New Page
        </button>
      </div>

      {toastMessage && (
        <div className={`p-2.5 rounded-[12px] text-[12px] font-medium flex items-center gap-2 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-2.5 sm:p-3 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-2.5 bg-gray-50/50">
          <div className="text-[11.5px] text-gray-500 font-medium">
            Showing {filteredPages.length} custom page{filteredPages.length === 1 ? '' : 's'}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by title or slug..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg h-[30px] pl-8 pr-2.5 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] text-gray-600">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th className="px-3.5 py-2">Page Title</th>
                  <th className="px-3.5 py-2">Public URL Slug</th>
                  <th className="px-3.5 py-2">Format Support</th>
                  <th className="px-3.5 py-2">Last Updated</th>
                  <th className="px-3.5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedPages.map(page => (
                  <tr key={page.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{page.title}</span>
                        {(page.slug === 'iphone-order-confirmed-details' || page.slug === 'iphone-order-demo') && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                            📱 Order Showcase Demo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <a 
                        href={`/page/${page.slug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] font-mono text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        /{page.slug}
                      </a>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                        {(page.slug === 'iphone-order-confirmed-details' || page.slug === 'iphone-order-demo') ? 'Dynamic React + Invoice' : 'HTML + PHP'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-gray-500">
                      {new Date(page.updated_at || page.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3.5 py-2.5 text-right space-x-1">
                      <a 
                        href={`/page/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="View Live Page"
                        className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View Demo
                      </a>
                      <button 
                        onClick={() => handleEdit(page)}
                        title="Edit Page (HTML/PHP Code)"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(page.id)}
                        title="Delete Page"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedPages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-gray-400 text-[12px]">
                      No custom pages found. Click "Add New Page" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
          totalItems={filteredPages.length} 
          itemsPerPage={itemsPerPage} 
        />
      </div>

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

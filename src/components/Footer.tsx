import React, { useEffect, useState } from 'react';
import { 
  Laptop, 
  Twitter, 
  Linkedin, 
  Facebook, 
  Instagram, 
  Youtube, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Headphones, 
  Send, 
  CheckCircle2, 
  ArrowUp, 
  ChevronRight, 
  ChevronDown,
  Lock,
  Sparkles
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { Link } from 'react-router-dom';

interface CustomPageLink {
  id: number;
  title: string;
  slug: string;
}

export default function Footer() {
  const { settings } = useSettings();

  const siteName = settings?.site_name || 'TECHSHOP';
  const footerText = settings?.footer_text || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;
  const email = settings?.contact_email || 'support@techshop.com';
  const phone = settings?.contact_phone || '+1 (800) 123-4567';
  const phoneAlt = settings?.contact_phone_alt;
  const address = settings?.contact_address;
  const supportHours = settings?.support_hours || 'Mon - Sat: 9:00 AM - 8:00 PM';

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  // Dynamic Custom Pages
  const [customPages, setCustomPages] = useState<CustomPageLink[]>([]);

  // Mobile Accordion toggles for compact view
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    categories: false,
    services: false,
    account: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    fetch('/api/pages')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCustomPages(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setNewsletterLoading(true);
    setNewsletterError(null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to subscribe');
      setNewsletterSuccess(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSuccess(false), 5000);
    } catch (err: any) {
      setNewsletterError(err.message || 'Error subscribing. Please try again.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent('open-live-chat'));
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800/80 mt-auto font-sans relative z-10 text-xs selection:bg-blue-600 selection:text-white">
      
      {/* 1. TOP VALUE PROPOSITIONS / TRUST STRIP (Compact & Clean) */}
      <div className="border-b border-slate-800/60 bg-slate-950/40 py-3 sm:py-4 px-3.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
          
          <div className="flex items-center gap-2.5 p-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] sm:text-xs font-medium text-slate-100 tracking-tight truncate">Nationwide Shipping</h4>
              <p className="text-[10px] text-slate-400 truncate">Express doorstep delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] sm:text-xs font-medium text-slate-100 tracking-tight truncate">100% Genuine</h4>
              <p className="text-[10px] text-slate-400 truncate">Official brand warranty</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 border border-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] sm:text-xs font-medium text-slate-100 tracking-tight truncate">7-Day Returns</h4>
              <p className="text-[10px] text-slate-400 truncate">Hassle-free replacement</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] sm:text-xs font-medium text-slate-100 tracking-tight truncate">Support Helpline</h4>
              <p className="text-[10px] text-slate-400 truncate">Dedicated live assistance</p>
            </div>
          </div>

        </div>
      </div>

      {/* 2. NEWSLETTER & QUICK CONNECT BAR */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 py-3.5 sm:py-4 px-3.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-medium text-slate-100 tracking-tight">
                Subscribe to Tech Drops & Deals
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Get exclusive promo coupon codes and gadget release alerts.
            </p>
          </div>

          {/* Newsletter Form + Hotline */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 w-full md:w-auto">
            {newsletterSuccess ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 px-3 py-1.5 rounded-lg text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Subscribed successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex items-center w-full sm:w-auto max-w-sm">
                <div className="relative flex-1 sm:w-64">
                  <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="Your email address..."
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-l-lg h-8 pl-8 pr-2.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-normal transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={newsletterLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] h-8 px-3 rounded-r-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Send className="w-3 h-3" />
                  <span>{newsletterLoading ? '...' : 'Join'}</span>
                </button>
              </form>
            )}

            {/* Quick Hotline Pill */}
            <a
              href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 px-2.5 h-8 rounded-lg text-[11px] text-slate-200 hover:text-white transition-colors shrink-0"
              title="Call Helpline"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Phone className="w-3 h-3 text-blue-400" />
              <span className="font-mono font-medium text-slate-200">{phone}</span>
            </a>
          </div>

        </div>
      </div>

      {/* 3. MAIN COMPACT FOOTER LINKS (Responsive Grid + Mobile Collapsible Accordion) */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
          
          {/* COLUMN 1: BRAND IDENTITY & CONTACT */}
          <div className="md:col-span-5 lg:col-span-4 space-y-3">
            <Link to="/" className="inline-flex items-center gap-2">
              {settings?.logo_url ? (
                <img 
                  loading="lazy" 
                  decoding="async" 
                  src={settings.logo_url} 
                  alt={siteName} 
                  className={settings.show_site_name_in_header === false ? "h-7 max-w-[170px] object-contain" : "h-6 object-contain"} 
                />
              ) : (
                <div className="bg-blue-600 p-1 rounded-md">
                  <Laptop className="w-4 h-4 text-white" />
                </div>
              )}
              {(settings?.show_site_name_in_header !== false || !settings?.logo_url) && (
                <span className="text-base font-semibold tracking-tight text-white uppercase">
                  {siteName}
                </span>
              )}
            </Link>

            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-normal">
              Authentic electronics, laptops, smart accessories, and gaming hardware with official warranty and reliable shipping.
            </p>

            {/* Direct Contact Details */}
            <ul className="space-y-1.5 text-[11px] text-slate-400 pt-0.5">
              <li className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-400">Helpline:</span>
                <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="font-medium text-slate-300 hover:text-blue-400 transition-colors">
                  {phone}
                </a>
              </li>

              {phoneAlt && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-slate-400">WhatsApp:</span>
                  <a href={`tel:${phoneAlt.replace(/[^0-9+]/g, '')}`} className="font-medium text-slate-300 hover:text-emerald-400 transition-colors">
                    {phoneAlt}
                  </a>
                </li>
              )}

              <li className="flex items-center gap-2">
                <Mail className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="text-slate-400">Email:</span>
                <a href={`mailto:${email}`} className="font-medium text-slate-300 hover:text-blue-400 transition-colors truncate">
                  {email}
                </a>
              </li>

              {supportHours && (
                <li className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-slate-400">Hours: <span className="text-slate-300 font-normal">{supportHours}</span></span>
                </li>
              )}

              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-slate-400">{address}</span>
                </li>
              )}
            </ul>

            {/* Social Media Channels */}
            <div className="pt-1 flex items-center gap-1.5">
              {settings?.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noreferrer" title="Facebook" className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800/80 text-slate-400 hover:text-white hover:bg-blue-600 transition-colors">
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {settings?.twitter_url && (
                <a href={settings.twitter_url} target="_blank" rel="noreferrer" title="Twitter / X" className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800/80 text-slate-400 hover:text-white hover:bg-sky-500 transition-colors">
                  <Twitter className="w-3.5 h-3.5" />
                </a>
              )}
              {settings?.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noreferrer" title="Instagram" className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800/80 text-slate-400 hover:text-white hover:bg-pink-600 transition-colors">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {settings?.youtube_url && (
                <a href={settings.youtube_url} target="_blank" rel="noreferrer" title="YouTube" className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800/80 text-slate-400 hover:text-white hover:bg-red-600 transition-colors">
                  <Youtube className="w-3.5 h-3.5" />
                </a>
              )}
              {settings?.linkedin_url && (
                <a href={settings.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800/80 text-slate-400 hover:text-white hover:bg-blue-700 transition-colors">
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* COLUMN 2: POPULAR CATEGORIES */}
          <div className="md:col-span-2 lg:col-span-3 border-t md:border-t-0 border-slate-800/60 pt-3 md:pt-0">
            {/* Mobile accordion header / Desktop static header */}
            <button 
              type="button"
              onClick={() => toggleSection('categories')}
              className="w-full flex items-center justify-between md:cursor-default text-left group"
            >
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Categories
              </h3>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 md:hidden transition-transform duration-200 ${openSections.categories ? 'rotate-180' : ''}`} />
            </button>

            {/* Links list */}
            <ul className={`space-y-1.5 text-[11px] text-slate-400 mt-2.5 ${openSections.categories ? 'block' : 'hidden md:block'}`}>
              <li>
                <Link to="/?category=Laptop#all-products" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Laptops & Computers</span>
                </Link>
              </li>
              <li>
                <Link to="/?category=Mobile#all-products" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Smartphones & Tablets</span>
                </Link>
              </li>
              <li>
                <Link to="/?category=Audio%20%26%20Headphones#all-products" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Audio & Headphones</span>
                </Link>
              </li>
              <li>
                <Link to="/?category=Smartwatches%20%26%20Wearables#all-products" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Smartwatches & Wearables</span>
                </Link>
              </li>
              <li>
                <Link to="/?category=Gaming%20Hardware%20%26%20Mics#all-products" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Gaming Hardware</span>
                </Link>
              </li>
              <li>
                <Link to="/#all-products" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Special Clearance Deals</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: CUSTOMER SERVICE */}
          <div className="md:col-span-2 lg:col-span-2 border-t md:border-t-0 border-slate-800/60 pt-3 md:pt-0">
            {/* Mobile accordion header / Desktop static header */}
            <button 
              type="button"
              onClick={() => toggleSection('services')}
              className="w-full flex items-center justify-between md:cursor-default text-left group"
            >
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Support
              </h3>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 md:hidden transition-transform duration-200 ${openSections.services ? 'rotate-180' : ''}`} />
            </button>

            {/* Links list */}
            <ul className={`space-y-1.5 text-[11px] text-slate-400 mt-2.5 ${openSections.services ? 'block' : 'hidden md:block'}`}>
              <li>
                <Link to="/support" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Help Center & FAQ</span>
                </Link>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={handleOpenChat}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-left cursor-pointer"
                >
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Live Chat Assistant</span>
                </button>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Track Order Status</span>
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Warranty & Returns</span>
                </Link>
              </li>
              <li>
                <a 
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`} 
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Helpline Call</span>
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: ACCOUNT & POLICIES */}
          <div className="md:col-span-3 lg:col-span-3 border-t md:border-t-0 border-slate-800/60 pt-3 md:pt-0">
            {/* Mobile accordion header / Desktop static header */}
            <button 
              type="button"
              onClick={() => toggleSection('account')}
              className="w-full flex items-center justify-between md:cursor-default text-left group"
            >
              <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Account & Policies
              </h3>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 md:hidden transition-transform duration-200 ${openSections.account ? 'rotate-180' : ''}`} />
            </button>

            {/* Links list */}
            <ul className={`space-y-1.5 text-[11px] text-slate-400 mt-2.5 ${openSections.account ? 'block' : 'hidden md:block'}`}>
              <li>
                <Link to="/account" className="hover:text-purple-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>My Profile Dashboard</span>
                </Link>
              </li>
              <li>
                <Link to="/account?tab=orders" className="hover:text-purple-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Order History & Invoices</span>
                </Link>
              </li>
              <li>
                <Link to="/account?tab=addresses" className="hover:text-purple-400 transition-colors flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                  <span>Saved Addresses</span>
                </Link>
              </li>
              
              {/* Dynamically populated Custom Pages */}
              {customPages.map(page => (
                <li key={page.id}>
                  <Link to={`/page/${page.slug}`} className="hover:text-purple-400 transition-colors flex items-center gap-1">
                    <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                    <span>{page.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* 4. BOTTOM BAR: COPYRIGHT & COMPACT BADGES */}
      <div className="border-t border-slate-800/80 bg-slate-950/70 py-3.5 px-3.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          
          {/* Copyright & SSL */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[11px] text-slate-400">
            <span>{footerText}</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded">
              <Lock className="w-2.5 h-2.5 text-emerald-400" />
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>

          {/* Payment Methods Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-medium text-slate-300">
              <span className="text-blue-400 font-semibold">VISA</span>
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-medium text-slate-300">
              <span className="text-red-400 font-semibold">MasterCard</span>
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-medium text-slate-300">
              <span className="text-sky-400 font-semibold">AMEX</span>
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-medium text-pink-400">
              <span>bKash</span>
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-medium text-amber-400">
              <span>Nagad</span>
            </div>
            <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-medium text-emerald-400">
              <span>Cash on Delivery</span>
            </div>

            {/* Back to top button */}
            <button
              type="button"
              onClick={scrollToTop}
              className="ml-1 w-6 h-6 flex items-center justify-center rounded-md bg-slate-800/90 hover:bg-blue-600 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Back to top"
              aria-label="Back to top"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>

        </div>
      </div>

    </footer>
  );
}

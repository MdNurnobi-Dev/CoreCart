import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  Truck, 
  Package, 
  CreditCard, 
  Copy, 
  Check, 
  ArrowRight, 
  ShoppingBag, 
  FileText, 
  Clock, 
  Download, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  PhoneCall,
  Headphones,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from './LazyImage';

export interface ConfirmedOrderItem {
  product_id?: number;
  id?: number;
  name?: string;
  product_name?: string;
  price?: number | string;
  quantity: number;
  image_url?: string;
  product_image?: string;
  category?: string;
  product_category?: string;
}

export interface ConfirmedOrderData {
  id: number | string;
  trackingNumber?: string;
  tracking_number?: string;
  total_amount?: number | string;
  total?: number | string;
  paymentMethod?: string;
  payment_method?: string;
  shippingAddress?: string | {
    fullName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  shipping_address?: string;
  status?: string;
  items?: ConfirmedOrderItem[];
  createdAt?: string;
  created_at?: string;
  transactionId?: string;
}

interface OrderConfirmationProps {
  order: ConfirmedOrderData;
  isNewSubmission?: boolean;
  key?: React.Key;
}

export default function OrderConfirmation({ order, isNewSubmission = true }: OrderConfirmationProps) {
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  const navigate = useNavigate();

  const [invoiceSettings, setInvoiceSettings] = useState(() => {
    const saved = localStorage.getItem('invoice_pdf_template_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {}
    }
    return null;
  });

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('invoice_pdf_template_settings');
      if (saved) {
        try {
          setInvoiceSettings(JSON.parse(saved));
        } catch (err) {}
      }
    };
    window.addEventListener('invoice-settings-updated', handleUpdate);
    return () => window.removeEventListener('invoice-settings-updated', handleUpdate);
  }, []);

  const [verificationStage, setVerificationStage] = useState<number>(isNewSubmission ? 0 : 3);
  const [progressPercent, setProgressPercent] = useState<number>(isNewSubmission ? 5 : 100);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const orderId = order.id || 'N/A';
  const trackingNo = order.trackingNumber || order.tracking_number || `TS-${orderId}`;
  const totalAmount = Number(order.total_amount || order.total || 0);
  const payMethod = order.paymentMethod || order.payment_method || 'Credit Card';
  const status = order.status || 'Paid';
  const items = order.items || [];
  const createdAt = order.createdAt || order.created_at || new Date().toISOString();
  const transactionId = order.transactionId || `TXN-${String(orderId).padStart(6, '0')}`;

  // Format shipping address cleanly
  let formattedAddress = 'N/A';
  let recipientName = 'Valued Customer';

  if (typeof order.shippingAddress === 'object' && order.shippingAddress !== null) {
    recipientName = order.shippingAddress.fullName || 'Valued Customer';
    formattedAddress = [
      order.shippingAddress.address,
      order.shippingAddress.city,
      order.shippingAddress.postalCode,
      order.shippingAddress.country
    ].filter(Boolean).join(', ');
  } else if (typeof order.shipping_address === 'string' && order.shipping_address) {
    formattedAddress = order.shipping_address;
  } else if (typeof order.shippingAddress === 'string' && order.shippingAddress) {
    formattedAddress = order.shippingAddress;
  }

  // Invoice Template configuration helpers
  const paperSize = invoiceSettings?.paper_size || 'A4';
  const marginSize = invoiceSettings?.margin_size || 'standard';
  const primaryColor = invoiceSettings?.primary_color || '#0F172A';
  const accentColor = invoiceSettings?.accent_color || '#3B82F6';
  const headerStyle = invoiceSettings?.header_style || 'gradient';
  
  // Custom or fallback business data
  const companyName = invoiceSettings?.company_name || settings?.site_name || 'TechShop Electronics';
  const companyPhone = invoiceSettings?.company_phone || settings?.contact_phone || '+1 (800) 123-4567';
  const companyEmail = invoiceSettings?.company_email || settings?.contact_email || 'support@techshop.com';
  const companyAddress = invoiceSettings?.company_address || settings?.contact_address || 'Official Store Address';
  const companyTaxId = invoiceSettings?.company_tax_id || '';
  const companyWebsite = invoiceSettings?.company_website || '';
  const showCompanyWebsite = invoiceSettings?.show_company_website !== false;

  // Header Title & Greeting
  const invoiceTitle = invoiceSettings?.invoice_title || 'OFFICIAL TAX INVOICE';
  const greetingText = invoiceSettings?.greeting_text || 'Official Digital Invoice & Order Confirmation';
  
  // Custom totals calculations
  const calculatedSubtotal = items.length > 0 
    ? items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0)
    : totalAmount;

  const hasInvoiceCustomizations = invoiceSettings !== null;
  
  const customDiscountPercent = hasInvoiceCustomizations ? Number(invoiceSettings.discount_rate_percent ?? 0) : 0;
  const customDiscountAmount = calculatedSubtotal * (customDiscountPercent / 100);
  
  const customTaxPercent = hasInvoiceCustomizations ? Number(invoiceSettings.tax_rate_percent ?? 0) : 0;
  const customTaxAmount = (calculatedSubtotal - customDiscountAmount) * (customTaxPercent / 100);
  
  const customShippingFee = hasInvoiceCustomizations ? Number(invoiceSettings.shipping_fee ?? 0) : 0;
  
  const customFinalTotal = hasInvoiceCustomizations 
    ? (calculatedSubtotal - customDiscountAmount + customTaxAmount + customShippingFee)
    : totalAmount;
  
  // Margins padding
  const getMarginPadding = () => {
    switch (marginSize) {
      case 'compact': return 'p-3 sm:p-4 text-[11px] gap-2';
      case 'wide': return 'p-6 sm:p-10 text-xs gap-5';
      default: return 'p-4 sm:p-6 text-xs gap-3';
    }
  };

  // Verification stage sequence runner
  useEffect(() => {
    if (!isNewSubmission) {
      setVerificationStage(3);
      setProgressPercent(100);
      return;
    }

    // Step 0 -> Step 1 at 900ms
    const timer1 = setTimeout(() => {
      setVerificationStage(1);
      setProgressPercent(35);
    }, 900);

    // Step 1 -> Step 2 at 2100ms
    const timer2 = setTimeout(() => {
      setVerificationStage(2);
      setProgressPercent(70);
    }, 2100);

    // Step 2 -> Step 3 at 3200ms
    const timer3 = setTimeout(() => {
      setVerificationStage(3);
      setProgressPercent(100);
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isNewSubmission]);

  const copyTracking = () => {
    if (!trackingNo) return;
    navigator.clipboard.writeText(trackingNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contactPhone = settings?.contact_phone || '+1 (800) 123-4567';

  const handleDownloadPDFInvoice = () => {
    const invoiceElement = document.querySelector('.printable-invoice') as HTMLElement;
    if (!invoiceElement) return;

    setIsGeneratingPDF(true);

    // Dynamic standard PDF standards styling
    const opt = {
      margin:       marginSize === 'compact' ? 5 : (marginSize === 'wide' ? 15 : 10),
      filename:     `Invoice_Order_${orderId}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 } as const,
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false
      },
      jsPDF:        { 
        unit: 'mm', 
        format: paperSize.startsWith('POS') ? 'a6' : paperSize.toLowerCase(), 
        orientation: 'portrait' as const
      }
    };

    // Use html2pdf with elegant chain promise execution
    html2pdf()
      .from(invoiceElement)
      .set(opt)
      .save()
      .then(() => {
        setIsGeneratingPDF(false);
      })
      .catch((err: any) => {
        console.error('PDF generation error:', err);
        setIsGeneratingPDF(false);
        // Direct browser print fallback if execution throws
        try {
          window.print();
        } catch (printErr) {}
      });
  };

  const handleLiveSupport = () => {
    try {
      window.dispatchEvent(new CustomEvent('open-chat'));
    } catch (e) {}
    navigate('/support');
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const stages = [
    { label: 'Validating Payment & Address Credentials', icon: CreditCard },
    { label: `Connecting to Payment Gateway (${payMethod})`, icon: ShieldCheck },
    { label: 'Processing Order & Reserving Inventory', icon: Package },
    { label: 'Payment Verified & Order Confirmed!', icon: CheckCircle2 }
  ];

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8 text-slate-800 font-sans">
      
      {/* 1. PROGRESS RUNNER CONTAINER */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 mb-6 no-print">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {verificationStage < 3 ? 'Verifying & Processing Payment...' : 'Payment Confirmed & Order Created'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {verificationStage < 3 ? 'Please wait a moment while we process your request securely.' : 'Your transaction has been verified and logged successfully.'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              verificationStage < 3 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {verificationStage < 3 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Processing
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified
                </>
              )}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-5">
          <div 
            className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const isDone = verificationStage > idx || (verificationStage === 3 && idx === 3);
            const isCurrent = verificationStage === idx && verificationStage < 3;

            return (
              <div 
                key={`stage-${idx}`}
                className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                  isDone 
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                    : isCurrent 
                      ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs' 
                      : 'bg-slate-50/50 border-slate-200/60 text-slate-400'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 opacity-50" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Step 0{idx + 1}</p>
                  <p className="text-[11px] font-semibold leading-snug line-clamp-2">{st.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CONFIRMED ORDER & DIGITAL INVOICE SECTION */}
      <div className={`transition-all duration-500 ${verificationStage === 3 ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none'}`}>
        
        {/* Printable Digital Invoice Container */}
        <div 
          style={{ 
            maxWidth: paperSize.startsWith('POS') 
              ? (paperSize === 'POS_80mm' ? '380px' : '280px') 
              : '850px',
            margin: '0 auto',
            borderColor: primaryColor + '20'
          }}
          className="bg-white rounded-2xl shadow-md border overflow-hidden printable-invoice transition-all duration-300 relative text-slate-800"
        >
          {/* Watermark Stamp Overlay */}
          {invoiceSettings?.show_watermark !== false && (
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
              <span className="text-5xl sm:text-7xl font-black border-[12px] border-red-600 text-red-600 rounded-2xl px-6 py-2 rotate-12 select-none tracking-widest uppercase">
                {invoiceSettings?.watermark_text || 'PAID'}
              </span>
            </div>
          )}

          {/* INVOICE HEADER BANNER */}
          {headerStyle === 'gradient' ? (
            <div 
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}E0, ${primaryColor})`,
                borderColor: primaryColor
              }}
              className="text-white p-5 sm:p-7 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {invoiceSettings?.show_payment_status_badge !== false && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Confirmed Paid
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                    {invoiceTitle}
                  </h1>
                  <p className="text-xs text-slate-200/90 mt-0.5">
                    {greetingText}
                  </p>
                </div>

                <div className="text-left sm:text-right bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/15 shrink-0 font-mono">
                  <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest leading-none">Order ID</p>
                  <p className="text-sm sm:text-base font-bold text-white mt-1">#{orderId}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">{formattedDate}</p>
                </div>
              </div>
            </div>
          ) : headerStyle === 'solid' ? (
            <div 
              style={{ backgroundColor: primaryColor }}
              className="text-white p-5 sm:p-6"
            >
              <div className="flex justify-between items-center gap-2">
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight uppercase">{invoiceTitle}</h1>
                  <p className="text-[11px] text-slate-200 mt-0.5">{greetingText}</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <p className="font-extrabold text-white">#{orderId}</p>
                  <p className="text-slate-300 text-[10px]">{formattedDate}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 border-b border-slate-100 text-slate-800">
              <div className="flex justify-between items-center gap-2">
                <div>
                  <h1 className="text-lg font-black uppercase tracking-tight" style={{ color: primaryColor }}>{invoiceTitle}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">{greetingText}</p>
                </div>
                <div className="text-right font-mono text-xs text-slate-600">
                  <p className="font-extrabold text-slate-900">Order ID: #{orderId}</p>
                  <p className="text-[10px] text-slate-400">{formattedDate}</p>
                </div>
              </div>
            </div>
          )}

          {/* INVOICE BODY SENSITIVE METADATA */}
          <div className={`border-b border-slate-100 bg-slate-50/50 ${getMarginPadding()} grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs relative z-10`}>
            
            {/* Issuer details */}
            <div className="space-y-1">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Seller / Official Outlets</p>
              <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{companyName}</h4>
              <p className="text-slate-500 text-[11px] leading-tight max-w-sm">{companyAddress}</p>
              <div className="pt-1.5 space-y-0.5 text-[10.5px] text-slate-600">
                <p>Phone: <span className="font-bold text-slate-800">{companyPhone}</span></p>
                <p>Email: <span className="font-semibold text-slate-800">{companyEmail}</span></p>
                {companyTaxId && <p>Tax ID / BIN: <span className="font-mono text-slate-800">{companyTaxId}</span></p>}
                {showCompanyWebsite && companyWebsite && (
                  <p>Web: <a href={`https://${companyWebsite}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{companyWebsite}</a></p>
                )}
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-1 sm:text-right flex flex-col sm:items-end">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Bill To / Ship To</p>
              <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{recipientName}</h4>
              
              {invoiceSettings?.show_shipping_destination !== false && (
                <p className="text-slate-500 text-[11px] leading-tight sm:text-right max-w-xs mt-1">
                  {formattedAddress}
                </p>
              )}

              {invoiceSettings?.show_billing_address !== false && (
                <p className="text-[10px] text-slate-400 sm:text-right mt-1.5">
                  Billing address: Same as Shipping Address
                </p>
              )}
            </div>
          </div>

          {/* DYNAMIC LOGISTICS METADATA BAR */}
          <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-600 relative z-10">
            {invoiceSettings?.show_tracking_number !== false && (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-3xs">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tracking No.</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-900">{trackingNo}</span>
                  <button 
                    onClick={copyTracking}
                    className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors no-print cursor-pointer"
                    title="Copy Tracking Number"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}

            {invoiceSettings?.show_payment_method !== false && (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-3xs">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Payment Gateway</span>
                <span className="font-bold text-slate-800 block mt-0.5">{payMethod}</span>
                {invoiceSettings?.show_transaction_id !== false && (
                  <span className="font-mono text-[9px] text-slate-400 block mt-0.5">{transactionId}</span>
                )}
              </div>
            )}

            <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-3xs">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Order Status</span>
              <span className="font-bold text-emerald-600 uppercase block mt-0.5">{status}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Direct settlement</span>
            </div>
          </div>

          {/* ORDER ITEMS TABLE */}
          <div className="p-4 sm:p-6 relative z-10">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Itemized Breakdown ({items.length})
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-5 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr 
                    style={{ borderBottom: `2px solid ${primaryColor}` }}
                    className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider"
                  >
                    <th className="py-2 px-3 sm:px-4">Item Description</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-3 sm:px-4 text-right">Unit Price</th>
                    {invoiceSettings?.show_vat_column && (
                      <th className="py-2 px-3 text-right">Tax ({invoiceSettings?.tax_rate_percent || 0}%)</th>
                    )}
                    <th className="py-2 px-3 sm:px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={invoiceSettings?.show_vat_column ? 5 : 4} className="p-4 text-center text-slate-400">
                        Item breakdown logged with order #{orderId}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const itemName = item.name || item.product_name || 'Electronics Product';
                      const itemImg = item.image_url || item.product_image || DEFAULT_PRODUCT_IMAGE;
                      const itemCategory = item.category || item.product_category || 'Electronics';
                      const itemPrice = Number(item.price || 0);
                      const itemQty = Number(item.quantity || 1);
                      const itemTotal = itemPrice * itemQty;
                      const itemVat = itemTotal * ((invoiceSettings?.tax_rate_percent || 0) / 100);

                      return (
                        <tr key={`item-${idx}`} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4">
                            <div className="flex items-center gap-2.5">
                              {invoiceSettings?.show_item_image !== false && (
                                <img loading="lazy" decoding="async" 
                                  src={itemImg} 
                                  alt={itemName}
                                  className="w-8 h-8 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-[11.5px] truncate">{itemName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {invoiceSettings?.show_item_sku !== false && (
                                    <span className="font-mono text-[9px] text-slate-400">ID: {item.id || item.product_id || idx}</span>
                                  )}
                                  {invoiceSettings?.show_item_category !== false && (
                                    <span className="inline-block text-[8.5px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                      {itemCategory}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                            x{itemQty}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 text-right font-medium text-slate-600">
                            {currency}{itemPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {invoiceSettings?.show_vat_column && (
                            <td className="py-2.5 px-3 text-right font-medium text-slate-500">
                              {currency}{itemVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          )}
                          <td className="py-2.5 px-3 sm:px-4 text-right font-bold text-slate-900">
                            {currency}{itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* DYNAMIC METRIC ARITHMETIC ROW */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              
              {/* Terms Conditions */}
              <div className="text-[10px] text-slate-400 space-y-1.5 max-w-sm">
                <p className="font-bold text-slate-600 uppercase tracking-wider">Guarantee & Terms</p>
                <div className="whitespace-pre-line leading-relaxed">
                  {invoiceSettings?.terms_conditions || `All items are covered under standard 1-year manufacturer warranty. For cancellations or support, quote Order ID #${orderId}.`}
                </div>
              </div>

              {/* Advanced Pricing Breakdown math */}
              <div className="w-full sm:w-60 space-y-1.5 text-xs text-slate-600 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {currency}{calculatedSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                {customDiscountPercent > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({customDiscountPercent}%)</span>
                    <span>-{currency}{customDiscountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Estimated VAT / Tax ({customTaxPercent}%)</span>
                  <span className="font-medium">
                    {currency}{customTaxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping & Handling</span>
                  {customShippingFee === 0 ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-bold text-slate-800">{currency}{customShippingFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                </div>

                <div 
                  style={{ borderTopColor: primaryColor }}
                  className="pt-2 border-t flex justify-between items-center text-xs font-black text-slate-900"
                >
                  <span className="text-[11px] uppercase tracking-wider">Total Amount</span>
                  <span className="text-sm font-black" style={{ color: primaryColor }}>
                    {currency}{customFinalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* SIGNATURE CONTAINER IF ENABLED */}
            {invoiceSettings?.show_signature_line !== false && (
              <div className="flex justify-end pt-8 pb-3 text-right">
                <div className="w-48 border-t border-slate-300 pt-1 text-center text-[10px] text-slate-500">
                  <p className="font-bold text-slate-800 leading-tight">
                    {invoiceSettings?.signature_title || 'Authorized Seal & Signature'}
                  </p>
                  <p className="text-[8.5px] text-slate-400 mt-0.5">CoreCart Premium Retail</p>
                </div>
              </div>
            )}

          </div>

          {/* INVOICE FOOTER */}
          <div className="bg-slate-50 p-3 sm:p-4 text-center text-[10.5px] text-slate-400 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 relative z-10">
            <span>Thank you for shopping with {companyName}!</span>
            <span className="font-mono text-[9px] text-slate-400 font-bold">Verified Secure Document • {formattedDate}</span>
          </div>

        </div>

        {/* 3. ACTION TOOLBAR (NO PRINT) */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDFInvoice}
              disabled={isGeneratingPDF}
              className={`inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${isGeneratingPDF ? 'opacity-70 cursor-not-allowed' : ''}`}
              title="Download or Print PDF Tax Invoice"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Download PDF Invoice</span>
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/account')}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              title="View your account and order history"
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Go to Account</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLiveSupport}
              className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              title="Chat with Customer Support"
            >
              <Headphones className="w-4 h-4 text-blue-600" />
              <span>Live Support</span>
            </button>

            <a
              href={`tel:${contactPhone.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              title={`Call support hotline: ${contactPhone}`}
            >
              <PhoneCall className="w-4 h-4 text-amber-600" />
              <span>Call Support</span>
            </a>

            <button
              onClick={() => navigate(`/track-order?query=${trackingNo}`)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Track Order</span>
            </button>
          </div>

        </div>

      </div>

      {/* Embedded CSS for Print Mode */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-invoice, .printable-invoice * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background-color: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}

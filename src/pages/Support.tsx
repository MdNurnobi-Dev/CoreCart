import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Headphones, 
  MessageSquare, 
  Mail, 
  Phone, 
  Package, 
  ShieldCheck, 
  RefreshCw, 
  CreditCard, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  Home, 
  Send, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles,
  HelpCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';

interface FAQItem {
  id: string;
  category: 'orders' | 'returns' | 'payment' | 'warranty';
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'orders',
    question: 'How do I track the delivery status of my order?',
    answer: 'You can easily track your order in real-time by visiting our Track Order page and entering your Order ID (e.g. #ORD-1001) or your courier tracking number. You will see exact milestone timestamps from processing to courier handover and door delivery.'
  },
  {
    id: 'faq-2',
    category: 'orders',
    question: 'What is the estimated delivery time for my location?',
    answer: 'Standard metro deliveries usually take 1 to 2 business days. Outside metro areas and nationwide deliveries typically take 2 to 4 business days. You will receive SMS / tracking updates once your parcel is dispatched.'
  },
  {
    id: 'faq-3',
    category: 'returns',
    question: 'What is your return & replacement policy?',
    answer: 'We offer a 7-day hassle-free replacement warranty on all genuine electronics and accessories. If your device arrives defective, damaged, or does not match specifications, contact support within 7 days with the original packaging intact.'
  },
  {
    id: 'faq-4',
    category: 'returns',
    question: 'How do I request an order cancellation or refund?',
    answer: 'You can cancel unfulfilled orders instantly through our Live Chat widget or by submitting your Order ID in the cancellation request flow. For paid orders, refunds are credited back to your original payment method within 3-5 working days.'
  },
  {
    id: 'faq-5',
    category: 'payment',
    question: 'What payment methods do you accept?',
    answer: 'We support Cash on Delivery (COD), Mobile Financial Services (bKash, Nagad), and all major Debit/Credit Cards (Visa, Mastercard, American Express) through secure encrypted gateways.'
  },
  {
    id: 'faq-6',
    category: 'payment',
    question: 'Is online payment secure on your platform?',
    answer: 'Yes, all online transactions are processed through 256-bit SSL encrypted PCI-DSS compliant payment gateways. We never store your full card credentials or PIN codes.'
  },
  {
    id: 'faq-7',
    category: 'warranty',
    question: 'Are all products 100% authentic with official warranty?',
    answer: 'Absolutely. Every laptop, mobile device, and accessory sold in our store is 100% brand new, authentic, and backed by official manufacturer warranty. The warranty duration is listed on each product page and invoice.'
  },
  {
    id: 'faq-8',
    category: 'warranty',
    question: 'How do I claim official warranty service for my product?',
    answer: 'To claim warranty, keep your order invoice and original box. You can bring the device to any authorized brand service center or contact our support team to facilitate reverse logistics.'
  }
];

export default function Support() {
  const { settings } = useSettings();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');

  // Contact form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    subject: 'General Inquiry',
    orderId: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const siteName = settings?.site_name || 'TechStore';
  const supportEmail = settings?.contact_email || 'support@techstore.com';
  const supportPhone = settings?.contact_phone || '+1 (800) 123-4567';
  const supportPhoneAlt = settings?.contact_phone_alt;
  const supportAddress = settings?.contact_address;
  const supportHours = settings?.support_hours || 'Mon - Sat: 9:00 AM - 8:00 PM';

  const handleOpenLiveChat = () => {
    window.dispatchEvent(new CustomEvent('open-live-chat'));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/support-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          order_id: formData.orderId,
          message: formData.message
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit support inquiry');
      }

      setSubmittedSuccess(true);
      if (data.ticket?.id) {
        setCreatedTicketId(data.ticket.id);
      }
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        subject: 'General Inquiry',
        orderId: '',
        message: ''
      });
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while submitting message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFaqs = FAQS.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 bg-slate-50 flex flex-col pb-16">
      <SEO title="Support & FAQ" />
      
      {/* HERO SECTION */}
      <div className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold backdrop-blur-xs border border-white/15">
            <Headphones className="w-3.5 h-3.5" />
            <span>24/7 Dedicated Customer Care</span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            How can we assist you today?
          </h1>
          
          <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto leading-relaxed">
            Have questions about orders, deliveries, warranty, or returns? Search our help guides or connect with our support agents.
          </p>

          {/* Quick Search Box */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative flex items-center bg-white rounded-xl shadow-md overflow-hidden text-gray-900">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help topics, tracking, warranty, returns..."
                className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm outline-none placeholder-gray-400 text-gray-800"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mr-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        
        {/* BREADCRUMB */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">Support Center</span>
        </nav>

        {/* 4 CORE SUPPORT CHANNELS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Live Chat Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Instant Live Chat</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Chat live with our customer support specialists and automated QA bot.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenLiveChat}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Live Chat</span>
            </button>
          </div>

          {/* Track Order Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Track Package</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Check live shipping status and courier milestones with your Order ID.
                </p>
              </div>
            </div>
            <Link
              to="/track-order"
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Track Order Live</span>
            </Link>
          </div>

          {/* Email Support Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Email Support</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Send detailed inquiries, attachments, or warranty claims.
                </p>
              </div>
            </div>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span className="truncate">{supportEmail}</span>
            </a>
          </div>

          {/* Phone Helpline Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Customer Hotline</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {supportHours}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <a
                href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Direct Dial"
              >
                <Phone className="w-3.5 h-3.5 text-white" />
                <span>{supportPhone}</span>
              </a>
              {supportPhoneAlt && (
                <a
                  href={`tel:${supportPhoneAlt.replace(/[^0-9+]/g, '')}`}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-medium py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>{supportPhoneAlt} (Alt)</span>
                </a>
              )}
            </div>
          </div>

        </section>

        {/* PHYSICAL ADDRESS & OPERATING HOURS BANNER (If Address Configured) */}
        {supportAddress && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Official Support Center & Store Location</h3>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{supportAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 shrink-0">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-gray-800">Support Hours: </span>
                <span className="text-gray-600">{supportHours}</span>
              </div>
            </div>
          </div>
        )}

        {/* TWO COLUMN SECTION: FAQ & DIRECT INQUIRY FORM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: FAQ ACCORDION (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h2>
                <p className="text-xs text-gray-500">Quick solutions to popular questions.</p>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'returns', label: 'Returns' },
                  { id: 'payment', label: 'Payments' },
                  { id: 'warranty', label: 'Warranty' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedCategory === tab.id
                        ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-2">
              {filteredFaqs.map(faq => {
                const isOpen = expandedFaq === faq.id;
                return (
                  <div 
                    key={faq.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs transition-all"
                  >
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                      className="w-full text-left p-3 flex items-center justify-between gap-2.5 text-xs sm:text-[13px] font-bold text-gray-900 hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[10px] flex items-center justify-center shrink-0 font-bold">
                          ?
                        </span>
                        <span>{faq.question}</span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-slate-50/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div className="p-8 text-center bg-white border border-gray-200 rounded-xl text-gray-400 text-xs">
                  No questions match your search. Try another keyword or message our live support.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: DIRECT MESSAGE / TICKET FORM (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Send a Support Message</h3>
                  <p className="text-[11px] text-gray-500">We usually respond within a few hours.</p>
                </div>
              </div>
            </div>

            {submittedSuccess ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">Message Sent Successfully!</h4>
                {createdTicketId && (
                  <div className="inline-block bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[11px] font-mono font-bold px-2.5 py-1 rounded-md">
                    Ticket Reference: #{createdTicketId}
                  </div>
                )}
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Thank you for contacting {siteName}. Your inquiry has been registered with our customer support desk. An agent will contact you via email or phone shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setCreatedTicketId(null);
                  }}
                  className="mt-2 text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
                {submitError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Your Full Name *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="w-full bg-white border border-gray-200 rounded-lg h-9 px-3 text-xs text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="e.g. john@example.com"
                      className="w-full bg-white border border-gray-200 rounded-lg h-9 px-3 text-xs text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Phone / WhatsApp (Optional)</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="e.g. +1 800 123 4567"
                      className="w-full bg-white border border-gray-200 rounded-lg h-9 px-3 text-xs text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Order ID (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.orderId}
                      onChange={(e) => setFormData({...formData, orderId: e.target.value})}
                      placeholder="e.g. #ORD-1002"
                      className="w-full bg-white border border-gray-200 rounded-lg h-9 px-3 text-xs text-gray-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Topic / Category *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg h-9 px-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Order Tracking & Delay">Order Tracking & Delay</option>
                    <option value="Return / Replacement">Return / Replacement</option>
                    <option value="Payment & Billing">Payment & Billing</option>
                    <option value="Warranty Claim">Warranty Claim</option>
                    <option value="Product Advice">Product Advice</option>
                    <option value="Technical Support">Technical Support</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Describe Your Inquiry *</label>
                  <textarea 
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Provide details about your question, problem or product..."
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending Message...' : 'Submit Support Message'}</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  CreditCard, 
  AlertCircle, 
  ArrowLeft,
  Copy, 
  Check, 
  MessageSquare,
  Building2,
  Calendar
} from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from '../components/LazyImage';
import { SEO } from '../components/SEO';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  product_category?: string;
  quantity: number;
  price: string | number;
}

interface OrderData {
  id: number;
  user_name?: string;
  user_email?: string;
  total_amount: string | number;
  status: string;
  payment_method: string;
  payment_details?: any;
  shipping_address?: string;
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
  items?: OrderItem[];
}

export default function TrackOrder() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';

  const [searchQuery, setSearchQuery] = useState(routeId || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (routeId) {
      setSearchQuery(routeId);
      performTrack(routeId);
    }
  }, [routeId]);

  const performTrack = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) {
      setError('Please enter an Order ID or Tracking Number');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const data = await apiFetch(`/track-order/${encodeURIComponent(q)}`);
      if (data && data.id) {
        setOrder(data);
      } else {
        setError('No order found matching this Order ID or Tracking Number.');
      }
    } catch (err: any) {
      console.error('Error tracking order:', err);
      setError(err?.message || 'Order not found. Please verify your Order ID or Tracking Number.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/track-order/${encodeURIComponent(searchQuery.trim())}`);
      performTrack(searchQuery);
    }
  };

  const copyTracking = () => {
    if (!order?.tracking_number) return;
    navigator.clipboard.writeText(order.tracking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute Active Step based on status
  const getStepIndex = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') return 4;
    if (s === 'out for delivery' || s === 'on delivery') return 3;
    if (s === 'shipped' || s === 'dispatched') return 2;
    if (s === 'processing' || s === 'packed' || s === 'paid') return 1;
    if (s === 'pending' || s === 'placed') return 0;
    return 1;
  };

  const steps = [
    { title: 'Order Placed', desc: 'Order received into system', icon: Clock },
    { title: 'Processing & Verified', desc: 'Items packed in warehouse', icon: Package },
    { title: 'Handed to Courier', desc: 'In transit with delivery partner', icon: Truck },
    { title: 'Out for Delivery', desc: 'Courier agent on route to address', icon: Building2 },
    { title: 'Delivered', desc: 'Package successfully delivered', icon: CheckCircle2 }
  ];

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status?.toLowerCase() === 'cancelled';

  return (
    <div className="min-h-[calc(100vh-50px)] bg-slate-50 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
      <SEO title="Track Order" />
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <Link 
            to="/account" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Account</span>
          </Link>
          <span className="text-[11px] font-medium text-slate-400">Live Logistics Tracking</span>
        </div>

        {/* Hero Search Box */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xs">
          <div className="max-w-xl mx-auto text-center mb-4 sm:mb-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5 border border-blue-100">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">Track Your Order</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Enter your Order ID (e.g. <b>#1001</b>) or Tracking Code to view live progress.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex gap-1.5 sm:gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order ID / Tracking ID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-3 py-1.5 sm:py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <span>Track</span>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-3 max-w-md mx-auto bg-amber-50 border border-amber-200 rounded-lg sm:rounded-xl p-2.5 flex items-center gap-2 text-xs text-amber-800 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Order Details & Visual Timeline */}
        {order && (
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-2xs overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            
            {/* Top Status Bar */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-slate-900">Order #{order.id}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                    isCancelled ? 'bg-red-100 text-red-700' :
                    order.status === 'Completed' || order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Placed on {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </p>
              </div>

              {order.tracking_number && (
                <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl px-2.5 py-1.5 flex items-center justify-between sm:justify-start gap-2.5">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tracking Code</p>
                    <p className="text-xs font-mono font-bold text-slate-800">{order.tracking_number}</p>
                  </div>
                  <button
                    onClick={copyTracking}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Copy Tracking Number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Cancelled Alert if applicable */}
            {isCancelled ? (
              <div className="p-4 sm:p-5 bg-red-50/70 border-b border-red-100 flex items-center gap-2.5 text-red-800 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>This order was marked as <b>Cancelled</b>. If you believe this is an error or need assistance, please reach out to our Customer Support.</span>
              </div>
            ) : (
              /* Visual 5-Step Timeline */
              <div className="p-4 sm:p-6 border-b border-slate-100">
                <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 sm:mb-6">Delivery Progress</h3>
                
                {/* Horizontal on Desktop */}
                <div className="hidden md:grid grid-cols-5 gap-2 relative">
                  {/* Connecting background line */}
                  <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-slate-100 z-0">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500" 
                      style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    />
                  </div>

                  {steps.map((step, idx) => {
                    const isPassed = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    const StepIcon = step.icon;

                    return (
                      <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isPassed 
                            ? 'bg-blue-600 text-white shadow-xs ring-4 ring-blue-50' 
                            : 'bg-white border-2 border-slate-200 text-slate-400'
                        }`}>
                          <StepIcon className="w-3.5 h-3.5" />
                        </div>
                        <p className={`mt-2 text-xs font-bold ${isCurrent ? 'text-blue-600' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                          {step.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] leading-tight">
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Vertical Timeline on Mobile */}
                <div className="md:hidden space-y-3 relative pl-5 border-l-2 border-slate-200 ml-2">
                  {steps.map((step, idx) => {
                    const isPassed = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    const StepIcon = step.icon;

                    return (
                      <div key={idx} className="relative flex items-start gap-2.5 pb-1">
                        <div className={`absolute -left-[27px] top-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          isPassed ? 'bg-blue-600 text-white ring-2 ring-blue-100' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <StepIcon className="w-2.5 h-2.5" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isCurrent ? 'text-blue-600' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step.title}
                          </p>
                          <p className="text-[10px] text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Courier & Shipping Logistics Info */}
            <div className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 border-b border-slate-100 bg-slate-50/30">
              <div className="space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Truck className="w-3 h-3 text-blue-600" />
                  <span>Courier Partner</span>
                </span>
                <p className="text-xs font-bold text-slate-800">{order.courier_name || 'TechShop Express Logistics'}</p>
                <p className="text-[10px] text-slate-500">Standard 2-3 Business Days</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  <span>Destination</span>
                </span>
                <p className="text-xs font-medium text-slate-800 break-words">
                  {order.shipping_address || 'Customer Delivery Address on File'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-blue-600" />
                  <span>Payment</span>
                </span>
                <p className="text-xs font-bold text-slate-800">{order.payment_method}</p>
                <p className="text-xs font-bold text-blue-600">Total: {currency}{Number(order.total_amount).toFixed(2)}</p>
              </div>
            </div>

            {/* Ordered Items List */}
            {order.items && order.items.length > 0 && (
              <div className="p-3.5 sm:p-5">
                <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 sm:mb-3">Package Contents ({order.items.length} items)</h3>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                          <LazyImage 
                            src={item.product_image} 
                            alt={item.product_name} 
                            fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                            className="w-full h-full object-cover" 
                            containerClassName="w-full h-full"
                            showBadgeOnError={false}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.product_name}</p>
                          <p className="text-[10px] sm:text-[11px] text-slate-500">Qty: <b>{item.quantity}</b> × {currency}{Number(item.price).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-bold text-slate-900">{currency}{(Number(item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, UserCheck, Headphones, PhoneCall } from 'lucide-react';
import OrderConfirmation, { ConfirmedOrderData } from '../components/OrderConfirmation';
import { useSettings } from '../context/SettingsContext';

export default function IphoneOrderDemo() {
  const { settings } = useSettings();
  const contactPhone = settings?.contact_phone || '+1 (800) 123-4567';

  const iphoneMockOrder: ConfirmedOrderData = {
    id: 984210,
    trackingNumber: 'TS-IPHONE-994821',
    total_amount: 1367.00,
    paymentMethod: 'Credit Card (Visa ending in 4242)',
    payment_method: 'Credit Card (Visa ending in 4242)',
    shippingAddress: {
      fullName: 'Alexander Wright',
      address: '742 Tech Boulevard, Suite 500',
      city: 'San Francisco',
      postalCode: 'CA 94107',
      country: 'United States'
    },
    status: 'Paid',
    createdAt: new Date().toISOString(),
    transactionId: 'TXN-IPHONE-883920',
    items: [
      {
        product_id: 101,
        name: 'Apple iPhone 16 Pro Max (256GB, Natural Titanium)',
        price: 1299.00,
        quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
        category: 'Smartphones & Mobile'
      },
      {
        product_id: 102,
        name: 'Apple iPhone 16 Pro Clear Case with MagSafe',
        price: 49.00,
        quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&q=80&w=600',
        category: 'Accessories'
      },
      {
        product_id: 103,
        name: 'Apple 20W USB-C Power Adapter (Fast Charging)',
        price: 19.00,
        quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600',
        category: 'Accessories'
      }
    ]
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-50px)] py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Showcase Banner Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 mb-6 shadow-md border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin Custom Showcase Page
                </span>
                <span className="text-xs text-slate-300 font-mono hidden sm:inline">/page/iphone-order-confirmed-details</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                iPhone 16 Pro Order Confirmed & Digital Invoice Showcase
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Go to Account</span>
            </Link>

            <Link
              to="/support"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Live Support</span>
            </Link>

            <a
              href={`tel:${contactPhone.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Support</span>
            </a>
          </div>
        </div>

        {/* Dynamic Order Confirmation Component */}
        <OrderConfirmation order={iphoneMockOrder} isNewSubmission={true} />

      </div>
    </div>
  );
}

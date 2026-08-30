import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Package, ArrowRight } from 'lucide-react';
import OrderConfirmation, { ConfirmedOrderData } from '../components/OrderConfirmation';
import { apiFetch } from '../lib/utils';
import { SEO } from '../components/SEO';

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState<ConfirmedOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(`/track-order/${id}`);
        if (data && data.id) {
          setOrder(data);
        } else {
          setError('Order details could not be retrieved.');
        }
      } catch (err: any) {
        console.error('Error fetching order for OrderSuccess page:', err);
        setError('Order not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Retrieving your order invoice...</p>
      </div>
    );
  }

  if (order) {
    return (
      <div className="bg-slate-50 min-h-[calc(100vh-50px)] py-6">
        <SEO title={`Order #${order.id || id} Confirmed`} />
        <OrderConfirmation order={order} isNewSubmission={false} />
      </div>
    );
  }

  // Fallback view if order isn't found
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[60vh]">
      <SEO title="Order Confirmed" />
      <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center max-w-md w-full text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Package className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Order Confirmation</h1>
        <p className="text-slate-500 text-xs mb-6">
          Order #{id || 'N/A'} has been placed successfully.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link 
            to="/account?tab=orders" 
            className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors text-center"
          >
            My Orders
          </Link>
          <Link 
            to="/" 
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            Continue Shopping <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

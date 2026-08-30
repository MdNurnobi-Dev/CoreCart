import React from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from './LazyImage';
import { formatProductUrl } from '../utils/slug';

export default function CartSidebar() {
  const { settings, currentCurrency, formatPrice } = useSettings();
  const currency = currentCurrency?.symbol || '$';
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCartOpen) return;
      
      if (e.key === 'Escape') {
        setIsCartOpen(false);
      } else if (e.key === 'Enter' && cart.length > 0) {
        // Prevent triggering checkout if user is just pressing enter inside an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleCheckoutClick();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, cart.length]);

  if (!isCartOpen) return null;

  const total = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    if (!user) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60]"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[350px] max-w-full bg-white shadow-2xl z-[70] flex flex-col h-[100dvh] max-h-[100dvh] text-[13px]">
        {/* Cart Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold text-slate-800">Your Cart</h2>
            {cart.length > 0 && (
              <span className="bg-blue-50 text-blue-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded font-sans shadow-sm mr-1">
              Esc
            </kbd>
            <button 
              onClick={() => setIsCartOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Scrollable Items */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8 px-4">
              <div className="relative mb-2">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center absolute -top-4 -left-4 animate-pulse duration-3000 opacity-60"></div>
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center relative z-10 shadow-xs border border-white">
                  <ShoppingBag className="w-8 h-8 text-blue-400 stroke-[1.5]" />
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full absolute -bottom-2 -right-2 z-20 flex items-center justify-center shadow-xs border-2 border-white">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-slate-800 font-bold text-[15px]">Your cart is feeling light</p>
                <p className="text-[12px] text-slate-500 max-w-[220px] mx-auto leading-relaxed">
                  Looks like you haven't added any products to your cart yet. Let's find something great!
                </p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="bg-slate-900 hover:bg-blue-600 active:scale-[0.98] text-white px-5 py-2.5 rounded-lg font-bold text-[12px] transition-all shadow-sm w-full mt-4"
              >
                Discover Products
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="flex gap-2.5 bg-white border border-slate-100 p-2.5 rounded-lg shadow-sm">
                <div className="w-14 h-14 rounded-md bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                  <LazyImage 
                    src={item.image_url} 
                    alt={item.name} 
                    fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                    className="w-full h-full object-cover" 
                    containerClassName="w-full h-full"
                    showBadgeOnError={false}
                  />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link onClick={() => setIsCartOpen(false)} to={formatProductUrl({ id: item.product_id, slug: (item as any).slug })} className="font-bold text-slate-800 text-[12px] line-clamp-1 hover:text-blue-600 mb-0.5">
                      {item.name}
                    </Link>
                    <p className="text-[12px] font-bold text-blue-600">{currency}{formatPrice(item.price)}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center border border-slate-200 rounded bg-slate-50">
                      <button 
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-[11px] font-bold text-slate-800">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Fixed Footer */}
        {cart.length > 0 && (
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0">
            <div className="space-y-1.5 mb-2.5">
              <div className="flex justify-between text-[12px] text-slate-500">
                <span>Subtotal</span>
                <span>{currency}{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-slate-500">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="pt-1.5 mt-1.5 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-800 text-[13px]">Total</span>
                <span className="font-bold text-blue-600 text-[14px]">{currency}{formatPrice(total)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckoutClick}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white h-[36px] rounded-md font-bold text-[13px] transition-all shadow-sm flex items-center justify-center gap-2 group"
            >
              <span>Proceed to Checkout</span>
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-medium text-blue-200 bg-blue-700/50 rounded font-sans shadow-sm group-hover:bg-blue-600/50 transition-colors">
                Enter
              </kbd>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Laptop, Menu, X, Headphones, PhoneCall, Heart, Search, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useSettings } from '../context/SettingsContext';
import PredictiveSearchBar from './PredictiveSearchBar';
import { apiFetch } from '../lib/utils';

export default function Navbar() {
  const { user } = useAuth();
  const { cart, setIsCartOpen, isCartOpen } = useCart();
  const { favoritesCount } = useFavorites();
  const { settings, currentCurrency, availableCurrencies, setCurrency } = useSettings();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [activeOffer, setActiveOffer] = useState<any>(null);

  useEffect(() => {
    apiFetch('/coupons/active-offers')
      .then((offers) => {
        if (Array.isArray(offers) && offers.length > 0) {
          setActiveOffer(offers[0]);
        }
      })
      .catch(() => {});
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle cart on Cmd/Ctrl + B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsCartOpen(!isCartOpen);
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  return (
    <header className="sticky top-0 z-50 flex flex-col shadow-2xs">
      {/* TOP PROMOTIONAL ANNOUNCEMENT & SUPPORT BAR */}
      <div 
        className="text-white px-3 sm:px-6 py-1 flex items-center justify-between text-[11px] font-medium tracking-normal border-b border-black/10 select-none transition-colors duration-300"
        style={{ backgroundColor: activeOffer?.banner_bg_color || '#2563EB' }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden text-[11px] min-w-0 pr-2">
          <span className="bg-white/20 backdrop-blur-xs text-white px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider shrink-0 hidden xs:inline-block border border-white/20">
            {activeOffer ? 'Promo Offer' : 'Special Offer'}
          </span>
          <span className="truncate text-white/95 text-[11px]">
            {activeOffer ? (
              <span>
                <strong>{activeOffer.title}</strong> — Use code <span className="font-mono font-bold underline bg-white/20 px-1 py-0.2 rounded">{activeOffer.code}</span> for {activeOffer.discount_type === 'percentage' ? `${activeOffer.discount_value}% OFF` : `$${activeOffer.discount_value} OFF`}!
              </span>
            ) : (
              settings?.announcement_text || 'Summer Sale! Get up to 50% off on all premium electronics and accessories.'
            )}
          </span>
          <a 
            href={settings?.announcement_link || '/#all-products'} 
            className="font-bold underline decoration-white/50 text-white hover:text-white/80 transition-colors shrink-0 whitespace-nowrap text-[11px]"
          >
            Shop Now
          </a>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pl-1">
          {/* Currency Switcher */}
          <select
            value={currentCurrency?.code || 'USD'}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-black/10 hover:bg-black/20 text-white text-[10px] font-bold py-0.5 pl-1.5 pr-1 rounded outline-none transition-colors cursor-pointer appearance-none text-center shadow-2xs border-0"
            title="Change Currency"
          >
            {availableCurrencies?.map(curr => (
              <option key={curr.code} value={curr.code} className="text-slate-900 font-sans">
                {curr.code} ({curr.symbol})
              </option>
            ))}
          </select>

          <a 
            href={`tel:${(settings?.contact_phone || '+1-800-123-4567').replace(/[^0-9+]/g, '')}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-2 py-0.5 rounded transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
            title={`Call Hotline: ${settings?.contact_phone || '+1-800-123-4567'}`}
          >
            <PhoneCall className="w-3 h-3 text-emerald-100 animate-pulse" />
            <span className="hidden sm:inline">Call Quick Help</span>
            <span className="sm:hidden">Call</span>
          </a>

          <Link 
            to="/support" 
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/95 hover:text-white bg-blue-700/70 hover:bg-blue-700 px-2 py-0.5 rounded transition-colors whitespace-nowrap shadow-2xs"
            title="Customer Support & Help Center"
          >
            <Headphones className="w-3 h-3 text-blue-200" />
            <span>Support</span>
          </Link>
        </div>
      </div>

      {/* MAIN NAVBAR */}
      <nav className="flex items-center justify-between px-3 sm:px-6 h-[50px] bg-white border-b border-gray-200 text-[13px] relative z-40">
        {/* LEFT: MOBILE MENU TOGGLE & LOGO */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button 
            className="sm:hidden text-gray-600 hover:text-blue-600 cursor-pointer p-1 rounded-md active:bg-slate-100"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              if (isMobileSearchOpen) setIsMobileSearchOpen(false);
            }}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link to="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img loading="lazy" decoding="async" 
                src={settings.logo_url} 
                alt={settings.site_name || 'Store Logo'} 
                className={settings.show_site_name_in_header === false ? "max-h-7 max-w-[130px] sm:max-w-[180px] object-contain" : "w-6 h-6 object-contain"} 
              />
            ) : (
              <div className="bg-blue-600 p-1 rounded">
                <Laptop className="w-4 h-4 text-white" />
              </div>
            )}
            {(settings?.show_site_name_in_header !== false || !settings?.logo_url) && (
              <span className="text-[14px] font-bold tracking-tight text-gray-900">
                {settings?.site_name || <React.Fragment>TECH<span className="text-blue-600">SHOP</span></React.Fragment>}
              </span>
            )}
          </Link>
        </div>

        {/* CENTER: PREDICTIVE SEARCH BAR (Desktop) */}
        <div className="hidden sm:flex flex-1 max-w-xl mx-4 lg:mx-8">
          <PredictiveSearchBar isMobile={false} />
        </div>

        {/* RIGHT: MOBILE SEARCH ICON, ACCOUNT & CART */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(!isMobileSearchOpen);
              if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
            className={`sm:hidden p-1.5 rounded-md transition-colors cursor-pointer ${
              isMobileSearchOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-blue-600'
            }`}
            title="Search products"
            aria-label="Toggle mobile search"
          >
            <Search className="w-5 h-5" />
          </button>

          {user?.role === 'admin' && (
            <Link to="/admin" className="hidden sm:inline bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium hover:bg-blue-100 transition-colors">
              Admin
            </Link>
          )}

          <Link to="/track-order" className="hidden md:inline text-gray-600 hover:text-blue-600 text-[12px] font-medium transition-colors">
            Track Order
          </Link>

          {/* Favorites Link with Live Counter Badge */}
          <Link 
            to="/favorites" 
            className="relative text-gray-600 hover:text-rose-600 transition-colors p-1" 
            title={`Favorites (${favoritesCount})`}
          >
            <Heart className={`w-5 h-5 ${favoritesCount > 0 ? 'text-rose-500 fill-rose-50' : ''}`} />
            {favoritesCount > 0 && (
              <span className="absolute 0 top-0 right-0 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-2xs animate-in zoom-in-75">
                {favoritesCount}
              </span>
            )}
          </Link>
          
          <Link to={user ? "/account" : "/login"} className="text-gray-600 hover:text-blue-600 transition-colors p-1" title={user ? "My Account" : "Login"}>
            <User className="w-5 h-5" />
          </Link>
          
          <button onClick={() => setIsCartOpen(true)} className="relative text-gray-600 hover:text-blue-600 transition-colors cursor-pointer p-1" title="Cart">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute 0 top-0 right-0 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-2xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* MOBILE QUICK SEARCH BAR EXPANSION (Under navbar) */}
      {isMobileSearchOpen && (
        <div className="sm:hidden bg-slate-50 p-2.5 border-b border-slate-200 animate-in slide-in-from-top-2 duration-150 relative z-30 shadow-md">
          <PredictiveSearchBar 
            isMobile={true} 
            onCloseMobileMenu={() => setIsMobileSearchOpen(false)} 
          />
        </div>
      )}

      {/* MOBILE HAMBURGER MENU */}
      {isMobileMenuOpen && (
        <div className="absolute top-[86px] left-0 right-0 bg-white border-b border-gray-200 shadow-xl p-4 sm:hidden flex flex-col gap-3 z-50 animate-in fade-in duration-150">
          <PredictiveSearchBar 
            isMobile={true} 
            onCloseMobileMenu={() => setIsMobileMenuOpen(false)} 
          />
          
          <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
            <Link 
              to="/favorites" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="flex items-center justify-between text-gray-700 hover:text-rose-600 py-2 px-1 text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>My Favorites</span>
              </div>
              {favoritesCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <Link to="/track-order" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 py-2 px-1 text-xs font-medium">
              <Laptop className="w-4 h-4 text-slate-500" />
              <span>Track Order Status</span>
            </Link>

            <Link to="/support" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 py-2 px-1 text-xs font-medium">
              <Headphones className="w-4 h-4 text-blue-600" />
              <span>Support Center & FAQs</span>
            </Link>

            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-blue-700 hover:text-blue-800 py-2 px-1 text-xs font-medium">
                <span>Admin Panel Dashboard</span>
              </Link>
            )}

            <Link to={user ? "/account" : "/login"} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 py-2 px-1 text-xs font-medium border-t border-slate-100 mt-1 pt-2">
              <User className="w-4 h-4 text-slate-500" />
              <span>{user ? 'My Account Profile' : 'Login / Register'}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

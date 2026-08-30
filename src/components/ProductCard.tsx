import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Zap, ShoppingCart, Heart, Scale } from 'lucide-react';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from './LazyImage';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCompare } from '../context/CompareContext';
import { formatProductUrl } from '../utils/slug';

export interface ProductCardProps {
  product: any;
  onQuickView?: (product: any) => void;
  onQuickOrder?: (product: any) => void;
  key?: React.Key;
  className?: string;
  style?: React.CSSProperties;
}

export default function ProductCard({ product, onQuickView, onQuickOrder, className = '', style }: ProductCardProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const { currentCurrency, formatPrice } = useSettings();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isComparing } = useCompare();
  const navigate = useNavigate();

  const currency = currentCurrency?.symbol || '$';
  const favorited = isFavorite(product?.id);
  const comparing = isComparing(product?.id);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (comparing) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url
    });
    setIsCartOpen(true);
  };

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  const handleQuickOrderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickOrder) {
      onQuickOrder(product);
    } else {
      addToCart({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: product.image_url
      });
      navigate('/checkout');
    }
  };

  return (
    <div 
      style={style}
      className={`bg-white rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-xs hover:border-blue-300/80 active:scale-[0.99] relative ${className}`}
    >
      {/* Product Image & Badges */}
      <div className="aspect-[4/3] w-full bg-slate-50 flex items-center justify-center overflow-hidden relative">
        <Link 
          to={formatProductUrl(product)} 
          className="w-full h-full block focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          aria-label={`View details for ${product.name}`}
        >
          <LazyImage 
            src={product.image_url} 
            alt={product.name} 
            fallbackSrc={DEFAULT_PRODUCT_IMAGE}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" 
            containerClassName="w-full h-full"
          />
        </Link>

        {/* Favorite Button (Ultra Compact) */}
        <div className="absolute top-1 left-1 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={handleFavoriteClick}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 shadow-2xs border cursor-pointer active:scale-90 ${
              favorited
                ? 'bg-white text-rose-500 border-rose-200'
                : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white border-slate-200/80'
            }`}
            title={favorited ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-3 h-3 transition-transform ${favorited ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
          </button>
          
          <button
            type="button"
            onClick={handleCompareClick}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 shadow-2xs border cursor-pointer active:scale-90 ${
              comparing
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white/90 text-slate-400 hover:text-blue-600 hover:bg-white border-slate-200/80'
            }`}
            title={comparing ? 'Remove from comparison' : 'Add to compare'}
            aria-label={comparing ? 'Remove from comparison' : 'Add to compare'}
          >
            <Scale className={`w-3 h-3 transition-transform ${comparing ? 'scale-110' : ''}`} />
          </button>
        </div>
        
        {/* Mobile Quick Action Buttons (Top-Right) */}
        <div className="sm:hidden absolute top-1 right-1 flex items-center gap-1 z-10">
          {onQuickView && (
            <button
              type="button"
              onClick={handleQuickViewClick}
              className="w-6 h-6 rounded-full bg-white/95 text-slate-600 active:bg-blue-50 active:text-blue-600 shadow-2xs border border-slate-200/70 flex items-center justify-center transition-transform active:scale-90"
              title="Quick View"
              aria-label="Quick View"
            >
              <Eye className="w-2.5 h-2.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleQuickOrderClick}
            className="w-6 h-6 rounded-full bg-blue-600 text-white active:bg-blue-700 shadow-2xs flex items-center justify-center transition-transform active:scale-90"
            title="Instant Order"
            aria-label="Instant Order"
          >
            <Zap className="w-2.5 h-2.5 fill-current" />
          </button>
        </div>

        {/* Desktop Quick Actions Overlay */}
        <div className="hidden sm:flex absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity duration-150 items-center justify-center gap-1.5 backdrop-blur-[0.5px] pointer-events-none group-hover:pointer-events-auto">
          {onQuickView && (
            <button
              type="button"
              onClick={handleQuickViewClick}
              className="w-7 h-7 rounded-full bg-white text-slate-700 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs cursor-pointer"
              title="Quick View"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleQuickOrderClick}
            className="w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs cursor-pointer"
            title="Instant Order"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>

      {/* Product Info (Compact Small Size Layout) */}
      <div className="flex flex-col flex-1 p-2 sm:p-2.5">
        {/* Category Tag */}
        <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wider line-clamp-1">
          {product.category || 'General'}
        </span>

        {/* Product Title */}
        <h3 className="text-xs sm:text-[13px] font-medium text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors my-0.5">
          <Link to={formatProductUrl(product)} className="hover:underline focus:outline-none">
            {product.name}
          </Link>
        </h3>
        
        {/* Price & Cart Button Row */}
        <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-100/90 gap-1">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs sm:text-[13px] font-bold text-blue-600 truncate">
              {currency}{formatPrice(product.price)}
            </span>
          </div>

          <button 
            type="button"
            onClick={handleAddToCart}
            className="bg-slate-900 hover:bg-blue-600 text-white p-1 sm:p-1.5 rounded-md transition-colors duration-150 shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
            title="Add to Cart"
            aria-label="Add to Cart"
          >
            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

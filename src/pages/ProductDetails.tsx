import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Loader2, Facebook, Twitter, Linkedin, Zap, Eye, Sparkles, Star, ChevronRight, ShieldCheck, Truck, RefreshCw, X, Heart, MessageSquare, Scale } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCompare } from '../context/CompareContext';
import { apiFetch } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from '../components/LazyImage';
import ProductCard from '../components/ProductCard';
import ProductReviews from '../components/ProductReviews';
import QuickOrderModal from '../components/QuickOrderModal';
import Breadcrumbs from '../components/Breadcrumbs';
import { ProductSEO } from '../hooks/useProductSEO';
import { formatProductUrl } from '../utils/slug';

export default function ProductDetails() {
  const { settings, currentCurrency, formatPrice } = useSettings();
  const currency = currentCurrency?.symbol || '$';
  const { id, slug } = useParams();
  const identifier = slug || id;
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [quickOrderProduct, setQuickOrderProduct] = useState<any | null>(null);
  const { addToCart, setIsCartOpen } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isComparing } = useCompare();
  
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [isZoomed, setIsZoomed] = useState(false);
  const imageContainerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(2.5)'
    });
  };

  const handleMouseEnter = () => {
    setIsZoomed(true);
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
    setZoomStyle({
      transformOrigin: 'center center',
      transform: 'scale(1)'
    });
  };

  useEffect(() => {
    const fetchProductAndCatalog = async () => {
      if (!identifier) return;
      setLoading(true);
      try {
        const [productData, catalogData] = await Promise.all([
          apiFetch(`/products/${identifier}`),
          apiFetch('/products')
        ]);
        setProduct(productData);
        if (Array.isArray(catalogData)) {
          setAllProducts(catalogData);
        }
        // If accessed by numeric ID and product has a slug, update URL cleanly to SEO slug
        if (productData?.slug && (!slug || slug !== productData.slug)) {
          navigate(`/product/${productData.slug}`, { replace: true });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndCatalog();
  }, [identifier, slug, navigate]);

  const handleQuickOrder = (prod: any) => {
    setQuickOrderProduct(prod);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </button>
      </div>
    );
  }

  const specs = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs;
  const currentUrl = window.location.href;

  // Filter related products (same category first, excluding current item)
  const currentId = Number(product.id);
  const sameCategoryProducts = allProducts.filter(
    (p) => Number(p.id) !== currentId && p.category?.toLowerCase() === product.category?.toLowerCase()
  );
  const otherProducts = allProducts.filter(
    (p) => Number(p.id) !== currentId && p.category?.toLowerCase() !== product.category?.toLowerCase()
  );

  const relatedProducts = [...sameCategoryProducts, ...otherProducts].slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5 py-3 sm:py-5 space-y-4 sm:space-y-5">
      <ProductSEO
        product={product}
        currentUrl={currentUrl}
        options={{
          siteName: settings?.site_name || 'TechStore',
          currencySymbol: currency,
          currencyCode: 'USD',
          siteUrl: typeof window !== 'undefined' ? window.location.origin : ''
        }}
      />

      {/* Breadcrumbs Navigation */}
      <Breadcrumbs 
        items={[
          ...(product.category ? [{ label: product.category, path: `/?category=${encodeURIComponent(product.category)}` }] : []),
          { label: product.name }
        ]} 
      />

      {/* Main Product Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs p-3 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Image Showcase */}
          <div 
            ref={imageContainerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="md:col-span-5 w-full h-52 sm:h-64 md:h-72 bg-slate-50/90 rounded-lg overflow-hidden flex items-center justify-center p-3 border border-slate-100 relative group cursor-crosshair"
          >
            <LazyImage 
              priority={true}
              src={product.image_url} 
              alt={product.name} 
              fallbackSrc={DEFAULT_PRODUCT_IMAGE}
              className={`w-full h-full object-contain mix-blend-multiply transition-transform ${isZoomed ? 'duration-75 ease-out' : 'duration-300 ease-in-out'}`}
              style={isZoomed ? zoomStyle : { transform: 'scale(1)', transformOrigin: 'center center' }}
              containerClassName="w-full h-full flex items-center justify-center bg-transparent"
            />
            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                {product.category}
              </span>
            </div>

            {/* Favorite Button on Image */}
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(product);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-2xs border cursor-pointer active:scale-90 ${
                  isFavorite(product?.id)
                    ? 'bg-white text-rose-500 border-rose-200 ring-2 ring-rose-100'
                    : 'bg-white/95 text-slate-400 hover:text-rose-500 hover:bg-white border-slate-200/80'
                }`}
                title={isFavorite(product?.id) ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite(product?.id) ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-3.5 h-3.5 transition-transform ${isFavorite(product?.id) ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isComparing(product?.id)) {
                    removeFromCompare(product.id);
                  } else {
                    addToCompare(product);
                  }
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-2xs border cursor-pointer active:scale-90 ${
                  isComparing(product?.id)
                    ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-100'
                    : 'bg-white/95 text-slate-400 hover:text-blue-600 hover:bg-white border-slate-200/80'
                }`}
                title={isComparing(product?.id) ? 'Remove from comparison' : 'Add to compare'}
                aria-label={isComparing(product?.id) ? 'Remove from comparison' : 'Add to compare'}
              >
                <Scale className={`w-3.5 h-3.5 transition-transform ${isComparing(product?.id) ? 'scale-110' : ''}`} />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-7 flex flex-col h-full space-y-2.5 sm:space-y-3">
            <div>
              {/* Rating & Reviews pill */}
              <div className="flex items-center gap-2 mb-1">
                <a 
                  href="#customer-reviews" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('customer-reviews')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 group hover:opacity-80 transition-opacity cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded text-[11px]"
                >
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 group-hover:text-blue-600">
                    Customer Reviews
                  </span>
                </a>
              </div>
              
              {/* Product Title */}
              <h1 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight text-slate-900 leading-snug">
                {product.name}
              </h1>
            </div>
            
            {/* Price & Stock Badge */}
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
                {currency}{formatPrice(product.price)}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                In Stock & Ready
              </span>
            </div>

            {/* Description */}
            <div className="text-xs text-slate-600 leading-relaxed border-t border-b border-slate-100 py-2 sm:py-2.5">
              <p className="line-clamp-3 sm:line-clamp-none">{product.description}</p>
            </div>

            {/* Technical Specifications */}
            {specs && (
              <div className="border border-slate-100 bg-slate-50/50 rounded-lg p-2.5">
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Key Specifications
                </h3>
                <dl className="grid grid-cols-2 gap-1.5">
                  {Object.entries(specs).slice(0, 6).map(([key, value], idx) => (
                    <div key={`spec-${key}-${idx}`} className="bg-white p-1.5 rounded border border-slate-100 shadow-2xs">
                      <dt className="text-[10px] font-medium text-slate-400 capitalize truncate">{key}</dt>
                      <dd className="text-[11px] font-semibold text-slate-800 mt-0.5 truncate">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Quick Guarantees */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center">
                <Truck className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
                <span className="text-[10px] font-medium text-slate-700">Free Delivery</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                <span className="text-[10px] font-medium text-slate-700">2 Yr Warranty</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center">
                <RefreshCw className="w-3.5 h-3.5 text-purple-600 mb-0.5" />
                <span className="text-[10px] font-medium text-slate-700">30-Day Return</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-1 space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <button 
                  onClick={() => {
                    addToCart({
                      product_id: product.id,
                      name: product.name,
                      price: product.price,
                      quantity: 1,
                      image_url: product.image_url
                    });
                    setIsCartOpen(true);
                  }}
                  className="col-span-5 sm:col-span-5 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2 px-2.5 rounded-lg text-xs font-medium transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Add to Cart</span>
                </button>

                <button 
                  onClick={() => handleQuickOrder(product)}
                  className="col-span-5 sm:col-span-5 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2 px-2.5 rounded-lg text-xs font-medium transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Quick Order</span>
                </button>

                <button 
                  type="button"
                  onClick={() => toggleFavorite(product)}
                  className={`col-span-2 sm:col-span-2 p-2 rounded-lg border font-medium text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isFavorite(product?.id)
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-slate-50 hover:bg-rose-50 border-slate-200 text-slate-700 hover:text-rose-600'
                  }`}
                  title={isFavorite(product?.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorite(product?.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>

              {/* Social Share Compact */}
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Share Product
                </span>
                <div className="flex items-center gap-1">
                  <a 
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors p-1 rounded-md"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(product.name)}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-slate-400 hover:text-blue-400 hover:bg-blue-50 transition-colors p-1 rounded-md"
                    title="Share on Twitter"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors p-1 rounded-md"
                    title="Share on LinkedIn"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Customer Ratings & Reviews Component */}
      <ProductReviews productId={product.id} productName={product.name} />

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900">
                  Related Products
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                More recommendations in <span className="font-medium text-blue-600">{product.category}</span>
              </p>
            </div>
            
            <Link 
              to={`/?category=${encodeURIComponent(product.category)}#all-products`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group transition-colors cursor-pointer"
            >
              <span>View Category</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {relatedProducts.map((relProd) => (
              <ProductCard
                key={relProd.id}
                product={relProd}
                onQuickView={(p) => setQuickViewProduct(p)}
                onQuickOrder={(p) => handleQuickOrder(p)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            <button 
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-sm transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-full md:w-1/2 bg-slate-50 relative flex items-stretch">
              <LazyImage 
                src={quickViewProduct.image_url} 
                alt={quickViewProduct.name} 
                fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                className="w-full h-[250px] md:h-full md:absolute md:inset-0 object-contain mix-blend-multiply" 
                containerClassName="w-full h-full bg-transparent"
              />
            </div>
            
            <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 mb-2 w-fit">
                {quickViewProduct.category}
              </span>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-1">
                {quickViewProduct.name}
              </h2>
              <div className="text-xl font-black text-blue-600 mb-4">
                {currency}{formatPrice(quickViewProduct.price)}
              </div>
              
              <div className="text-xs text-slate-600 mb-6 leading-relaxed line-clamp-4">
                {quickViewProduct.description}
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => {
                    addToCart({
                      product_id: quickViewProduct.id,
                      name: quickViewProduct.name,
                      price: quickViewProduct.price,
                      quantity: 1,
                      image_url: quickViewProduct.image_url
                    });
                    setQuickViewProduct(null);
                    setIsCartOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  onClick={() => {
                    setQuickViewProduct(null);
                    handleQuickOrder(quickViewProduct);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  Quick Order
                </button>
              </div>
              <Link 
                to={formatProductUrl(quickViewProduct)}
                onClick={() => setQuickViewProduct(null)}
                className="mt-3 text-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors py-1"
              >
                View Full Specifications →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={Boolean(quickOrderProduct)}
        onClose={() => setQuickOrderProduct(null)}
        product={quickOrderProduct}
      />
    </div>
  );
}


import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  ArrowLeft, 
  Zap, 
  Search, 
  SlidersHorizontal, 
  ShoppingBag, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useProducts } from '../context/ProductContext';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from '../components/LazyImage';
import ProductCard from '../components/ProductCard';
import QuickOrderModal from '../components/QuickOrderModal';
import { SEO } from '../components/SEO';
import { formatProductUrl } from '../utils/slug';

export default function Favorites() {
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites();
  const { addToCart, setIsCartOpen } = useCart();
  const { settings } = useSettings();
  const { products } = useProducts();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'price-asc' | 'price-desc' | 'name'>('latest');
  const [allAddedMessage, setAllAddedMessage] = useState(false);
  const [quickOrderProduct, setQuickOrderProduct] = useState<any | null>(null);

  const currency = settings?.currency_symbol || '$';

  // Extract unique categories from current favorites
  const categories = useMemo(() => {
    const set = new Set<string>();
    favorites.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [favorites]);

  // Filter and sort favorites
  const filteredFavorites = useMemo(() => {
    return favorites
      .filter(item => {
        const matchesSearch = searchQuery.trim() === '' || 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // 'latest' maintains original array order
      });
  }, [favorites, searchQuery, selectedCategory, sortBy]);

  const handleAddToCart = (item: any) => {
    addToCart({
      product_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url
    });
    setIsCartOpen(true);
  };

  const handleQuickOrder = (item: any) => {
    setQuickOrderProduct(item);
  };

  const handleAddAllToCart = () => {
    if (favorites.length === 0) return;
    favorites.forEach(item => {
      addToCart({
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image_url: item.image_url
      });
    });
    setAllAddedMessage(true);
    setTimeout(() => setAllAddedMessage(false), 3000);
    setIsCartOpen(true);
  };

  // Recommended products (excluding already favorited)
  const recommendedProducts = useMemo(() => {
    const favIds = new Set(favorites.map(f => Number(f.id)));
    return products.filter(p => !favIds.has(Number(p.id))).slice(0, 4);
  }, [products, favorites]);

  return (
    <div className="min-h-[calc(100vh-50px)] bg-slate-50 py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
      <SEO 
        title={`My Favorites (${favorites.length})`} 
        description="View and manage your saved favorite tech products and gadgets."
      />

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalog</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Home</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">Favorites</span>
          </div>
        </div>

        {/* Top Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 shrink-0">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-rose-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">My Favorites</h1>
                  <span className="bg-rose-100 text-rose-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {favorites.length} {favorites.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Products you saved for future review and quick checkout.
                </p>
              </div>
            </div>

            {/* Quick Actions (when items exist) */}
            {favorites.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={handleAddAllToCart}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg sm:rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add All to Cart</span>
                </button>
                <button
                  type="button"
                  onClick={clearFavorites}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold rounded-lg sm:rounded-xl text-xs transition-colors cursor-pointer"
                  title="Clear all favorites"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear List</span>
                </button>
              </div>
            )}
          </div>

          {/* Success Banner when All Added */}
          {allAddedMessage && (
            <div className="mt-3.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg sm:rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All favorite items have been added to your shopping cart!</span>
            </div>
          )}

          {/* Search, Filter & Sort Controls (shown when favorites >= 2) */}
          {favorites.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter saved items..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {/* Category Filter */}
              {categories.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    <option value="">All Categories ({favorites.length})</option>
                    {categories.map(cat => (
                      <option key={`fav-cat-${cat}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium cursor-pointer"
                >
                  <option value="latest">Sort: Recently Added</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Product Name (A-Z)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* FAVORITES LIST CONTENT */}
        {favorites.length === 0 ? (
          /* CUSTOM ILLUSTRATION EMPTY STATE */
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-10 sm:p-16 text-center shadow-2xs flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative mb-6">
              {/* Soft decorative background shapes */}
              <div className="w-32 h-32 bg-rose-50/80 rounded-full flex items-center justify-center absolute -top-6 -left-6 animate-pulse duration-3000"></div>
              <div className="w-24 h-24 bg-rose-100/50 rounded-full flex items-center justify-center absolute -bottom-4 -right-4"></div>
              
              {/* Main icon container */}
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center relative z-10 shadow-sm border border-slate-100">
                <Heart className="w-12 h-12 text-rose-400 stroke-[1.5]" />
              </div>
              
              {/* Floating accent elements */}
              <div className="w-10 h-10 bg-white rounded-full absolute top-0 -right-2 z-20 flex items-center justify-center shadow-xs border border-slate-100">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="w-6 h-6 bg-rose-200 rounded-full absolute bottom-4 -left-2 z-20 border-2 border-white"></div>
            </div>
            
            <h2 className="text-[18px] sm:text-[22px] font-extrabold text-slate-900 mb-2 tracking-tight">Your Wishlist is Empty</h2>
            <p className="text-[13px] text-slate-500 max-w-[340px] mx-auto leading-relaxed mb-8">
              Looks like you haven't saved anything yet. Curate your personal collection by tapping the heart icon on your favorite items.
            </p>
            
            <Link
              to="/#all-products"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 active:scale-[0.98] text-white font-bold px-8 py-3.5 rounded-xl text-[13px] transition-all shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Start Exploring</span>
            </Link>
          </div>
        ) : filteredFavorites.length === 0 ? (
          /* NO FILTER MATCH */
          <div className="bg-white border border-slate-200/90 rounded-xl p-8 text-center shadow-2xs">
            <p className="text-sm font-bold text-slate-800">No saved products match &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Try checking your spelling or clearing filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
              }}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* FAVORITE PRODUCTS GRID */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredFavorites.map(item => (
              <div
                key={`fav-card-${item.id}`}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col group hover:shadow-md hover:border-blue-200 transition-all relative"
              >
                {/* Remove from Favorite button */}
                <button
                  type="button"
                  onClick={() => removeFromFavorites(item.id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 text-rose-500 hover:bg-rose-50 active:scale-90 transition-all flex items-center justify-center shadow-2xs border border-slate-200/80 cursor-pointer"
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </button>

                {/* Product Thumbnail */}
                <Link
                  to={formatProductUrl(item)}
                  className="aspect-[4/3] w-full bg-slate-50/80 flex items-center justify-center overflow-hidden relative block"
                >
                  <LazyImage
                    src={item.image_url}
                    alt={item.name}
                    fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    containerClassName="w-full h-full"
                  />
                  {item.category && (
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/90 text-slate-600 backdrop-blur-xs shadow-2xs">
                      {item.category}
                    </span>
                  )}
                </Link>

                {/* Details */}
                <div className="p-2.5 sm:p-3.5 flex flex-col flex-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors mb-1">
                    <Link to={formatProductUrl(item)}>{item.name}</Link>
                  </h3>

                  <div className="text-xs sm:text-sm font-black text-blue-600 mb-2.5">
                    {currency}{Number(item.price).toFixed(2)}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 bg-slate-900 hover:bg-blue-600 text-white py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Add to Cart"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Cart</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickOrder(item)}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg text-xs transition-colors flex items-center justify-center cursor-pointer"
                      title="Instant Buy"
                      aria-label="Instant Buy"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECOMMENDED DISCOVERY SECTION (when user has favorites) */}
        {recommendedProducts.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xs mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Recommended For You</h3>
              </div>
              <Link
                to="/#all-products"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              {recommendedProducts.map(product => (
                <ProductCard key={`fav-rec-${product.id}`} product={product} onQuickOrder={(p) => setQuickOrderProduct(p)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={Boolean(quickOrderProduct)}
        onClose={() => setQuickOrderProduct(null)}
        product={quickOrderProduct}
      />
    </div>
  );
}

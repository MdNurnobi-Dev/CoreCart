import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingCart, Star, ChevronRight, ChevronLeft, TrendingUp, Loader2, Eye, Zap, X, Filter, Sparkles, Check, DollarSign, RotateCcw, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useProducts } from '../context/ProductContext';
import { useFavorites } from '../context/FavoritesContext';
import { useHomeCustomization } from '../hooks/useHomeCustomization';
import HeroSlider from '../components/HeroSlider';
import PriceRangeFilter from '../components/PriceRangeFilter';
import ProductCard from '../components/ProductCard';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from '../components/LazyImage';
import QuickOrderModal from '../components/QuickOrderModal';
import PromoBanners from '../components/PromoBanners';
import Breadcrumbs from '../components/Breadcrumbs';
import { apiFetch } from '../lib/utils';
import { SEO } from '../components/SEO';
import { getCategoryMeta } from '../utils/seo';
import { formatProductUrl } from '../utils/slug';

export default function Home() {
  const { banners, homeSections, uiSettings, loading: homeLoading } = useHomeCustomization();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const minPriceParam = searchParams.get('min_price');
  const maxPriceParam = searchParams.get('max_price');
  const sortParam = searchParams.get('sort') || 'featured';

  const { settings, currentCurrency, formatPrice } = useSettings();
  const { products, loading } = useProducts();
  const { isFavorite, toggleFavorite } = useFavorites();
  const currency = currentCurrency?.symbol || '$';
  const [visibleCount, setVisibleCount] = useState(12);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>(categoryParam);
  const [sortBy, setSortBy] = useState<string>(sortParam);
  const { addToCart, setIsCartOpen } = useCart();

  const getGridClass = () => {
    let mobile = uiSettings?.home_grid_mobile || 2;
    let desktop = uiSettings?.home_grid_desktop || 6;
    
    let cls = 'grid gap-2 sm:gap-2.5 lg:gap-3 transition-all duration-300 ';
    cls += mobile === 1 ? 'grid-cols-1 ' : 'grid-cols-2 ';
    cls += 'sm:grid-cols-3 ';
    
    if (desktop === 3) cls += 'md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3';
    else if (desktop === 4) cls += 'md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4';
    else if (desktop === 5) cls += 'md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5';
    else cls += 'md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6';
    
    return cls;
  };

  
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [quickOrderProduct, setQuickOrderProduct] = useState<any | null>(null);

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const distinctCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    products.forEach(p => {
      const name = (p.category || '').trim();
      if (name) {
        const lower = name.toLowerCase();
        if (!catMap.has(lower)) {
          catMap.set(lower, name);
        }
      }
    });
    return Array.from(catMap.values());
  }, [products]);

  const checkCategoryScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkCategoryScroll, 350);
    }
  };

  useEffect(() => {
    checkCategoryScroll();
    const el = categoryScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkCategoryScroll, { passive: true });
      window.addEventListener('resize', checkCategoryScroll);
      // Run again after a brief timeout to account for dynamic DOM width
      const timer = setTimeout(checkCategoryScroll, 300);
      return () => {
        el.removeEventListener('scroll', checkCategoryScroll);
        window.removeEventListener('resize', checkCategoryScroll);
        clearTimeout(timer);
      };
    }
  }, [distinctCategories, products]);

  // Derive min and max bounds from loaded products

  const { minBound, maxBound } = useMemo(() => {
    if (!products.length) return { minBound: 0, maxBound: 1000 };
    const prices = products.map(p => Number(p.price) || 0);
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    return { 
      minBound: Math.max(0, min), 
      maxBound: Math.max(min + 100, Math.ceil(max / 50) * 50) 
    };
  }, [products]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);

  // Synchronize price range state with URL search params or calculated product bounds
  useEffect(() => {
    if (products.length > 0) {
      const initialMin = minPriceParam !== null ? Math.max(minBound, Number(minPriceParam)) : minBound;
      const initialMax = maxPriceParam !== null ? Math.min(maxBound, Number(maxPriceParam)) : maxBound;
      setPriceRange([initialMin, initialMax]);
    }
  }, [products, minBound, maxBound, minPriceParam, maxPriceParam]);

  useEffect(() => {
    if (categoryParam !== activeCategoryFilter) {
      setActiveCategoryFilter(categoryParam);
    }
  }, [categoryParam]);

  useEffect(() => {
    if (sortParam !== sortBy) {
      setSortBy(sortParam);
    }
  }, [sortParam]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const handleCategorySelect = (catName: string) => {
    setActiveCategoryFilter(catName);
    const newParams = new URLSearchParams(searchParams);
    if (catName) {
      newParams.set('category', catName);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  const handlePriceChange = (newMin: number, newMax: number) => {
    setPriceRange([newMin, newMax]);
    const newParams = new URLSearchParams(searchParams);
    if (newMin > minBound) {
      newParams.set('min_price', newMin.toString());
    } else {
      newParams.delete('min_price');
    }
    if (newMax < maxBound) {
      newParams.set('max_price', newMax.toString());
    } else {
      newParams.delete('max_price');
    }
    setSearchParams(newParams);
  };

  const handlePriceReset = () => {
    setPriceRange([minBound, maxBound]);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('min_price');
    newParams.delete('max_price');
    setSearchParams(newParams);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    const newParams = new URLSearchParams(searchParams);
    if (newSort && newSort !== 'featured') {
      newParams.set('sort', newSort);
    } else {
      newParams.delete('sort');
    }
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    setActiveCategoryFilter('');
    setPriceRange([minBound, maxBound]);
    setSortBy('featured');
    setSearchParams(new URLSearchParams());
  };

  const handleQuickOrder = (product: any) => {
    setQuickOrderProduct(product);
  };

  const trendingProducts = useMemo(() => {
    return products.slice(0, 6);
  }, [products]);

  const bestSellingProducts = useMemo(() => {
    return products.slice(products.length > 6 ? 6 : 0, 12);
  }, [products]);
  
  const productsByCategory = useMemo(() => {
    return distinctCategories.map(cat => ({
      name: cat,
      items: products.filter(p => p.category === cat).slice(0, 6)
    }));
  }, [distinctCategories, products]);

  const isPriceFilterActive = priceRange[0] > minBound || priceRange[1] < maxBound;
  const hasActiveFilters = Boolean(activeCategoryFilter || searchParam || isPriceFilterActive || sortBy !== 'featured');

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeCategoryFilter) {
      list = list.filter(p => p.category?.toLowerCase() === activeCategoryFilter.toLowerCase());
    }
    if (searchParam.trim()) {
      const q = searchParam.toLowerCase();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q) || 
        p.category?.toLowerCase().includes(q)
      );
    }
    // Price Range Filter
    list = list.filter(p => {
      const price = Number(p.price) || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sorting
    if (sortBy === 'price_low') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [products, activeCategoryFilter, searchParam, priceRange, sortBy]);

  const renderProductCard = (product: any, index: number = 0) => (
    <ProductCard 
      key={product.id} 
      product={product} 
      onQuickView={(p) => setQuickViewProduct(p)}
      onQuickOrder={(p) => handleQuickOrder(p)}
      className="animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 35, 350)}ms` }}
    />
  );

  // Dynamic SEO Configuration for Category, Search, or Storefront
  const dynamicSEO = useMemo(() => {
    const siteName = settings?.site_name || 'TechStore';
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    if (activeCategoryFilter) {
      const catMeta = getCategoryMeta(activeCategoryFilter, {
        siteName,
        siteUrl,
        productCount: filteredProducts.length,
        topProducts: filteredProducts.slice(0, 6)
      });
      return (
        <SEO
          title={catMeta.title}
          description={catMeta.description}
          keywords={catMeta.keywords}
          canonical={catMeta.canonicalUrl}
          type="website"
          siteName={siteName}
          robots={catMeta.robots}
          jsonLd={catMeta.jsonLd}
        />
      );
    }

    if (searchParam.trim()) {
      return (
        <SEO
          title={`Search Results for "${searchParam}" (${filteredProducts.length} items) | ${siteName}`}
          description={`Browse ${filteredProducts.length} search results for "${searchParam}" at ${siteName}. Exclusive tech discounts and fast delivery.`}
          keywords={[searchParam, 'search', 'tech products', siteName]}
          type="website"
          siteName={siteName}
          robots="noindex, follow"
        />
      );
    }

    return (
      <SEO
        title={`${siteName} | Premium Electronics, Laptops, Phones & Tech Store`}
        description={`Discover premium smartphones, high-performance laptops, audio accessories, and genuine electronics at ${siteName}. Authentic warranty and fast delivery.`}
        keywords={['electronics store', 'buy laptops online', 'smartphones', 'smart gadgets', 'authentic warranty', siteName]}
        type="website"
        siteName={siteName}
      />
    );
  }, [activeCategoryFilter, searchParam, filteredProducts, settings?.site_name]);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col relative">
      {dynamicSEO}
      <div className="max-w-7xl mx-auto w-full px-2.5 sm:px-4 lg:px-6 py-3 sm:py-5 space-y-4 sm:space-y-6">
        <HeroSlider banners={banners.filter(b => b.position === "hero")} />
        
        {/* Category Collections Showcase Bar */}
        <section className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5">
              <span className="p-0.5 sm:p-1 rounded-md bg-blue-50 text-blue-600">
                <Sparkles className="w-3 h-3" />
              </span>
              <h3 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Explore Categories
              </h3>
            </div>
            {activeCategoryFilter && (
              <button 
                onClick={() => handleCategorySelect('')}
                className="text-[10px] sm:text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
          
          <div className="relative flex items-center gap-1 sm:gap-1.5">
            {/* Left Arrow Button */}
            <button
              onClick={() => scrollCategories('left')}
              disabled={!canScrollLeft}
              className={`hidden sm:flex shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg border items-center justify-center transition-all ${
                canScrollLeft
                  ? 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 shadow-2xs cursor-pointer active:scale-95'
                  : 'bg-slate-50/50 text-slate-300 border-slate-100 cursor-not-allowed opacity-30'
              }`}
              title="Scroll categories left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Scrollable Categories List */}
            <div
              ref={categoryScrollRef}
              className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scroll-smooth no-scrollbar select-none touch-pan-x"
            >
              <button
                onClick={() => handleCategorySelect('')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  !activeCategoryFilter 
                    ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-600/20' 
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 active:scale-95'
                }`}
              >
                All Items ({products.length})
              </button>
              {distinctCategories.map((cat, idx) => {
                const count = products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
                const isSelected = activeCategoryFilter.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={`scroll-cat-${cat}-${idx}`}
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-600/20' 
                        : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 active:scale-95'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Arrow Button */}
            <button
              onClick={() => scrollCategories('right')}
              disabled={!canScrollRight}
              className={`hidden sm:flex shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg border items-center justify-center transition-all ${
                canScrollRight
                  ? 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200 shadow-2xs cursor-pointer active:scale-95'
                  : 'bg-slate-50/50 text-slate-300 border-slate-100 cursor-not-allowed opacity-30'
              }`}
              title="Scroll categories right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>


        
        {homeSections && homeSections.length > 0 && !activeCategoryFilter && !searchParam ? (
          homeSections.map((sec, secIdx) => {
            let sectionProducts = [];
            if (sec.type === 'trending') {
              sectionProducts = trendingProducts.slice(0, sec.limit_count);
            } else if (sec.type === 'best_selling') {
              sectionProducts = bestSellingProducts.slice(0, sec.limit_count);
            } else if (sec.type === 'category') {
              const catSlug = (sec.category_slug || '').trim().toLowerCase();
              sectionProducts = products.filter(p => (p.category || '').toLowerCase() === catSlug).slice(0, sec.limit_count);
            }
            if (sectionProducts.length === 0) return null;

            return (
              <section key={sec.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {sec.type === 'trending' ? <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> : 
                     sec.type === 'best_selling' ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : 
                     <Zap className="w-3.5 h-3.5 text-indigo-500" />}
                    <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800">{sec.title}</h2>
                  </div>
                  {sec.type === 'category' && (
                    <button 
                      onClick={() => handleCategorySelect(sec.category_slug)}
                      className="text-[11px] sm:text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors group cursor-pointer"
                    >
                      View All <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>
                <div className={getGridClass()}>
                  {sectionProducts.map((p, idx) => renderProductCard(p, idx))}
                </div>
              </section>
            );
          })
        ) : (
          <>
            {trendingProducts.length > 0 && !activeCategoryFilter && !searchParam && (
              <section className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800">Trending Now</h2>
                </div>
                <div className={getGridClass()}>
                  {trendingProducts.map((p, idx) => renderProductCard(p, idx))}
                </div>
              </section>
            )}
            
            {/* Featured Category Collections */}
            {!activeCategoryFilter && !searchParam && productsByCategory.map((cat, idx) => cat.items.length > 0 && (
              <section key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800 capitalize">{cat.name} Collection</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Top-rated selections in {cat.name}</p>
                  </div>
                  <button 
                    onClick={() => handleCategorySelect(cat.name)}
                    className="text-[11px] sm:text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors group cursor-pointer"
                  >
                    View All <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
                <div className={getGridClass()}>
                  {cat.items.map((p, itemIdx) => renderProductCard(p, itemIdx))}
                </div>
              </section>
            ))}
            
            {bestSellingProducts.length > 0 && !activeCategoryFilter && !searchParam && (
              <section className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800">Best Sellers</h2>
                </div>
                <div className={getGridClass()}>
                  {bestSellingProducts.map((p, idx) => renderProductCard(p, idx))}
                </div>
              </section>
            )}
          </>
        )}


        <section id="all-products" className="pt-3 sm:pt-4 border-t border-slate-200/80 space-y-2.5">
          {activeCategoryFilter && (
            <Breadcrumbs 
              items={[
                { label: 'Categories' },
                { label: activeCategoryFilter }
              ]} 
            />
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800">
                {activeCategoryFilter ? `${activeCategoryFilter} Products` : searchParam ? `Search Results for "${searchParam}"` : 'All Products'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                {loading ? 'Loading products...' : `Showing ${filteredProducts.length} items ${activeCategoryFilter ? `in ${activeCategoryFilter}` : ''}`}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <button
                onClick={() => handleCategorySelect('')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                  !activeCategoryFilter 
                    ? 'bg-blue-600 text-white shadow-2xs' 
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All
              </button>
              {distinctCategories.map((cat, idx) => (
                <button
                  key={`filter-cat-${cat}-${idx}`}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                    activeCategoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-blue-600 text-white shadow-2xs' 
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Badges Bar */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap p-1.5 sm:p-2 bg-slate-100/80 border border-slate-200/60 rounded-lg text-[11px]">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-600" />
                Active Filters:
              </span>
              
              {activeCategoryFilter && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700 shadow-2xs">
                  Category: <strong className="text-blue-600">{activeCategoryFilter}</strong>
                  <button 
                    onClick={() => handleCategorySelect('')}
                    className="hover:text-red-600 p-0.5 text-slate-400"
                    title="Remove category filter"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              {searchParam && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700 shadow-2xs">
                  Search: <strong className="text-blue-600">"{searchParam}"</strong>
                  <button 
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('search');
                      setSearchParams(newParams);
                    }}
                    className="hover:text-red-600 p-0.5 text-slate-400"
                    title="Remove search query"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              {isPriceFilterActive && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700 shadow-2xs">
                  Budget: <strong className="text-blue-600">{currency}{priceRange[0]} - {currency}{priceRange[1]}</strong>
                  <button 
                    onClick={handlePriceReset}
                    className="hover:text-red-600 p-0.5 text-slate-400"
                    title="Reset price filter"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              {sortBy !== 'featured' && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700 shadow-2xs">
                  Sort: <strong className="text-blue-600">{sortBy === 'price_low' ? 'Price Low-High' : sortBy === 'price_high' ? 'Price High-Low' : 'Name A-Z'}</strong>
                  <button 
                    onClick={() => handleSortChange('featured')}
                    className="hover:text-red-600 p-0.5 text-slate-400"
                    title="Reset sort"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}

              <button
                onClick={handleClearAllFilters}
                className="ml-auto text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline px-1.5 py-0.5"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Interactive Price Range Budget Filter */}
          <PriceRangeFilter
            minBound={minBound}
            maxBound={maxBound}
            minPrice={priceRange[0]}
            maxPrice={priceRange[1]}
            currency={currency}
            onChange={handlePriceChange}
            onReset={handlePriceReset}
            totalProductsCount={products.length}
            filteredProductsCount={filteredProducts.length}
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-2.5 border border-slate-100 flex flex-col h-full animate-pulse shadow-2xs">
                  <div className="w-full aspect-[4/3] bg-slate-100 rounded-md mb-2"></div>
                  <div className="px-0.5 flex flex-col flex-1">
                    <div className="h-2 bg-slate-200 rounded w-1/3 mb-1.5"></div>
                    <div className="h-2.5 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="mt-auto pt-1.5 flex items-center justify-between">
                      <div className="h-3.5 bg-slate-200 rounded w-1/3"></div>
                      <div className="h-5 w-5 bg-slate-200 rounded-md"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-8 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Filter className="w-4 h-4" />
              </div>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">No products match your current budget & filter selections.</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {isPriceFilterActive && (
                  <button 
                    onClick={handlePriceReset}
                    className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    Reset Price Range
                  </button>
                )}
                <button 
                  onClick={handleClearAllFilters}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <div 
              key={`grid-${activeCategoryFilter}-${searchParam}-${priceRange.join('-')}-${sortBy}`}
              className={getGridClass()}
            >
              {filteredProducts.slice(0, visibleCount).map((p, idx) => renderProductCard(p, idx))}
            </div>
          )}
          
          {visibleCount < filteredProducts.length && (
            <div className="mt-4 sm:mt-6 flex justify-center">
              <button 
                onClick={loadMore}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 py-1.5 sm:py-2 px-5 sm:px-6 rounded-full text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Load More ({filteredProducts.length - visibleCount})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* Compact 2-Grid Promotional Banners Section */}
        <PromoBanners onSelectCategory={handleCategorySelect} banners={banners.filter((b: any) => b.position === "promotional")} />

        {/* Customer Testimonials Carousel */}
        <section className="pt-6 sm:pt-8 border-t border-slate-200/80">
          <div className="flex items-center gap-1.5 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-800">What Our Customers Say</h2>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory scrollbar-compact">
            {[
              { id: 1, name: "Sarah Jenkins", role: "Verified Buyer", text: "Incredible speed and service. The laptop arrived well-packaged and exactly as described. Highly recommended!", rating: 5 },
              { id: 2, name: "David Chen", role: "Tech Enthusiast", text: "Customer support was super helpful when I needed to exchange my headphones. Seamless return policy.", rating: 5 },
              { id: 3, name: "Aisha Patel", role: "Verified Buyer", text: "Best prices I could find online. The checkout process was smooth, and delivery was much faster than expected.", rating: 4 },
              { id: 4, name: "Marcus Johnson", role: "Verified Buyer", text: "Got a great deal on my new smartphone. The site is very easy to navigate. Will definitely shop here again.", rating: 5 },
            ].map(t => (
              <div key={t.id} className="min-w-[260px] max-w-[280px] snap-center bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < t.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200 fill-slate-200'}`} />
                  ))}
                </div>
                <p className="text-[11px] text-slate-600 italic flex-1 leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="text-xs font-bold text-slate-900">{t.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            <button 
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-3 right-3 z-10 w-6 h-6 flex items-center justify-center bg-white/80 hover:bg-white text-slate-700 rounded-full backdrop-blur-md shadow-sm transition-all"
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
            
            <div className="w-full md:w-1/2 p-5 sm:p-6 flex flex-col overflow-y-auto">
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 mb-2 w-fit">
                {quickViewProduct.category}
              </span>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-1">
                {quickViewProduct.name}
              </h2>
              <div className="text-xl font-bold text-blue-600 mb-4">
                {currency}{formatPrice(quickViewProduct.price)}
              </div>
              
              <div className="prose prose-sm text-slate-600 mb-6 text-[13px] leading-relaxed">
                <p className="line-clamp-4">{quickViewProduct.description}</p>
              </div>
              
              <div className="mt-auto pt-3 pb-1 sm:pb-0 sm:pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 sm:gap-2">
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
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white py-2.5 sm:py-0 sm:h-[34px] rounded-lg text-[13px] font-bold transition-all shadow-sm cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  onClick={() => handleQuickOrder(quickViewProduct)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white py-2.5 sm:py-0 sm:h-[34px] rounded-lg text-[13px] font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  Quick Order
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(quickViewProduct)}
                  className={`p-2 sm:h-[34px] sm:px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isFavorite(quickViewProduct.id)
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-slate-50 hover:bg-rose-50 border-slate-200 text-slate-700 hover:text-rose-600'
                  }`}
                  title={isFavorite(quickViewProduct.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFavorite(quickViewProduct.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span className="text-[11px] sm:hidden">{isFavorite(quickViewProduct.id) ? 'Favorited' : 'Favorite'}</span>
                </button>
              </div>
              <Link 
                to={formatProductUrl(quickViewProduct)}
                className="mt-2.5 sm:mt-3 text-center text-[12px] font-medium text-slate-500 hover:text-blue-600 transition-colors py-1"
              >
                View Full Details
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

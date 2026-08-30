import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  ChevronDown, 
  Tag, 
  ArrowRight, 
  Loader2, 
  Clock, 
  TrendingUp, 
  ShoppingCart, 
  Eye, 
  Check, 
  Sparkles,
  PackageCheck,
  PackageX,
  Plus
} from 'lucide-react';
import { useProducts, Product } from '../context/ProductContext';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from './LazyImage';
import { formatProductUrl } from '../utils/slug';

interface PredictiveSearchBarProps {
  isMobile?: boolean;
  onCloseMobileMenu?: () => void;
  className?: string;
}

const RECENT_SEARCHES_KEY = 'techshop_recent_searches';
const TRENDING_TAGS = ['Laptop', 'Headphones', 'Smartwatch', 'Gaming', 'Wireless', 'Keyboard'];

export default function PredictiveSearchBar({ 
  isMobile = false, 
  onCloseMobileMenu,
  className = ''
}: PredictiveSearchBarProps) {
  const navigate = useNavigate();
  const { products, categories, loading: productsLoading } = useProducts();
  const { settings, currentCurrency, formatPrice } = useSettings();
  const { addToCart, setIsCartOpen } = useCart();
  const currency = currentCurrency?.symbol || '$';

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches(prev => {
      const updated = [clean, ...prev.filter(t => t.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, termToRemove: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(t => t !== termToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

  // Predictive Matching Algorithm
  const { matchedProducts, matchedCategories } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { matchedProducts: [], matchedCategories: [] };
    }

    // Category suggestions
    const catMatches = categories.filter(c => 
      c.toLowerCase().includes(q)
    ).slice(0, 3);

    // Product suggestions with scoring
    const scored = products
      .filter(p => {
        if (selectedCategory && p.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
        return true;
      })
      .map(p => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        
        let score = 0;
        if (name.startsWith(q)) score += 100;
        else if (name.includes(` ${q}`)) score += 75;
        else if (name.includes(q)) score += 50;
        
        if (cat.startsWith(q)) score += 40;
        else if (cat.includes(q)) score += 20;

        if (desc.includes(q)) score += 10;

        return { product: p, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);

    return {
      matchedProducts: scored.slice(0, 6),
      matchedCategories: catMatches
    };
  }, [query, selectedCategory, products, categories]);

  // Set default hovered product for quick preview
  useEffect(() => {
    if (matchedProducts.length > 0) {
      if (highlightedIndex >= 0 && highlightedIndex < matchedProducts.length) {
        setHoveredProduct(matchedProducts[highlightedIndex]);
      } else {
        setHoveredProduct(matchedProducts[0]);
      }
    } else {
      setHoveredProduct(null);
    }
  }, [matchedProducts, highlightedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Focus search on Cmd/Ctrl + K or /
      if ((event.metaKey || event.ctrlKey) && event.key === 'k' || event.key === '/') {
        // Prevent default only if not in an input already, or if it's the shortcut
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          event.preventDefault();
          inputRef.current?.focus();
          setIsOpen(true);
        }
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsOpen(false);
    if (query.trim()) {
      saveRecentSearch(query);
    }
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    
    navigate(`/?${params.toString()}#all-products`);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const handleSelectProduct = (product: Product) => {
    saveRecentSearch(product.name);
    setIsOpen(false);
    if (onCloseMobileMenu) onCloseMobileMenu();
    navigate(formatProductUrl(product));
  };

  const handleSelectCategoryShortcut = (catName: string) => {
    setSelectedCategory(catName);
    setIsOpen(false);
    if (onCloseMobileMenu) onCloseMobileMenu();
    navigate(`/?category=${encodeURIComponent(catName)}#all-products`);
  };

  const handleSelectTag = (tag: string) => {
    setQuery(tag);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleAddToCartQuick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addToCart({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image_url: product.image_url || DEFAULT_PRODUCT_IMAGE
    });
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1800);
    setIsCartOpen(true);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < matchedProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : matchedProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < matchedProducts.length) {
        handleSelectProduct(matchedProducts[highlightedIndex]);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={i} className="bg-blue-100 text-blue-800 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const showDropdown = isOpen;

  return (
    <div 
      ref={containerRef} 
      className={`relative ${isMobile ? 'w-full' : 'w-full max-w-xl'} ${className}`}
    >
      {/* SEARCH INPUT BAR */}
      <form 
        onSubmit={handleSearchSubmit} 
        className={`flex w-full border border-slate-300 rounded-md overflow-hidden bg-white shadow-2xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all ${
          isMobile ? 'h-[36px]' : 'h-[32px]'
        }`}
      >
        {/* Category Select (Desktop) */}
        {!isMobile && (
          <div className="relative bg-slate-50 border-r border-slate-200 shrink-0">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-transparent h-full pl-2.5 pr-7 text-[11px] font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              <option value="">All Categories</option>
              {categories.map((cat, idx) => (
                <option key={`ps-cat-${cat}-${idx}`} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        )}

        {/* Text Input */}
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className={`absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none ${isMobile ? 'hidden' : 'block'}`} />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Search gadgets..." : "Search products..."}
            className={`w-full h-full pr-8 text-slate-800 placeholder:text-slate-400 outline-none bg-transparent transition-all ${
              isMobile ? 'pl-3 text-[13px]' : 'pl-9 text-xs'
            }`}
            autoComplete="off"
            spellCheck="false"
            aria-label="Search catalog"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />

          {!query && !isMobile && (
            <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none opacity-60">
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded font-sans shadow-sm">
                ⌘K
              </kbd>
            </div>
          )}

          {query && (
            <button 
              type="button" 
              onClick={() => {
                setQuery('');
                setHighlightedIndex(-1);
                inputRef.current?.focus();
              }} 
              className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer transition-colors"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className={`bg-slate-900 hover:bg-blue-600 active:bg-blue-800 text-white px-3.5 transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
            isMobile ? 'w-10' : 'w-10'
          }`}
          title="Search"
          aria-label="Submit Search"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* PREDICTIVE SEARCH DROPDOWN */}
      {showDropdown && (
        <div 
          className={`absolute left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] z-50 overflow-hidden flex flex-col text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150 ${
            isMobile ? 'top-[42px] max-h-[75vh]' : 'top-[38px] max-h-[420px]'
          }`}
        >
          {/* 1. STATE: USER HAS NOT TYPED YET (Recent Searches & Trending Tags) */}
          {!query.trim() ? (
            <div className="p-2 sm:p-3 space-y-2.5">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100/50">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="text-[9px] font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer uppercase tracking-wide"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recentSearches.map((term, i) => (
                      <span
                        key={`recent-${term}-${i}`}
                        onClick={() => handleSelectTag(term)}
                        className="group inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-md text-[11px] font-medium text-slate-600 cursor-pointer transition-all active:scale-95"
                      >
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(e, term)}
                          className="text-slate-300 hover:text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove item"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Popular Tags */}
              <div>
                <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-slate-100/50">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Popular Categories</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {TRENDING_TAGS.map((tag) => (
                    <button
                      key={`trend-${tag}`}
                      type="button"
                      onClick={() => handleSelectTag(tag)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-blue-50 hover:border-blue-200 border border-slate-200/50 rounded-md text-[11px] font-medium text-slate-600 hover:text-blue-700 transition-all cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 2. STATE: USER TYPED A QUERY (Predictive suggestions & Quick View) */
            <div className="flex flex-col">
              
              {/* Header Bar with query meta */}
              <div className="bg-slate-50/80 px-3 py-1.5 flex items-center justify-between text-[10px] border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Search className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="font-medium text-slate-600">Results for</span>
                  <span className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">&quot;{query}&quot;</span>
                </div>
                <span className="bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                  {matchedProducts.length} matches
                </span>
              </div>

              {/* Matched Categories Shortcuts */}
              {matchedCategories.length > 0 && (
                <div className="bg-blue-50/30 px-3 py-1.5 border-b border-blue-100/30 flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="text-blue-500 font-bold uppercase tracking-wider text-[9px]">Jump To:</span>
                  {matchedCategories.map((cat, i) => (
                    <button
                      key={`cat-match-${cat}-${i}`}
                      type="button"
                      onClick={() => handleSelectCategoryShortcut(cat)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-blue-100 hover:border-blue-300 rounded text-blue-700 font-semibold hover:bg-blue-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Tag className="w-2.5 h-2.5 text-blue-500" />
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Main Content Area: Split View for Desktop (List + Quick View Pane) / Scroll List for Mobile */}
              <div className={`grid ${!isMobile && matchedProducts.length > 0 ? 'grid-cols-12 divide-x divide-slate-100' : 'grid-cols-1'}`}>
                
                {/* Product List Column */}
                <div className={`${!isMobile && matchedProducts.length > 0 ? 'col-span-8' : 'col-span-12'} max-h-[300px] overflow-y-auto scrollbar-compact divide-y divide-slate-50`}>
                  {productsLoading ? (
                    <div className="p-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Searching catalog...</span>
                    </div>
                  ) : matchedProducts.length > 0 ? (
                    matchedProducts.map((product, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      const isHovered = hoveredProduct?.id === product.id;
                      const inStock = (product.stock_quantity ?? 10) > 0;
                      const isLowStock = (product.stock_quantity ?? 10) > 0 && (product.stock_quantity ?? 10) <= 5;

                      return (
                        <div
                          key={`pred-prod-${product.id}`}
                          onClick={() => handleSelectProduct(product)}
                          onMouseEnter={() => setHoveredProduct(product)}
                          className={`w-full p-2 flex items-center gap-2.5 transition-all text-left cursor-pointer group select-none ${
                            isHighlighted || isHovered 
                              ? 'bg-slate-50 border-l-2 border-slate-900' 
                              : 'hover:bg-slate-50/50 border-l-2 border-transparent'
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded bg-white border border-slate-100 p-0.5 shrink-0 overflow-hidden group-hover:border-slate-300 group-hover:shadow-2xs transition-all">
                            <LazyImage
                              src={product.image_url}
                              alt={product.name}
                              fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                              className="w-full h-full object-contain"
                              containerClassName="w-full h-full"
                              showBadgeOnError={false}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-[11px] sm:text-xs font-bold truncate transition-colors ${
                              isHighlighted || isHovered ? 'text-slate-900' : 'text-slate-700'
                            }`}>
                              {highlightMatch(product.name, query)}
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] text-slate-500 font-medium">
                                {product.category}
                              </span>
                              <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                              {/* Stock status indicator */}
                              {inStock ? (
                                <span className={`text-[9px] font-bold ${
                                  isLowStock ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {isLowStock ? 'Low Stock' : 'In Stock'}
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-500">
                                  Out of Stock
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price & Fast Action */}
                          <div className="text-right shrink-0 flex flex-col items-end gap-0.5 pr-1">
                            <span className="text-[11px] font-extrabold text-slate-900">
                              {currency}{formatPrice(product.price)}
                            </span>

                            {/* Quick Add to Cart Button */}
                            <button
                              type="button"
                              onClick={(e) => handleAddToCartQuick(e, product)}
                              disabled={!inStock}
                              className={`rounded text-[9px] font-bold px-1.5 py-0.5 transition-all cursor-pointer flex items-center gap-1 ${
                                addedProductId === product.id 
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : inStock
                                    ? 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600'
                                    : 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                              }`}
                              title={addedProductId === product.id ? "Added!" : "Quick add to cart"}
                            >
                              {addedProductId === product.id ? (
                                <><Check className="w-2.5 h-2.5" /> Added</>
                              ) : (
                                <><Plus className="w-2.5 h-2.5" /> Add</>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                        <Search className="w-4 h-4 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        No matches for &quot;<span className="text-slate-900">{query}</span>&quot;
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] leading-relaxed">
                        Try a different keyword or check spelling.
                      </p>
                    </div>
                  )}
                </div>

                {/* Desktop Quick-View Preview Pane (Right Column) */}
                {!isMobile && matchedProducts.length > 0 && hoveredProduct && (
                  <div className="col-span-4 bg-slate-50/50 p-3 flex flex-col max-h-[300px] overflow-y-auto scrollbar-compact">
                    <div>
                      {/* Product Preview Image */}
                      <div className="w-full aspect-square rounded-lg bg-white border border-slate-100 p-3 flex items-center justify-center overflow-hidden mb-2.5 shadow-xs">
                        <LazyImage
                          src={hoveredProduct.image_url}
                          alt={hoveredProduct.name}
                          fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                          className="w-full h-full object-contain"
                          containerClassName="w-full h-full"
                          showBadgeOnError={false}
                        />
                      </div>

                      {/* Product Name */}
                      <h4 className="text-[11px] font-bold text-slate-900 leading-snug line-clamp-2">
                        {hoveredProduct.name}
                      </h4>

                      {/* Description Snippet */}
                      {hoveredProduct.description && (
                         <p className="text-[9px] text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                          {hoveredProduct.description}
                        </p>
                      )}

                    </div>
                  </div>
                )}

              </div>

              {/* Dropdown Footer: Full Search Link */}
              {matchedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border-t border-slate-200/70 text-center text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>See all {matchedProducts.length} results</span>
                  <ArrowRight className="w-3 h-3" />
                  <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 bg-white border border-slate-200 rounded text-[8px] text-slate-400 shadow-xs">Enter</kbd>
                </button>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}

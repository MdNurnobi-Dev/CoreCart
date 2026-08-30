const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const getGridClassFunc = `
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
`;

const dynamicSections = `
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
              <section key={secIdx} className="space-y-2">
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
`;

// Insert the grid class generator
code = code.replace(
  '  const { addToCart, setIsCartOpen } = useCart();',
  '  const { addToCart, setIsCartOpen } = useCart();\n' + getGridClassFunc
);

// Replace ALL instances of "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3 transition-all duration-300"
// with "{getGridClass()}" (we'll just catch the one in all-products too)
code = code.replace(
  /className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3 transition-all duration-300"/g,
  'className={getGridClass()}'
);

// Replace the hardcoded sections
const startRegex = /\{\s*\/\*\s*Trending Now Section\s*\*\/\s*\}/s; // Wait, it didn't have that comment.
// Let's replace the whole block from `{trendingProducts.length > 0` up to the end of `bestSellingProducts.length > 0`
const regex = /\{trendingProducts\.length > 0 && !activeCategoryFilter && !searchParam && \([\s\S]*?\{bestSellingProducts\.length > 0 && !activeCategoryFilter && !searchParam && \([\s\S]*?<\/section>\s*\)\}/s;

code = code.replace(regex, dynamicSections);

fs.writeFileSync('src/pages/Home.tsx', code);

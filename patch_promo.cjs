const fs = require('fs');
let code = fs.readFileSync('src/components/PromoBanners.tsx', 'utf8');

code = code.replace(
  'export default function PromoBanners({ onSelectCategory }: PromoBannersProps) {',
  'export default function PromoBanners({ onSelectCategory, banners }: PromoBannersProps & { banners?: any[] }) {'
);

// We'll replace the hardcoded return statement with a mapping of dynamic banners, if provided.
// If banners array is provided and not empty, use it. Otherwise, use the hardcoded ones.
const dynamicPromo = `
  if (banners && banners.length > 0) {
    return (
      <section className="pt-6 sm:pt-8 border-t border-slate-200/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {banners.map((banner, idx) => (
            <div key={idx} className="group relative overflow-hidden rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-2/5 h-full bg-gradient-to-l from-slate-50/40 via-slate-50/15 to-transparent pointer-events-none" />
              <div className="p-2.5 sm:p-3.5 relative z-10 flex items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-[13px] font-semibold text-slate-800 tracking-tight leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
                    {banner.title}
                  </h3>
                  <p className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5 leading-relaxed line-clamp-1">
                    {banner.subtitle}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {banner.link_url ? (
                      <Link
                        to={banner.link_url}
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-blue-600 text-white font-medium text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>Explore</span>
                        <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shadow-2xs relative">
                  <LazyImage
                    src={banner.image_url || banner.image}
                    alt={banner.title}
                    fallbackSrc={DEFAULT_BANNER_IMAGE}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    containerClassName="w-full h-full"
                    placeholderType="banner"
                    showBadgeOnError={false}
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-lg pointer-events-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
`;

code = code.replace(
  '  return (\n    <section className="pt-6 sm:pt-8 border-t border-slate-200/80">',
  dynamicPromo + '\n  return (\n    <section className="pt-6 sm:pt-8 border-t border-slate-200/80">'
);

fs.writeFileSync('src/components/PromoBanners.tsx', code);

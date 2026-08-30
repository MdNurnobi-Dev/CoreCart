import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  Copy, 
  Check, 
  Tag, 
  Flame
} from 'lucide-react';
import LazyImage, { DEFAULT_BANNER_IMAGE } from './LazyImage';

interface PromoBannersProps {
  onSelectCategory?: (category: string) => void;
}

export default function PromoBanners({ onSelectCategory, banners }: PromoBannersProps & { banners?: any[] }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCoupon = (e: React.MouseEvent, code: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCategoryClick = (catName: string) => {
    if (onSelectCategory) {
      onSelectCategory(catName);
    }
  };

  
  const activeBanners = banners && banners.length > 0 ? banners.slice(0, 2) : [
    {
      id: 'hardcoded-1',
      title: 'Premium Audio',
      subtitle: 'Immersive sound experience.',
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=300',
      coupon: 'AUDIO40',
      category: 'Audio & Headphones',
      color: 'blue'
    },
    {
      id: 'hardcoded-2',
      title: 'Laptops & Workstations',
      subtitle: 'Ultra-light laptops, productivity rigs & accessories.',
      image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=300',
      coupon: 'PROLAPTOP',
      category: 'Laptop',
      color: 'emerald'
    }
  ];

  return (
    <section 
      id="promotional-banners" 
      aria-label="Promotional Offers"
      className="pt-1.5 sm:pt-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
        {activeBanners.map((banner, index) => {
          const color = index % 2 === 0 ? 'blue' : 'emerald';
          const bgGradient = color === 'blue' 
            ? 'from-blue-50/40 via-indigo-50/15' 
            : 'from-emerald-50/40 via-teal-50/15';
          const badgeBg = color === 'blue' ? 'bg-blue-50' : 'bg-emerald-50';
          const badgeText = color === 'blue' ? 'text-blue-700' : 'text-emerald-700';
          const badgeBorder = color === 'blue' ? 'border-blue-200/80' : 'border-emerald-200/80';
          const iconColor = color === 'blue' ? 'text-blue-500' : 'text-emerald-500';
          const hoverBorder = color === 'blue' ? 'hover:border-blue-300/80' : 'hover:border-emerald-300/80';
          
          return (
            <div key={banner.id} className={`group relative overflow-hidden rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs ${hoverBorder} transition-all duration-200 flex flex-col justify-between`}>
              <div className={`absolute top-0 right-0 w-2/5 h-full bg-gradient-to-l ${bgGradient} to-transparent pointer-events-none`} />
              
              <div className="p-2.5 sm:p-3.5 relative z-10 flex items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md ${badgeBg} border ${badgeBorder} ${badgeText} text-[9px] sm:text-[10px] font-medium leading-none`}>
                      <Sparkles className={`w-2.5 h-2.5 ${iconColor} shrink-0`} />
                      <span>{index % 2 === 0 ? 'Trending' : 'Official Warranty'}</span>
                    </span>
                  </div>
                  
                  <h3 className={`text-xs sm:text-[13px] font-semibold text-slate-800 tracking-tight leading-snug group-hover:${badgeText} transition-colors line-clamp-1`}>
                    {banner.title}
                  </h3>
                  
                  <p className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5 leading-relaxed line-clamp-1">
                    {banner.subtitle}
                  </p>
                  
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {banner.link_url && (
                      <Link
                        to={banner.link_url}
                        className={`inline-flex items-center gap-1 ${color === 'blue' ? 'bg-slate-900 hover:bg-blue-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-medium text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shadow-2xs transition-colors cursor-pointer`}
                      >
                        <span>Explore</span>
                        <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </Link>
                    )}
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
              
              <div className="px-2.5 sm:px-3.5 py-1 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Truck className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  <span className="truncate">Express Delivery</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className={`w-2.5 h-2.5 ${iconColor} shrink-0`} />
                  <span className="truncate">100% Genuine</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

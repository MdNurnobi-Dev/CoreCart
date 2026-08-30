import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LazyImage, { DEFAULT_BANNER_IMAGE } from './LazyImage';

const slides = [
  {
    id: 1,
    title: "Next-Gen Workstations",
    subtitle: "Up to 20% off on premium laptops for creators and professionals.",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=1200",
    cta: "Shop Laptops",
    color: "from-slate-900/90 to-slate-900/40"
  },
  {
    id: 2,
    title: "The Latest Smartphones",
    subtitle: "Upgrade your mobile experience with our new flagship arrivals.",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=1200",
    cta: "Explore Mobiles",
    color: "from-blue-900/90 to-blue-900/40"
  },
  {
    id: 3,
    title: "Immersive Audio",
    subtitle: "Premium noise-canceling headphones for the ultimate sound.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200",
    cta: "View Accessories",
    color: "from-indigo-900/90 to-indigo-900/40"
  }
];

export default function HeroSlider({ banners }: { banners?: any[] }) {
  const [current, setCurrent] = useState(0);
  const activeSlides = banners && banners.length > 0 ? banners.map((b, i) => {
    const colors = ["from-slate-900/90 to-slate-900/40", "from-blue-900/90 to-blue-900/40", "from-indigo-900/90 to-indigo-900/40", "from-emerald-900/90 to-emerald-900/40", "from-purple-900/90 to-purple-900/40"];
    return {
      ...b,
      color: colors[i % colors.length],
      cta: b.link_url ? "Explore Now" : "Shop Now"
    };
  }) : slides;


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % activeSlides.length);
  const prev = () => setCurrent((prev) => (prev === 0 ? activeSlides.length - 1 : prev - 1));

  return (
    <div className="relative w-full h-40 sm:h-64 md:h-80 rounded-2xl overflow-hidden group mb-8 sm:mb-12 shadow-sm border border-slate-100">
      <div 
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {activeSlides.map((slide, index) => (
          <div key={slide.id} className="w-full h-full shrink-0 relative">
            <LazyImage 
              priority={index === 0}
              src={(slide.image_url || slide.image)} 
              alt={slide.title} 
              fallbackSrc={DEFAULT_BANNER_IMAGE}
              className="w-full h-full object-cover" 
              containerClassName="w-full h-full"
              placeholderType="banner"
              showBadgeOnError={false}
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.color} flex flex-col justify-center px-6 sm:px-8 md:px-16`}>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white mb-2 md:mb-4 max-w-lg leading-tight">{slide.title}</h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-200 mb-4 sm:mb-6 max-w-md line-clamp-2 sm:line-clamp-none">{slide.subtitle}</p>
              <div>
                <a href="#all-products" className="bg-white text-slate-900 hover:bg-slate-50 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-colors inline-block shadow-sm">
                  {(slide.cta || "Shop Now")}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation Arrows */}
      <button 
        onClick={prev} 
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all z-10"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button 
        onClick={next} 
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all z-10"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
        {activeSlides.map((_, idx) => (
          <button 
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-1.5 rounded-full transition-all ${current === idx ? 'bg-white w-4 sm:w-6' : 'bg-white/50 hover:bg-white/80 w-1.5'}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

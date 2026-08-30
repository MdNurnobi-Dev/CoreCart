import React, { useState, useEffect, useRef } from 'react';
import { ImageOff, Package, Sparkles } from 'lucide-react';
import { useImageOptimizer } from '../hooks/useImageOptimizer';

export const DEFAULT_PRODUCT_IMAGE = 
  'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=800';
export const DEFAULT_BANNER_IMAGE = 
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200';
export const DEFAULT_AVATAR_IMAGE = 
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string;
  placeholderType?: 'product' | 'avatar' | 'banner' | 'icon';
  showBadgeOnError?: boolean;
  priority?: boolean;
  style?: React.CSSProperties;
}

export default function LazyImage({
  src,
  alt = 'Product image',
  fallbackSrc = DEFAULT_PRODUCT_IMAGE,
  className = 'w-full h-full object-cover',
  containerClassName = '',
  aspectRatio,
  placeholderType = 'product',
  showBadgeOnError = true,
  priority = false,
  ...props
}: LazyImageProps) {
  const rawTarget = (!src || src.trim() === '') ? fallbackSrc : src;
  const optimizedSrc = useImageOptimizer(rawTarget) || rawTarget;
  const optimizedFallback = useImageOptimizer(fallbackSrc) || fallbackSrc;

  const [currentSrc, setCurrentSrc] = useState<string>(optimizedSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(optimizedSrc === optimizedFallback);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Track the previous source prop to avoid infinite loop on broken images
  const prevSrcRef = useRef(src);

  // Sync with prop change ONLY if the actual src prop changes
  useEffect(() => {
    if (src !== prevSrcRef.current) {
      prevSrcRef.current = src;
      const newTargetSrc = (!src || src.trim() === '') ? optimizedFallback : optimizedSrc;
      setCurrentSrc(newTargetSrc);
      setHasError(newTargetSrc === optimizedFallback);
      setIsLoaded(false); // Reset load state for new image
    }
  }, [src, optimizedFallback, optimizedSrc]);

  // Handle cached images that might not trigger onLoad
  useEffect(() => {
    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
      } else if (imgRef.current.naturalWidth === 0 && currentSrc !== optimizedFallback) {
        // broken image, handle error
        setCurrentSrc(optimizedFallback);
        setHasError(true);
        setIsLoaded(true);
      }
    }
  }, [currentSrc, optimizedFallback]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (currentSrc !== optimizedFallback) {
      setCurrentSrc(optimizedFallback);
      setHasError(true);
      setIsLoaded(true);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div 
      className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Animated Shimmer Preloader Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 animate-pulse">
          <div className="flex flex-col items-center gap-1.5 opacity-40">
            <Package className="w-5 h-5 text-slate-400 animate-bounce" />
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Loading...</span>
          </div>
        </div>
      )}

      {/* Main Image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} transition-all duration-500 ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        {...props}
      />

      {/* Fallback Indicator Pill if image is replaced with default */}
      {hasError && showBadgeOnError && placeholderType === 'product' && (
        <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 opacity-80 pointer-events-none">
          <ImageOff className="w-2.5 h-2.5 text-amber-400" />
          <span>Default Image</span>
        </div>
      )}
    </div>
  );
}

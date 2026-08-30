import { useMemo } from 'react';

interface ImageOptions {
  width?: number;
  quality?: number;
}

export function useImageOptimizer(src?: string | null, options: ImageOptions = {}) {
  return useMemo(() => {
    if (!src || src.trim() === '') return null;

    const { width = 800, quality = 80 } = options;

    try {
      // Validate URL
      const url = new URL(src);
      
      // Automatic optimization for known CDNs (like Unsplash)
      if (url.hostname === 'images.unsplash.com') {
        if (!url.searchParams.has('auto')) url.searchParams.set('auto', 'format');
        if (!url.searchParams.has('fit')) url.searchParams.set('fit', 'crop');
        if (!url.searchParams.has('q')) url.searchParams.set('q', quality.toString());
        if (!url.searchParams.has('w')) url.searchParams.set('w', width.toString());
      }
      
      return url.toString();
    } catch (e) {
      // If it's a relative URL or invalid URL format, return as is
      return src;
    }
  }, [src, options.width, options.quality]);
}

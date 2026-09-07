import React from 'react';
import { getCategoryMeta } from '../utils/seo';
import { SEO } from '../components/SEO';

export interface UseCategorySEOOptions {
  categoryName: string;
  productCount?: number;
  topProducts?: Array<{ id: string | number; name: string; price?: number | string; image_url?: string }>;
  siteName?: string;
  siteUrl?: string;
}

export function useCategorySEO({
  categoryName,
  productCount,
  topProducts,
  siteName = 'CoreCart',
  siteUrl
}: UseCategorySEOOptions) {
  if (!categoryName) return null;

  const meta = getCategoryMeta(categoryName, {
    siteName,
    siteUrl: siteUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
    productCount,
    topProducts
  });

  return (
    <SEO
      title={meta.title}
      description={meta.description}
      keywords={meta.keywords}
      image={meta.imageUrl}
      imageAlt={meta.imageAlt}
      url={meta.canonicalUrl}
      canonical={meta.canonicalUrl}
      type="website"
      siteName={siteName}
      robots={meta.robots}
      jsonLd={meta.jsonLd}
    />
  );
}

export default useCategorySEO;

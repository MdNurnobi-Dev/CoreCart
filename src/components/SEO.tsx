import React from 'react';
import { Helmet } from 'react-helmet-async';
import { DynamicSEOMeta, BreadcrumbItem, buildBreadcrumbSchema } from '../utils/seo';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[] | string;
  image?: string;
  imageAlt?: string;
  url?: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  siteName?: string;
  robots?: string;
  author?: string;
  ogExtra?: Record<string, string>;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  breadcrumbs?: BreadcrumbItem[];
}

export function SEO({
  title,
  description,
  keywords,
  image,
  imageAlt,
  url,
  canonical,
  type = 'website',
  siteName = 'CoreCart',
  robots = 'index, follow, max-image-preview:large',
  author = 'CoreCart Team',
  ogExtra = {},
  jsonLd,
  breadcrumbs
}: SEOProps) {
  const defaultTitle = `${siteName} | Premium Tech & Gadgets Store`;
  const defaultDescription =
    'CoreCart is your premier destination for authentic laptops, smartphones, high-end accessories, and smart electronics with official warranty and rapid delivery.';
  
  const currentTitle = title ? (title.includes(siteName) ? title : `${title} | ${siteName}`) : defaultTitle;
  const currentDescription = description || defaultDescription;
  
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const canonicalUrl = canonical || currentUrl.split('?')[0]; // Default canonical URL without query string unless specified

  const keywordsString = Array.isArray(keywords) 
    ? keywords.join(', ') 
    : keywords || 'tech gadgets, electronics, smartphones, laptops, smart accessories, ecommerce';

  // Merge breadcrumb JSON-LD if provided
  let allJsonLd: Array<Record<string, any>> = [];
  if (jsonLd) {
    if (Array.isArray(jsonLd)) {
      allJsonLd.push(...jsonLd);
    } else {
      allJsonLd.push(jsonLd);
    }
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    allJsonLd.push(buildBreadcrumbSchema(breadcrumbs, currentUrl));
  }

  // Base Organization & WebSite Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: siteName,
    url: typeof window !== 'undefined' ? window.location.origin : 'https://corecart.com',
    logo: image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=80',
    sameAs: [
      'https://facebook.com',
      'https://twitter.com',
      'https://instagram.com'
    ],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${typeof window !== 'undefined' ? window.location.origin : 'https://corecart.com'}/?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <Helmet>
      {/* Standard SEO Meta */}
      <title>{currentTitle}</title>
      <meta name="description" content={currentDescription} />
      <meta name="keywords" content={keywordsString} />
      <meta name="robots" content={robots} />
      <meta name="author" content={author} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={currentTitle} />
      <meta property="og:description" content={currentDescription} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:secure_url" content={image} />}
      {imageAlt && <meta property="og:image:alt" content={imageAlt} />}
      <meta property="og:locale" content="en_US" />

      {/* Custom Open Graph Extra Attributes (e.g. product price, stock) */}
      {Object.entries(ogExtra).map(([key, val]) => (
        <meta key={key} property={key} content={val} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={currentTitle} />
      <meta name="twitter:description" content={currentDescription} />
      {image && <meta name="twitter:image" content={image} />}
      {imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
      <meta name="twitter:site" content="@CoreCart" />

      {/* Schema.org Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>

      {allJsonLd.map((schemaObj, index) => (
        <script key={`schema-${index}`} type="application/ld+json">
          {JSON.stringify(schemaObj)}
        </script>
      ))}
    </Helmet>
  );
}

/**
 * Hook for imperative or component-level SEO meta generation
 */
export function useSEO(props: SEOProps) {
  return <SEO {...props} />;
}

export default SEO;

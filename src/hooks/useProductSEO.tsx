import React, { useMemo } from 'react';
import { SEO } from '../components/SEO';
import { buildProductSchema, BreadcrumbItem } from '../utils/seo';
import { formatProductUrl } from '../utils/slug';

export interface ProductSEOOptions {
  siteName?: string;
  currencySymbol?: string;
  currencyCode?: string;
  siteUrl?: string;
}

export function useProductSEO(
  product: any,
  currentUrl?: string,
  options: ProductSEOOptions = {}
) {
  return useMemo(() => {
    if (!product) return null;

    const siteName = options.siteName || 'CoreCart';
    const siteUrl = options.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const canonicalUrl = `${siteUrl}${formatProductUrl(product)}`;
    const priceNum = typeof product.price === 'string' ? parseFloat(product.price) || 0 : product.price;

    const productSchema = buildProductSchema(
      {
        id: product.slug || product.id,
        name: product.name,
        description: product.description,
        price: priceNum,
        image_url: product.image_url,
        category: product.category,
        sku: `TS-${product.id}`,
        in_stock: true,
        rating: 4.8,
        reviews_count: 12
      },
      {
        siteName,
        siteUrl,
        currency: options.currencyCode || 'USD'
      }
    );

    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', url: '/' },
      { name: product.category || 'Products', url: `/?category=${encodeURIComponent(product.category || 'All')}` },
      { name: product.name, url: formatProductUrl(product) }
    ];

    const keywords = [
      product.name,
      product.category,
      'buy online',
      'best price',
      'authentic gadgets',
      siteName
    ];

    const description = product.description 
      ? (product.description.length > 160 ? `${product.description.substring(0, 157)}...` : product.description)
      : `Shop authentic ${product.name} at ${siteName}. Premium quality, official warranty, and rapid courier delivery.`;

    return (
      <SEO
        title={`${product.name} | Best Price & Official Warranty`}
        description={description}
        keywords={keywords}
        image={product.image_url}
        imageAlt={product.name}
        url={currentUrl || canonicalUrl}
        canonical={canonicalUrl}
        type="product"
        siteName={siteName}
        jsonLd={[productSchema]}
        breadcrumbs={breadcrumbs}
        ogExtra={{
          'product:price:amount': String(priceNum),
          'product:price:currency': options.currencyCode || 'USD',
          'product:category': product.category || 'Electronics'
        }}
      />
    );
  }, [product, currentUrl, options.siteName, options.currencyCode, options.siteUrl]);
}

export function ProductSEO({
  product,
  currentUrl,
  options = {}
}: {
  product: any;
  currentUrl?: string;
  options?: ProductSEOOptions;
}) {
  if (!product) return null;

  const siteName = options.siteName || 'CoreCart';
  const siteUrl = options.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const canonicalUrl = `${siteUrl}${formatProductUrl(product)}`;
  const priceNum = typeof product.price === 'string' ? parseFloat(product.price) || 0 : product.price;

  const productSchema = buildProductSchema(
    {
      id: product.slug || product.id,
      name: product.name,
      description: product.description,
      price: priceNum,
      image_url: product.image_url,
      category: product.category,
      sku: `TS-${product.id}`,
      in_stock: true,
      rating: 4.8,
      reviews_count: 12
    },
    {
      siteName,
      siteUrl,
      currency: options.currencyCode || 'USD'
    }
  );

  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
    { name: product.category || 'Products', url: `/?category=${encodeURIComponent(product.category || 'All')}` },
    { name: product.name, url: formatProductUrl(product) }
  ];

  const keywords = [
    product.name,
    product.category,
    'buy online',
    'best price',
    'authentic gadgets',
    siteName
  ];

  const description = product.description 
    ? (product.description.length > 160 ? `${product.description.substring(0, 157)}...` : product.description)
    : `Shop authentic ${product.name} at ${siteName}. Premium quality, official warranty, and rapid courier delivery.`;

  return (
    <SEO
      title={`${product.name} | Best Price & Official Warranty`}
      description={description}
      keywords={keywords}
      image={product.image_url}
      imageAlt={product.name}
      url={currentUrl || canonicalUrl}
      canonical={canonicalUrl}
      type="product"
      siteName={siteName}
      jsonLd={[productSchema]}
      breadcrumbs={breadcrumbs}
      ogExtra={{
        'product:price:amount': String(priceNum),
        'product:price:currency': options.currencyCode || 'USD',
        'product:category': product.category || 'Electronics'
      }}
    />
  );
}

export default ProductSEO;


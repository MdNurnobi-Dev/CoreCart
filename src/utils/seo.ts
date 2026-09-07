/**
 * Dynamic SEO & Structured Data Utility for CoreCart
 * Generates metadata, OpenGraph tags, Twitter Card tags, and Schema.org JSON-LD structured data.
 */

export interface ProductSEOData {
  id?: string | number;
  name: string;
  description?: string;
  price: number | string;
  compare_price?: number | string;
  image_url?: string;
  category?: string;
  brand?: string;
  sku?: string;
  in_stock?: boolean | number;
  stock?: number;
  rating?: number;
  reviews_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategorySEOData {
  name: string;
  description?: string;
  image_url?: string;
  itemCount?: number;
  topProducts?: Array<{
    id: string | number;
    name: string;
    price?: number | string;
    image_url?: string;
  }>;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface DynamicSEOMeta {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  robots?: string;
  ogExtra?: Record<string, string>;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

/**
 * Builds Schema.org BreadcrumbList JSON-LD
 */
export function buildBreadcrumbSchema(breadcrumbs: BreadcrumbItem[], siteUrl: string = ''): Record<string, any> {
  const origin = siteUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://corecart.com');
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => {
      const fullUrl = item.url.startsWith('http') ? item.url : `${origin}${item.url.startsWith('/') ? '' : '/'}${item.url}`;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: fullUrl
      };
    })
  };
}

/**
 * Builds Schema.org Product JSON-LD for rich snippets in Google Search
 */
export function buildProductSchema(
  product: ProductSEOData,
  options: {
    siteName?: string;
    siteUrl?: string;
    currency?: string;
    brandName?: string;
  } = {}
): Record<string, any> {
  const origin = options.siteUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://corecart.com');
  const currency = options.currency || 'USD';
  const siteName = options.siteName || 'CoreCart';
  const productUrl = `${origin}/product/${product.id || ''}`;
  const priceNum = typeof product.price === 'string' ? parseFloat(product.price) || 0 : product.price;
  const isAvailable = product.in_stock !== false && (product.stock === undefined || product.stock > 0);

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image_url ? [product.image_url] : [],
    description: product.description || `Buy ${product.name} at ${siteName}. Premium quality and fast shipping.`,
    sku: product.sku || `SKU-${product.id || 'TECH'}`,
    brand: {
      '@type': 'Brand',
      name: product.brand || siteName
    },
    category: product.category || 'Electronics',
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: currency.replace(/[^A-Z]/g, '') || 'USD',
      price: priceNum.toFixed(2),
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: siteName
      }
    }
  };

  // Add AggregateRating if available
  if (product.rating && product.rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating).toFixed(1),
      bestRating: '5',
      worstRating: '1',
      reviewCount: product.reviews_count || 1
    };
  }

  return schema;
}

/**
 * Builds Schema.org ItemList / CollectionPage JSON-LD for category pages
 */
export function buildCategorySchema(
  category: CategorySEOData,
  options: {
    siteName?: string;
    siteUrl?: string;
  } = {}
): Record<string, any> {
  const origin = options.siteUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://corecart.com');
  const categoryUrl = `${origin}/?category=${encodeURIComponent(category.name)}`;
  const siteName = options.siteName || 'CoreCart';

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Collection | ${siteName}`,
    description: category.description || `Browse the latest ${category.name} at ${siteName}. Best prices, warranty, and fast shipping.`,
    url: categoryUrl,
    mainEntity: {
      '@type': 'ItemList',
      name: category.name,
      numberOfItems: category.itemCount || category.topProducts?.length || 0,
      itemListElement: (category.topProducts || []).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: p.name,
        url: `${origin}/product/${p.id}`,
        image: p.image_url
      }))
    }
  };

  return schema;
}

/**
 * Dynamic Product Meta Generator
 */
export function getProductMeta(
  product: ProductSEOData | null | undefined,
  options: {
    siteName?: string;
    siteUrl?: string;
    currencySymbol?: string;
    currencyCode?: string;
  } = {}
): DynamicSEOMeta {
  const siteName = options.siteName || 'CoreCart';
  const currencySymbol = options.currencySymbol || '$';
  const currencyCode = options.currencyCode || 'USD';
  const origin = options.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  if (!product) {
    return {
      title: `Product Not Found | ${siteName}`,
      description: `The requested product could not be located in our ${siteName} inventory.`,
      robots: 'noindex, follow'
    };
  }

  const priceNum = typeof product.price === 'string' ? parseFloat(product.price) || 0 : product.price;
  const formattedPrice = `${currencySymbol}${priceNum.toFixed(2)}`;
  const categoryTag = product.category ? ` - ${product.category}` : '';
  const title = `${product.name}${categoryTag} | Best Price ${formattedPrice} | ${siteName}`;

  // Clean description for snippet optimization (recommended 150-160 chars)
  let cleanDesc = product.description ? product.description.replace(/<[^>]*>?/gm, '').trim() : '';
  if (!cleanDesc) {
    cleanDesc = `Buy ${product.name} online at ${siteName}. Check latest price, features, specifications, and fast delivery options.`;
  } else if (cleanDesc.length > 160) {
    cleanDesc = cleanDesc.slice(0, 157).trim() + '...';
  }

  const productUrl = origin ? `${origin}/product/${product.id}` : '';
  const isAvailable = product.in_stock !== false && (product.stock === undefined || product.stock > 0);

  const keywords = [
    product.name,
    product.category || 'gadgets',
    'buy ' + product.name,
    product.name + ' price',
    product.name + ' specs',
    'online shopping',
    siteName
  ].filter(Boolean);

  const productSchema = buildProductSchema(product, {
    siteName,
    siteUrl: origin,
    currency: currencyCode
  });

  const breadcrumbsSchema = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    ...(product.category ? [{ name: product.category, url: `/?category=${encodeURIComponent(product.category)}` }] : []),
    { name: product.name, url: `/product/${product.id}` }
  ], origin);

  return {
    title,
    description: cleanDesc,
    keywords,
    canonicalUrl: productUrl,
    imageUrl: product.image_url,
    imageAlt: `${product.name} featured image`,
    type: 'product',
    robots: 'index, follow, max-image-preview:large',
    ogExtra: {
      'product:price:amount': priceNum.toFixed(2),
      'product:price:currency': currencyCode,
      'product:availability': isAvailable ? 'in stock' : 'out of stock',
      'product:category': product.category || 'Electronics'
    },
    jsonLd: [productSchema, breadcrumbsSchema]
  };
}

/**
 * Dynamic Category Meta Generator
 */
export function getCategoryMeta(
  categoryName: string,
  options: {
    siteName?: string;
    siteUrl?: string;
    productCount?: number;
    topProducts?: Array<{ id: string | number; name: string; price?: number | string; image_url?: string }>;
  } = {}
): DynamicSEOMeta {
  const siteName = options.siteName || 'CoreCart';
  const origin = options.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const cat = categoryName.trim();
  const countText = options.productCount ? ` (${options.productCount}+ items)` : '';

  const title = `${cat} Store${countText} - Latest Deals & Reviews | ${siteName}`;
  const description = `Shop authentic ${cat} at ${siteName}. Discover top-rated products, exclusive discounts, official warranty, and rapid doorstep delivery.`;
  const categoryUrl = origin ? `${origin}/?category=${encodeURIComponent(cat)}` : '';

  const keywords = [
    cat,
    `${cat} deals`,
    `best ${cat}`,
    `buy ${cat} online`,
    `${cat} price`,
    'tech accessories',
    siteName
  ];

  const categorySchema = buildCategorySchema({
    name: cat,
    description,
    itemCount: options.productCount,
    topProducts: options.topProducts
  }, {
    siteName,
    siteUrl: origin
  });

  const breadcrumbsSchema = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: cat, url: `/?category=${encodeURIComponent(cat)}` }
  ], origin);

  return {
    title,
    description,
    keywords,
    canonicalUrl: categoryUrl,
    imageUrl: options.topProducts?.[0]?.image_url,
    imageAlt: `${cat} collection at ${siteName}`,
    type: 'website',
    robots: 'index, follow, max-image-preview:large',
    jsonLd: [categorySchema, breadcrumbsSchema]
  };
}

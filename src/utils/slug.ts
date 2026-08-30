/**
 * Universal SEO-friendly URL Slug Generator
 * Handles English, Bengali, unicode strings, numbers, and cleans unwanted symbols.
 */

export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace accented characters (e.g., é -> e)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-alphanumeric chars (excluding Bengali and international unicode letters/numbers) with hyphens
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    // Replace spaces and underscores with a single hyphen
    .replace(/[\s_]+/g, '-')
    // Replace consecutive hyphens with a single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

export function formatProductUrl(product: { id: number | string; slug?: string }): string {
  if (product.slug && product.slug.trim()) {
    return `/product/${encodeURIComponent(product.slug.trim())}`;
  }
  return `/product/${product.id}`;
}

export function formatCategoryUrl(category: string): string {
  return `/?category=${encodeURIComponent(category)}#all-products`;
}

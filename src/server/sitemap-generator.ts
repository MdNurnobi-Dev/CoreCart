import * as fs from 'fs';
import * as path from 'path';
import { pool } from './db.js';

export async function generateSitemap() {
  try {
    const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || 'https://yoursite.com';
    
    let urls: string[] = [];
    
    // Add home page
    urls.push(`${baseUrl}/`);
    urls.push(`${baseUrl}/products`);
    
    // Fetch products
    try {
      const productsResult: any = await pool.query('SELECT slug FROM products WHERE slug IS NOT NULL');
      const products = productsResult.rows || productsResult; // Handle both pg and turso responses
      for (const p of products) {
        if (p.slug) urls.push(`${baseUrl}/product/${p.slug}`);
      }
    } catch (e) { console.error('Error fetching products for sitemap', e); }
    
    // Fetch categories
    try {
      const catResult: any = await pool.query('SELECT slug FROM categories WHERE slug IS NOT NULL');
      const cats = catResult.rows || catResult;
      for (const c of cats) {
        if (c.slug) urls.push(`${baseUrl}/category/${c.slug}`);
      }
    } catch (e) { console.error('Error fetching categories for sitemap', e); }

    // Fetch custom pages
    try {
      const pageResult: any = await pool.query('SELECT slug FROM custom_pages WHERE slug IS NOT NULL');
      const pages = pageResult.rows || pageResult;
      for (const page of pages) {
        if (page.slug) urls.push(`${baseUrl}/page/${page.slug}`);
      }
    } catch (e) { console.error('Error fetching custom pages for sitemap', e); }
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    const today = new Date().toISOString().split('T')[0];
    
    for (const url of urls) {
      xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    xml += `</urlset>`;

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
    
    const distDir = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml);
    }
    
    // Also configure robots.txt
    const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt);
    }
    
    console.log('[Sitemap] Generated sitemap.xml and robots.txt successfully.');
  } catch (err) {
    console.error('[Sitemap] Failed to generate:', err);
  }
}

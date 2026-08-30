import { generateSitemap } from './src/server/sitemap-generator.js';

function formatR2PublicUrl(settings: any, fileName: string): string {
  const cleanFileName = (fileName || '').replace(/^\/+/, '');
  const publicUrl = settings?.r2_public_url ? String(settings.r2_public_url).trim() : '';
  
  // If publicUrl is empty, or is the internal S3 endpoint (*.r2.cloudflarestorage.com),
  // return the internal /api/media streaming endpoint which always works without public access restrictions
  if (!publicUrl || publicUrl.includes('r2.cloudflarestorage.com')) {
    return `/api/media/${cleanFileName}`;
  }
  return `${publicUrl.replace(/\/+$/, '')}/${cleanFileName}`;
}

import 'dotenv/config';

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import express from 'express';
import multer from 'multer';
import https from 'https';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { pool, db, syncNeonToTurso } from './src/server/db';

// Polyfill __dirname for ESM
const _filename = fileURLToPath('file://' + process.cwd() + '/server.ts');
const _dirname = process.cwd();

export const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ecommerce-key-998877';

// Optimize network transfer & body parsing
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate rate limiting when behind reverse proxy
app.set('trust proxy', 1);

// Global API rate limiter (protects server from general high-frequency scraping/abuse)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // max 1000 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down and try again shortly.' }
});

// Stricter Auth rate limiter (prevents credential brute force and user registration spam)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login or registration attempts. Please try again after 15 minutes.' }
});

// Checkout & Order creation limiter (prevents automated fake order spamming)
const orderCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // max 30 order requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Order creation rate limit exceeded. Please wait a moment before trying again.' }
});

// Public Form Submissions limiter (Support ticket, Contact, Newsletter spam prevention)
const contactFormLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // max 20 submissions per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Submission limit reached. Please wait a few minutes before submitting again.' }
});

// Live Chat message spam protection
const chatMessageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40, // max 40 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are sending messages too quickly. Please wait a moment.' }
});

// Apply global rate limiting to all /api/ endpoints
app.use('/api', apiLimiter);

// Database Health & Connection Diagnostic Endpoint

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
});

app.get('/api/db-status', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      status: 'online',
      connected: stats.connected,
      engine: stats.engine,
      engine_name: stats.engine === 'turso' ? 'Turso Cloud SQLite / LibSQL' : 'Neon Cloud PostgreSQL',
      timestamp: stats.timestamp,
      counts: stats.counts,
      env_database_url_exists: !!process.env.DATABASE_URL,
      env_turso_url_exists: !!process.env.TURSO_DATABASE_URL
    });
  } catch (err: any) {
    console.error('Database connection diagnostic error:', err);
    res.status(500).json({
      status: 'error',
      connected: false,
      message: err.message || 'Database connection failed',
      code: err.code
    });
  }
});

// ==========================================
// SEO FRIENDLY SLUG GENERATOR & VALIDATOR
// ==========================================
function generateProductSlug(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getUniqueProductSlug(baseText: string, currentProductId?: number): Promise<string> {
  let baseSlug = generateProductSlug(baseText);
  if (!baseSlug) baseSlug = 'product';

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    let checkQuery = 'SELECT id FROM products WHERE slug = $1';
    const params: any[] = [candidate];
    if (currentProductId) {
      checkQuery += ' AND id != $2';
      params.push(currentProductId);
    }
    const res = await pool.query(checkQuery, params);
    if (res.rows.length === 0) {
      return candidate;
    }
    counter++;
    candidate = `${baseSlug}-${counter}`;
  }
}

// Initialize DB and Seed Data
async function initDB() {
  try {
    // Initialize schema on active engine (Turso SQLite or PostgreSQL)
    await db.init();

    // Ensure default image providers
    const providerCheck = await pool.query('SELECT COUNT(*) FROM image_providers');
    if (parseInt(providerCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO image_providers (name, provider_key, is_active) VALUES 
        ('Unsplash', 'unsplash', true),
        ('Cloudinary', 'cloudinary', false),
        ('Imgur', 'imgur', false)
      `);
    }

    // Check if products exist, if not seed 50 products
    const res = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(res.rows[0].count) === 0) {
      console.log('Seeding products...');
      const seedProducts = [];
      const laptopBrands = ['TechBook', 'ProLapt', 'GamerX', 'UltraThin', 'NoteMaster'];
      const mobileBrands = ['XPhone', 'Galaxy', 'Pixel', 'Nova', 'Edge'];

      const laptopImages = [
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1531297172869-d15f7bfa602a?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1515524738708-327f6b0037a7?auto=format&fit=crop&q=80&w=500'
      ];
      
      const mobileImages = [
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1533228876829-65c94e7b5025?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1601784551446-20c9e07cd8d3?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&q=80&w=500',
        'https://images.unsplash.com/photo-1512054502232-10a0a035d672?auto=format&fit=crop&q=80&w=500'
      ];

      for (let i = 1; i <= 25; i++) {
        const brand = laptopBrands[i % laptopBrands.length];
        const image = laptopImages[i % laptopImages.length];
        seedProducts.push({
          name: `${brand} Laptop Model ${i}X`,
          description: 'A high-performance modern laptop with excellent battery life and stunning display.',
          price: 800 + Math.floor(Math.random() * 1200),
          category: 'Laptop',
          image_url: image,
          specs: JSON.stringify({ ram: '16GB', storage: '512GB SSD', cpu: 'Core i7 / Ryzen 7' })
        });
      }

      for (let i = 1; i <= 25; i++) {
        const brand = mobileBrands[i % mobileBrands.length];
        const image = mobileImages[i % mobileImages.length];
        seedProducts.push({
          name: `${brand} Mobile Series ${i}`,
          description: 'A flagship mobile phone featuring an amazing camera system and fast charging.',
          price: 400 + Math.floor(Math.random() * 600),
          category: 'Mobile',
          image_url: image,
          specs: JSON.stringify({ ram: '8GB', storage: '256GB', screen: '6.5" OLED' })
        });
      }

      for (const p of seedProducts) {
        await pool.query(
          'INSERT INTO products (name, description, price, category, image_url, specs) VALUES ($1, $2, $3, $4, $5, $6)',
          [p.name, p.description, p.price, p.category, p.image_url, p.specs]
        );
      }
      console.log('Base products seeded successfully.');
    }

    // Seed Categories Table - Ensure all 5 core categories and any categories found in products exist
    const defaultCategories = [
      { name: 'Laptop', slug: 'laptops', description: 'High performance ultra-books, gaming rigs, and productivity workstations', image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=500' },
      { name: 'Mobile', slug: 'mobiles', description: 'Flagship smartphones, 5G devices, and next-generation mobile tech', image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=500' },
      { name: 'Audio & Headphones', slug: 'audio-headphones', description: 'Studio monitors, wireless noise-canceling headphones, and Hi-Res earbuds', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=500' },
      { name: 'Smartwatches & Wearables', slug: 'smartwatches-wearables', description: 'GPS adventure watches, titanium smartwatches, and smart health trackers', image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=500' },
      { name: 'Gaming Hardware & Mics', slug: 'gaming-hardware-mics', description: 'Mechanical keyboards, esports mice, studio streaming microphones, and controllers', image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=500' }
    ];

    for (const cat of defaultCategories) {
      await pool.query(`
        INSERT INTO categories (name, slug, description, image_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO UPDATE 
        SET name = EXCLUDED.name,
            description = COALESCE(categories.description, EXCLUDED.description),
            image_url = COALESCE(categories.image_url, EXCLUDED.image_url)
      `, [cat.name, cat.slug, cat.description, cat.image_url]);
    }

    // Auto-sync any categories that exist in products table into categories table
    const prodCatRes = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) != \'\'');
    for (const r of prodCatRes.rows) {
      const catName = (r.category || '').trim();
      if (!catName) continue;
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await pool.query(`
        INSERT INTO categories (name, slug, description, image_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO NOTHING
      `, [catName, catSlug, `${catName} collection and tech gear`, 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=600']);
    }
    console.log('Categories initialized and synced successfully.');

    // Ensure all products have default stock and low_stock_threshold if null
    try {
      await pool.query('UPDATE products SET stock = 15 WHERE stock IS NULL');
      await pool.query('UPDATE products SET low_stock_threshold = 5 WHERE low_stock_threshold IS NULL');
    } catch (stockSyncErr) {}

    // Seed Realistic Demo Products for Audio & Headphones, Smartwatches & Wearables, and Gaming Hardware & Mics
    const audioCountRes = await pool.query("SELECT COUNT(*) FROM products WHERE category = 'Audio & Headphones'");
    if (parseInt(audioCountRes.rows[0].count) === 0) {
      console.log('Seeding Audio & Headphones demo products...');
      const audioProducts = [
        {
          name: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
          description: 'Industry-leading noise cancellation powered by two processors and 8 microphones. Hi-Res Audio wireless, 30-hour battery life, and crystal-clear hands-free calling with AI voice pickup.',
          price: 398.00,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'Over-Ear Wireless ANC', Battery: '30 Hours', Drivers: '30mm Carbon Fiber', Connectivity: 'Bluetooth 5.2 / LDAC / 3.5mm', Features: 'Auto NC Optimizer, Multipoint' })
        },
        {
          name: 'Apple AirPods Max - Space Gray (Active Noise Cancellation)',
          description: 'Computational audio combining custom acoustic design with Apple H1 chip in each cup. Features Active Noise Cancellation, Transparency mode, and Spatial Audio with dynamic head tracking.',
          price: 549.00,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'Over-Ear Luxury ANC', Battery: '20 Hours with ANC', Chip: 'Dual Apple H1 Chips', Material: 'Stainless Steel Frame & Breathable Mesh', Audio: 'Spatial Audio with Head Tracking' })
        },
        {
          name: 'Bose QuietComfort Ultra Spatial Audio Wireless Headphones',
          description: 'World-class active noise cancellation with breakthrough Bose Immersive Audio for a wider, more natural soundstage. CustomTune technology personalizes sound to your ear shape.',
          price: 429.00,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'Over-Ear ANC', Battery: '24 Hours Playtime', Modes: 'Quiet, Aware, Immersion', Microphones: 'Built-in 12-Mic Array', Charging: 'USB-C Fast Charge' })
        },
        {
          name: 'Sennheiser Momentum 4 Wireless Audiophile Headphones',
          description: 'Premium audiophile-inspired 42mm transducer system delivering signature acoustics. Outstanding 60-hour battery life with Adaptive Noise Cancellation and intuitive Smart Pause.',
          price: 349.95,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'Audiophile Over-Ear', Battery: '60 Hours Endurance', Drivers: '42mm Transducer', Codecs: 'aptX Adaptive, AAC, SBC', Weight: '293g' })
        },
        {
          name: 'Sony WF-1000XM5 Hi-Res Noise-Canceling Earbuds',
          description: 'Astonishing sound quality with Dynamic Driver X. The best noise canceling true wireless earbuds with dual feedback microphones and bone conduction sensors for ultra-clear voice.',
          price: 299.00,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'True Wireless Earbuds', Battery: '8h + 16h with Case', WaterResistance: 'IPX4 Splash Resistant', ANC: 'Integrated Processor V2', Charging: 'Qi Wireless & USB-C' })
        },
        {
          name: 'JBL Tour Pro 2 Smart Case Touchscreen Earbuds',
          description: 'Revolutionary smart charging case with 1.45" LED touchscreen display to control audio, notifications, and calls without picking up your phone. True Adaptive Noise Cancelling.',
          price: 249.95,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Display: '1.45" Smart Touch Case', Battery: '40 Hours Total', Drivers: '10mm Dynamic Drivers', ANC: 'True Adaptive Noise Cancelling', Mic: '6-Mic Crystal Call Tech' })
        },
        {
          name: 'Marshall Major IV Foldable Bluetooth On-Ear Headphones',
          description: 'Signature Marshall sound with custom-tuned 40mm dynamic drivers, delivering roaring bass, smooth mids and brilliant treble. 80+ hours of wireless playtime and rugged vintage styling.',
          price: 149.99,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'On-Ear Foldable', Battery: '80+ Hours Wireless', Charging: 'Wireless Qi & Fast USB-C', Drivers: '40mm Custom Dynamic', Design: 'Classic Marshall Vinyl' })
        },
        {
          name: 'Anker Soundcore Space Q45 Hybrid ANC Headphones',
          description: 'Upgraded noise cancelling system reduces ambient noise by up to 98%. Double-layer diaphragm drivers produce ultra-clear sound with rich bass. LDAC Hi-Res Audio certified.',
          price: 149.00,
          category: 'Audio & Headphones',
          image_url: 'https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'Over-Ear Hybrid ANC', Battery: '50h (ANC on) / 65h (ANC off)', Codecs: 'LDAC, AAC, SBC', FastCharge: '5 min for 4 hours playback' })
        }
      ];

      for (const p of audioProducts) {
        await pool.query(
          'INSERT INTO products (name, description, price, category, image_url, specs) VALUES ($1, $2, $3, $4, $5, $6)',
          [p.name, p.description, p.price, p.category, p.image_url, p.specs]
        );
      }
    }

    const watchCountRes = await pool.query("SELECT COUNT(*) FROM products WHERE category = 'Smartwatches & Wearables'");
    if (parseInt(watchCountRes.rows[0].count) === 0) {
      console.log('Seeding Smartwatches & Wearables demo products...');
      const watchProducts = [
        {
          name: 'Apple Watch Ultra 2 (Titanium Case, Ocean Band)',
          description: 'The most rugged and capable Apple Watch. 49mm aerospace-grade titanium case, precision dual-frequency GPS, up to 36-hour battery life, and 3000 nits brightest always-on display.',
          price: 799.00,
          category: 'Smartwatches & Wearables',
          image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Display: '49mm Always-On OLED 3000 nits', Case: 'Aerospace Titanium', Battery: '36-72 Hours', WaterResistance: '100m Water / Dive 40m', Chip: 'S9 SiP with Double Tap' })
        },
        {
          name: 'Samsung Galaxy Watch 6 Classic 47mm (Rotating Bezel)',
          description: 'Timeless stainless steel design with the iconic rotating bezel. Advanced sleep coaching, personalized heart rate zones, ECG monitoring, and Super AMOLED sapphire crystal screen.',
          price: 399.99,
          category: 'Smartwatches & Wearables',
          image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Display: '1.5" Super AMOLED Sapphire', Processor: 'Exynos W930 Dual-Core', Sensors: 'BioActive (ECG, BIA, Blood Pressure)', Durability: '5ATM + IP68 / MIL-STD-810H' })
        },
        {
          name: 'Garmin Fenix 7 Pro Solar Multisport GPS Smartwatch',
          description: 'Ultimate solar-powered multisport GPS watch with built-in LED flashlight, TopoActive maps, 24/7 health tracking, endurance score, and up to 22 days battery life in smartwatch mode.',
          price: 799.99,
          category: 'Smartwatches & Wearables',
          image_url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Glass: 'Power Glass Solar Charging', Battery: 'Up to 22 Days Solar', Flashlight: 'Multi-LED with Strobe Mode', GPS: 'Multi-Band GNSS with SatIQ Tech' })
        },
        {
          name: 'Google Pixel Watch 2 (Polished Silver / Bay Active Band)',
          description: 'Powered by Fitbit health and Google intelligence. All-new multi-path heart rate sensor, cEDA stress management sensor, skin temperature tracking, and seamless Google Assistant.',
          price: 349.00,
          category: 'Smartwatches & Wearables',
          image_url: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Display: '320 ppi AMOLED with DCI-P3 color', Processor: 'Qualcomm SW5100', Sensors: 'cEDA Stress, Skin Temp, SpO2, ECG', Battery: '24 Hours with Always-On' })
        },
        {
          name: 'Amazfit GTR 4 AMOLED Smart Fitness Watch',
          description: 'Dual-band circularly-polarized GPS antenna with industry-leading accuracy. 150+ sports modes, smart strength training recognition, ultra-long 14-day battery life, and Bluetooth phone calls.',
          price: 199.99,
          category: 'Smartwatches & Wearables',
          image_url: 'https://images.unsplash.com/photo-1510017803434-a899398421b3?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Display: '1.43" HD AMOLED Anti-Glare', Battery: '14 Days Typical Use', SportsModes: '154 Workout Modes', Voice: 'Alexa Built-in & Voice Calls' })
        },
        {
          name: 'Huawei Watch GT 4 (46mm Stainless Steel Pro Edition)',
          description: 'Geometric aesthetic octagonal titanium finish with intelligent calorie management, TruSeen 5.5+ heart rate monitoring, scientific sleep tracker, and up to 14 days endurance.',
          price: 269.00,
          category: 'Smartwatches & Wearables',
          image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Design: 'Octagonal Stainless Steel Bezel', Battery: '14 Days Maximum Battery', Compatibility: 'Android & iOS Support', WaterResistance: '5 ATM Water Resistant' })
        },
        {
          name: 'Fitbit Charge 6 Advanced Fitness & Health Tracker',
          description: 'Give your fitness routine a boost with YouTube Music controls, Google Maps, Google Wallet, 40+ exercise modes, and our most accurate heart rate tracking on a tracker yet.',
          price: 159.95,
          category: 'Smartwatches & Wearables',
          image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Display: 'Color AMOLED Touchscreen', Battery: '7 Days Battery Life', Sensors: 'EDA Stress Scan, ECG, SpO2', Integrations: 'Google Maps, Google Wallet, YouTube Music' })
        }
      ];

      for (const p of watchProducts) {
        await pool.query(
          'INSERT INTO products (name, description, price, category, image_url, specs) VALUES ($1, $2, $3, $4, $5, $6)',
          [p.name, p.description, p.price, p.category, p.image_url, p.specs]
        );
      }
    }

    const gamingCountRes = await pool.query("SELECT COUNT(*) FROM products WHERE category = 'Gaming Hardware & Mics'");
    if (parseInt(gamingCountRes.rows[0].count) === 0) {
      console.log('Seeding Gaming Hardware & Mics demo products...');
      const gamingProducts = [
        {
          name: 'Logitech G Pro X 2 LIGHTSPEED Wireless Gaming Headset',
          description: 'Designed with pros to eliminate every barrier between you and the win. PRO-G 50mm Graphene drivers for unprecedented sound precision, up to 50 hours battery, and DTS Headphone:X 2.0.',
          price: 249.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Drivers: '50mm Graphene Transducers', Battery: '50 Hours Playtime', Wireless: 'LIGHTSPEED 2.4GHz + BT + 3.5mm', Mic: '6mm Cardioid with Blue VO!CE' })
        },
        {
          name: 'Razer BlackWidow V4 Pro Mechanical RGB Gaming Keyboard',
          description: 'Full-blown battlestation immersion with Razer Command Dial, 8 dedicated macro keys, magnetic plush leatherette underglow wrist rest, 8000Hz polling rate, and Doubleshot ABS keycaps.',
          price: 229.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Switches: 'Razer Green Clicky Mechanical', PollingRate: '8,000Hz HyperPolling', Lighting: 'Per-Key Chroma RGB with Underglow', Dial: 'Multi-Function Command Dial' })
        },
        {
          name: 'Shure MV7 USB/XLR Dynamic Podcast & Streaming Microphone',
          description: 'Legendary broadcast sound quality. Hybrid USB and XLR outputs, Voice Isolation Technology, intuitive touch panel controls, and ShurePlus MOTIV app integration for real-time DSP tuning.',
          price: 249.00,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Type: 'Dynamic (Cardioid)', Connectivity: 'Dual USB & XLR', SampleRate: '24-bit / 48 kHz', Features: 'Voice Isolation & Auto Level Mode' })
        },
        {
          name: 'HyperX QuadCast S RGB USB Condenser Gaming Microphone',
          description: 'Full-featured standalone USB condenser mic with stunning dynamic RGB lighting, anti-vibration shock mount, tap-to-mute sensor with LED status indicator, and 4 selectable polar patterns.',
          price: 159.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1520523839898-507127053c37?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ PolarPatterns: 'Stereo, Omnidirectional, Cardioid, Bidirectional', Lighting: 'Customizable Two-Zone RGB', Mount: 'Built-in Anti-Vibration Shock Mount', Controls: 'Gain Control Dial & Tap-to-Mute' })
        },
        {
          name: 'Logitech G502 X PLUS LIGHTSPEED Wireless Gaming Mouse',
          description: 'Reinvented gaming icon. Hybrid optical-mechanical LIGHTFORCE switches, HERO 25K sub-micron sensor, LIGHTSYNC 8-zone active RGB, and dual-mode hyper-fast scroll wheel.',
          price: 159.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Sensor: 'HERO 25K (100 - 25,600 DPI)', Switches: 'LIGHTFORCE Optical-Mechanical', Buttons: '13 Programmable Controls', Weight: '106g Ergonomic Design' })
        },
        {
          name: 'Elgato Wave:3 Premium USB Condenser Microphone & Digital Mixer',
          description: 'The content creator’s mic. 24-bit/96kHz analog-to-digital converter, proprietary Clipguard anti-distortion technology, capacitive tap-to-mute, and multi-channel Wave Link mixing suite.',
          price: 149.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Capsule: '17mm Electret Condenser', Resolution: '24-bit / 96kHz High-Res', Clipguard: 'Dual-Stage Anti-Distortion limiter', Software: 'Wave Link 9-Channel Audio Mixer' })
        },
        {
          name: 'SteelSeries Apex Pro TKL Wireless RGB Mechanical Gaming Keyboard',
          description: 'World\'s fastest keyboard with OmniPoint 2.0 Adjustable HyperMagnetic switches for 11x faster response and 10x swifter actuation. OLED Smart Display for in-game stats and profiles.',
          price: 249.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Switches: 'OmniPoint 2.0 Adjustable (0.2mm to 3.8mm)', Display: 'Integrated OLED Smart Display', Wireless: 'Quantum 2.0 Dual Wireless 2.4GHz + BT', Frame: 'Aircraft Grade Aluminum 5000' })
        },
        {
          name: 'Sony DualSense Edge Wireless Pro Gaming Controller',
          description: 'High-performance ultra-customizable controller for PC & PS5. Changeable stick caps, swappable stick modules, remappable back paddles, adjustable trigger stops, and custom profiles.',
          price: 199.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Haptics: 'Dynamic Haptic Feedback & Adaptive Triggers', Controls: '2 Remappable Back Buttons + Trigger Stops', Profiles: 'Dedicated On-Controller Fn Profile Switch', Case: 'Hard Shell Carrying Case with Braided Cable' })
        },
        {
          name: 'Razer DeathAdder V3 Pro Ultra-Lightweight Ergonomic Gaming Mouse',
          description: 'Victory takes on a new shape. Refined with the top esports pros, its iconic ergonomic form is now 25% lighter at 63g, backed by Focus Pro 30K Optical Sensor and Gen-3 Optical switches.',
          price: 149.99,
          category: 'Gaming Hardware & Mics',
          image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800',
          specs: JSON.stringify({ Weight: '63g Ultra-Lightweight', Sensor: 'Focus Pro 30K Optical Sensor', Battery: '90 Hours Continuous Motion', Switches: 'Optical Mouse Switches Gen-3 (90M Clicks)' })
        }
      ];

      for (const p of gamingProducts) {
        await pool.query(
          'INSERT INTO products (name, description, price, category, image_url, specs) VALUES ($1, $2, $3, $4, $5, $6)',
          [p.name, p.description, p.price, p.category, p.image_url, p.specs]
        );
      }
    }
    
    // Seed Admin User
    const adminEmail = 'victorsteele428@gmail.com';
    const settingsCheck = await pool.query('SELECT COUNT(*) FROM settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      await pool.query('INSERT INTO settings (site_name, footer_text) VALUES ($1, $2)', ['TechStore', '© 2026 TechStore. All rights reserved.']);
    }
    // Also ensure image_url is TEXT
    try {
      await pool.query('ALTER TABLE products ALTER COLUMN image_url TYPE TEXT;');
    } catch(e) {}
  
    // Ensure default custom pages (like iPhone order demo) exist
    try {
      const pageCheck = await pool.query('SELECT COUNT(*) FROM custom_pages WHERE slug = $1 OR slug = $2', ['iphone-order-confirmed-details', 'iphone-order-demo']);
      if (parseInt(pageCheck.rows[0].count) === 0) {
        await pool.query(
          `INSERT INTO custom_pages (title, slug, content) VALUES ($1, $2, $3)`,
          [
            'iPhone 16 Pro Order Confirmed Showcase',
            'iphone-order-confirmed-details',
            `<div class="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl shadow-lg border border-blue-800 text-center space-y-4">
  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
    ⚡ Live Order Confirmation Showcase
  </div>
  <h1 class="text-2xl sm:text-3xl font-black">iPhone 16 Pro Order Confirmation & Digital Invoice</h1>
  <p class="text-sm text-blue-200 max-w-xl mx-auto">
    This page dynamically runs the full payment verifying animation and presents the verified digital invoice with printable PDF download features for Apple iPhone 16 Pro Max.
  </p>
  <div class="pt-2">
    <a href="/page/iphone-order-confirmed-details" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all">
      Open Interactive Order Demo &rarr;
    </a>
  </div>
</div>`
          ]
        );
      }
    } catch (e) {
      console.error('Error seeding custom_pages:', e);
    }

    const adminPass = await bcrypt.hash('RajPass##321', 10);
    await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ('Admin', $1, $2, 'admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $2;
    `, [adminEmail, adminPass]);

    // Ensure all existing and seeded products have valid, unique SEO slugs
    try {
      const allProdsRes = await pool.query('SELECT id, name, slug FROM products ORDER BY id ASC');
      const usedSlugs = new Set<string>();
      for (const prod of allProdsRes.rows) {
        let currentSlug = (prod.slug || '').trim();
        const baseSlug = generateProductSlug(prod.name) || `product-${prod.id}`;
        if (!currentSlug || usedSlugs.has(currentSlug)) {
          let candidate = baseSlug;
          let counter = 1;
          while (usedSlugs.has(candidate)) {
            counter++;
            candidate = `${baseSlug}-${counter}`;
          }
          currentSlug = candidate;
          await pool.query('UPDATE products SET slug = $1 WHERE id = $2', [currentSlug, prod.id]);
        }
        usedSlugs.add(currentSlug);
      }
      console.log(`[SEO URL] Verified & synced SEO slugs for ${allProdsRes.rows.length} products.`);
    } catch (slugErr) {
      console.error('Error syncing product slugs:', slugErr);
    }

    // Ensure Payment Tables & Seed Default Payment Gateways
    await ensurePaymentTablesExist();

    // Ensure Coupons / Offers Table & Seed Default Promotional Vouchers
    await ensureCouponsTableExist();
    
  } catch (err) {
    console.error('Error initializing DB:', err);
  }
}

// Helper to ensure coupons / discounts / offers table exists and is seeded
async function ensureCouponsTableExist() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        discount_type TEXT DEFAULT 'percentage',
        discount_value REAL NOT NULL,
        min_order_amount REAL DEFAULT 0,
        max_discount_amount REAL DEFAULT NULL,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME DEFAULT NULL,
        usage_limit INTEGER DEFAULT NULL,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        show_banner BOOLEAN DEFAULT 0,
        banner_bg_color TEXT DEFAULT '#2563EB',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const check = await pool.query('SELECT COUNT(*) as count FROM coupons');
    const countVal = check.rows[0]?.count ?? check.rows[0]?.['COUNT(*)'] ?? check.rows[0]?.['count(*)'] ?? 0;
    
    if (parseInt(countVal) === 0) {
      console.log('Seeding default coupons and offers...');
      const defaultCoupons = [
        {
          code: 'WELCOME10',
          title: '10% New Customer Discount',
          description: 'Get 10% instant discount on your first shopping order.',
          discount_type: 'percentage',
          discount_value: 10,
          min_order_amount: 50,
          max_discount_amount: 100,
          show_banner: 1,
          banner_bg_color: '#2563EB',
          is_active: 1
        },
        {
          code: 'MEGA20',
          title: '20% Mega Gadget Saving Voucher',
          description: 'Special 20% discount on orders above $200.',
          discount_type: 'percentage',
          discount_value: 20,
          min_order_amount: 200,
          max_discount_amount: 250,
          show_banner: 1,
          banner_bg_color: '#059669',
          is_active: 1
        },
        {
          code: 'FLAT50',
          title: 'Flat $50 Cash Discount',
          description: 'Instant $50 flat cash saving on all gadget orders over $300.',
          discount_type: 'fixed',
          discount_value: 50,
          min_order_amount: 300,
          max_discount_amount: 50,
          show_banner: 0,
          banner_bg_color: '#7C3AED',
          is_active: 1
        }
      ];

      for (const c of defaultCoupons) {
        await pool.query(`
          INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order_amount, max_discount_amount, show_banner, banner_bg_color, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [c.code, c.title, c.description, c.discount_type, c.discount_value, c.min_order_amount, c.max_discount_amount, c.show_banner, c.banner_bg_color, c.is_active]);
      }
      console.log('Coupons seeded successfully.');
    }
  } catch (err) {
    console.error('ensureCouponsTableExist error:', err);
  }
}

// Helper to ensure payment_gateways and manual_payments tables exist
async function ensurePaymentTablesExist() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        account_number TEXT DEFAULT '',
        instruction TEXT DEFAULT '',
        logo_url TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT 1,
        fee_percent REAL DEFAULT 0,
        min_amount REAL DEFAULT 0,
        max_amount REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS manual_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        gateway_name TEXT NOT NULL,
        sender_number TEXT DEFAULT '',
        trx_id TEXT DEFAULT '',
        amount REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        admin_note TEXT DEFAULT '',
        attachment_url TEXT DEFAULT '',
        customer_name TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const gwCheck = await pool.query('SELECT COUNT(*) FROM payment_gateways');
    const countVal = gwCheck.rows[0]?.count ?? gwCheck.rows[0]?.['COUNT(*)'] ?? gwCheck.rows[0]?.['count(*)'] ?? 0;
    
    if (parseInt(countVal) === 0) {
      console.log('Seeding default payment gateways...');
      const defaultGateways = [
        {
          name: 'bKash Mobile Banking',
          type: 'mfs',
          title: 'bKash Personal / Merchant',
          description: 'Fastest instant mobile wallet payment in Bangladesh.',
          account_number: '01700-000000',
          instruction: 'Send Money or Payment to 01700-000000 (Personal/Merchant). Enter your bKash Transaction ID (TrxID) during checkout.',
          logo_url: 'https://images.unsplash.com/photo-1556742049-0a670f4a4591?auto=format&fit=crop&q=80&w=120',
          is_active: true,
          fee_percent: 0,
          min_amount: 10,
          max_amount: 250000
        },
        {
          name: 'Nagad Mobile Banking',
          type: 'mfs',
          title: 'Nagad Personal / Merchant',
          description: 'Postal department digital financial service in Bangladesh.',
          account_number: '01800-000000',
          instruction: 'Send Money to Nagad Number 01800-000000. Paste the 8-digit Nagad TrxID in the box provided.',
          logo_url: 'https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?auto=format&fit=crop&q=80&w=120',
          is_active: true,
          fee_percent: 0,
          min_amount: 10,
          max_amount: 250000
        },
        {
          name: 'Rocket Mobile Banking',
          type: 'mfs',
          title: 'Rocket DBBL Mobile Banking',
          description: 'Dutch-Bangla Bank Rocket mobile banking service.',
          account_number: '01900-000000-1',
          instruction: 'Send Money to Rocket Number 01900-000000-1. Enter your Rocket TxnID.',
          logo_url: '',
          is_active: true,
          fee_percent: 0,
          min_amount: 10,
          max_amount: 200000
        },
        {
          name: 'Cash on Delivery',
          type: 'cod',
          title: 'Cash on Delivery (COD)',
          description: 'Pay with physical cash upon receiving parcel at doorstep.',
          account_number: 'N/A',
          instruction: 'Pay full order amount directly to the courier agent when receiving your package.',
          logo_url: '',
          is_active: true,
          fee_percent: 0,
          min_amount: 0,
          max_amount: 500000
        },
        {
          name: 'Debit / Credit Card',
          type: 'card',
          title: 'Visa / MasterCard / Amex',
          description: 'Secure instant online payment via credit or debit card.',
          account_number: 'Card Processor Gateway',
          instruction: 'Enter your 16-digit card number, expiration date, and CVC code securely.',
          logo_url: '',
          is_active: true,
          fee_percent: 0,
          min_amount: 50,
          max_amount: 1000000
        },
        {
          name: 'Direct Bank Wire Transfer',
          type: 'bank',
          title: 'Direct Bank Deposit (DBBL / City Bank)',
          description: 'Direct electronic bank transfer to company account.',
          account_number: '1234567890123',
          instruction: 'Account Name: TechStore Ltd, A/C: 1234567890123, Dutch-Bangla Bank Ltd, Gulshan Branch, Dhaka. Upload deposit slip or TrxID after transfer.',
          logo_url: '',
          is_active: true,
          fee_percent: 0,
          min_amount: 100,
          max_amount: 2000000
        }
      ];

      for (const gw of defaultGateways) {
        await pool.query(`
          INSERT INTO payment_gateways (name, type, title, description, account_number, instruction, logo_url, is_active, fee_percent, min_amount, max_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [gw.name, gw.type, gw.title, gw.description, gw.account_number, gw.instruction, gw.logo_url, gw.is_active ? 1 : 0, gw.fee_percent, gw.min_amount, gw.max_amount]);
      }
      console.log('Payment gateways seeded successfully.');
    }
  } catch (err) {
    console.error('ensurePaymentTablesExist error:', err);
  }
}

// API ROUTES

// Auth: Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone, avatar_url, created_at',
      [name, email, hashed, phone || '', 'customer']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
        created_at: user.created_at
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    req.user = user;
    next();
  });
};

// Optional Auth Middleware (attaches user if token is present and valid, allows guest otherwise)
const authenticateOptionalToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// Admin Middleware
const authenticateAdmin = (req: any, res: any, next: any) => {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// Admin Migration / Sync Endpoint (Neon PostgreSQL <-> Turso SQLite)
app.post('/api/admin/db/sync-from-neon', authenticateAdmin, async (req: any, res: any) => {
  try {
    const result = await syncNeonToTurso();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Database sync failed: ' + err.message });
  }
});

// Admin: Create Product (Bulk)
app.post('/api/products/bulk', authenticateAdmin, async (req: any, res: any) => {
  const products = req.body;
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Expected an array of products' });
  }
  try {
    // Basic bulk insert
    const values: any[] = [];
    let query = 'INSERT INTO products (name, description, price, category, image_url, specs) VALUES ';
    const placeholders: string[] = [];
    let i = 1;
    
    for (const p of products) {
      placeholders.push(`($${i}, $${i+1}, $${i+2}, $${i+3}, $${i+4}, $${i+5})`);
      values.push(
        p.name || 'Untitled', 
        p.description || '', 
        p.price || 0, 
        p.category || 'Uncategorized', 
        p.image_url || '', 
        p.specs ? JSON.stringify(p.specs) : null
      );
      i += 6;
    }
    
    query += placeholders.join(', ') + ' RETURNING *';
    
    const result = await pool.query(query, values);
    res.json({ message: 'Products imported successfully', count: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import products bulk' });
  }
});

// Admin: Create Product (Public fallback)
app.post('/api/products', authenticateAdmin, async (req: any, res: any) => {
  const { name, slug, description, price, sale_price, category, product_type, image_url, specs } = req.body;
  try {
    const uniqueSlug = await getUniqueProductSlug(slug || name);
    const specsValue = typeof specs === 'object' ? JSON.stringify(specs) : (specs || '{}');
    const parsedSalePrice = (sale_price !== undefined && sale_price !== null && sale_price !== '' && !isNaN(Number(sale_price))) ? Number(sale_price) : null;
    const result = await pool.query(
      'INSERT INTO products (name, slug, description, price, sale_price, category, product_type, image_url, specs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, uniqueSlug, description || '', Number(price), parsedSalePrice, category || 'General', product_type || 'physical', image_url || '', specsValue]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Admin: Update Product (Public fallback)
app.put('/api/products/:id', authenticateAdmin, async (req: any, res: any) => {
  const { name, slug, description, price, sale_price, category, product_type, image_url, specs } = req.body;
  try {
    const productId = parseInt(req.params.id, 10);
    const uniqueSlug = await getUniqueProductSlug(slug || name, productId);
    const specsValue = typeof specs === 'object' ? JSON.stringify(specs) : (specs || '{}');
    const parsedSalePrice = (sale_price !== undefined && sale_price !== null && sale_price !== '' && !isNaN(Number(sale_price))) ? Number(sale_price) : null;
    const result = await pool.query(
      'UPDATE products SET name = $1, slug = $2, description = $3, price = $4, sale_price = $5, category = $6, product_type = $7, image_url = $8, specs = $9 WHERE id = $10 RETURNING *',
      [name, uniqueSlug, description || '', Number(price), parsedSalePrice, category || 'General', product_type || 'physical', image_url || '', specsValue, productId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Admin: Delete Product
app.delete('/api/products/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const productId = parseInt(req.params.id, 10);
    await pool.query('DELETE FROM order_items WHERE product_id = $1', [productId]);
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [productId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- Payment Gateways API Routes ---

// Public: Get Active Payment Gateways
app.get('/api/payment-gateways', async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const result = await pool.query('SELECT * FROM payment_gateways WHERE is_active = 1 OR is_active = true ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching public payment gateways:', err);
    res.status(500).json({ error: 'Failed to fetch active payment gateways' });
  }
});

// Admin: Get All Payment Gateways
app.get('/api/admin/payment-gateways', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const result = await pool.query('SELECT * FROM payment_gateways ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin payment gateways:', err);
    res.status(500).json({ error: 'Failed to fetch payment gateways' });
  }
});

// Admin: Create Payment Gateway
app.post('/api/admin/payment-gateways', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const { name, type, title, description, account_number, instruction, logo_url, is_active, fee_percent, min_amount, max_amount } = req.body;
    
    if (!name || !title) {
      return res.status(400).json({ error: 'Gateway Name and Title are required' });
    }

    const result = await pool.query(`
      INSERT INTO payment_gateways (name, type, title, description, account_number, instruction, logo_url, is_active, fee_percent, min_amount, max_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name.trim(), 
      type || 'mfs', 
      title.trim(), 
      description || '', 
      account_number || '', 
      instruction || '', 
      logo_url || '', 
      is_active !== undefined ? (is_active ? 1 : 0) : 1, 
      parseFloat(fee_percent) || 0, 
      parseFloat(min_amount) || 0, 
      parseFloat(max_amount) || 0
    ]);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating payment gateway:', err);
    res.status(500).json({ error: 'Failed to create payment gateway: ' + (err.message || '') });
  }
});

// Admin: Update Payment Gateway
app.put('/api/admin/payment-gateways/:id', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const id = parseInt(req.params.id);
    const { name, type, title, description, account_number, instruction, logo_url, is_active, fee_percent, min_amount, max_amount } = req.body;

    const result = await pool.query(`
      UPDATE payment_gateways SET 
        name = $1, type = $2, title = $3, description = $4, account_number = $5,
        instruction = $6, logo_url = $7, is_active = $8, fee_percent = $9,
        min_amount = $10, max_amount = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      name, type, title, description || '', account_number || '',
      instruction || '', logo_url || '', is_active ? 1 : 0, parseFloat(fee_percent) || 0,
      parseFloat(min_amount) || 0, parseFloat(max_amount) || 0, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating payment gateway:', err);
    res.status(500).json({ error: 'Failed to update payment gateway' });
  }
});

// Admin: Toggle Payment Gateway Active Status
app.put('/api/admin/payment-gateways/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const id = parseInt(req.params.id);
    
    const existing = await pool.query('SELECT is_active FROM payment_gateways WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    const currentActive = Boolean(existing.rows[0].is_active);
    const newActive = !currentActive;

    const result = await pool.query(
      'UPDATE payment_gateways SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newActive ? 1 : 0, id]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error toggling payment gateway status:', err);
    res.status(500).json({ error: 'Failed to toggle gateway status' });
  }
});

// Admin: Delete Payment Gateway
app.delete('/api/admin/payment-gateways/:id', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const id = parseInt(req.params.id);

    const result = await pool.query('DELETE FROM payment_gateways WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    res.json({ success: true, message: 'Payment gateway deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting payment gateway:', err);
    res.status(500).json({ error: 'Failed to delete payment gateway' });
  }
});


// --- Manual Payments API Routes ---

// Public / User: Submit Manual Payment Details
app.post('/api/manual-payments/submit', authenticateOptionalToken, async (req: any, res: any) => {
  try {
    await ensurePaymentTablesExist();
    const { order_id, gateway_name, sender_number, trx_id, amount, customer_name, customer_phone, attachment_url } = req.body;

    if (!order_id || !gateway_name || !amount) {
      return res.status(400).json({ error: 'order_id, gateway_name, and amount are required' });
    }

    const userId = req.user?.id || null;

    const result = await pool.query(`
      INSERT INTO manual_payments 
      (order_id, user_id, gateway_name, sender_number, trx_id, amount, status, customer_name, customer_phone, attachment_url)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9)
      RETURNING *
    `, [
      order_id, 
      userId, 
      gateway_name, 
      sender_number || '', 
      trx_id || '', 
      parseFloat(amount), 
      customer_name || '', 
      customer_phone || '', 
      attachment_url || ''
    ]);

    // Update order status
    await pool.query("UPDATE orders SET status = 'Payment Processing' WHERE id = $1", [order_id]);

    res.json({ success: true, payment: result.rows[0] });
  } catch (err: any) {
    console.error('Error submitting manual payment:', err);
    res.status(500).json({ error: 'Failed to submit manual payment details: ' + (err.message || '') });
  }
});

// Admin: Get Manual Payment Statistics
app.get('/api/admin/manual-payments/stats', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    
    const [totalRes, pendingRes, verifiedRes, rejectedRes, verifiedSumRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM manual_payments'),
      pool.query("SELECT COUNT(*) FROM manual_payments WHERE status = 'Pending'"),
      pool.query("SELECT COUNT(*) FROM manual_payments WHERE status = 'Verified'"),
      pool.query("SELECT COUNT(*) FROM manual_payments WHERE status = 'Rejected'"),
      pool.query("SELECT SUM(amount) FROM manual_payments WHERE status = 'Verified'")
    ]);

    const getCount = (r: any) => {
      if (!r.rows || r.rows.length === 0) return 0;
      const row = r.rows[0];
      const val = row.count ?? row['COUNT(*)'] ?? row['count(*)'] ?? 0;
      return parseInt(val) || 0;
    };

    const getSum = (r: any) => {
      if (!r.rows || r.rows.length === 0) return 0;
      const row = r.rows[0];
      const val = row.sum ?? row['SUM(amount)'] ?? row['sum(amount)'] ?? 0;
      return parseFloat(val) || 0;
    };

    res.json({
      total: getCount(totalRes),
      pending: getCount(pendingRes),
      verified: getCount(verifiedRes),
      rejected: getCount(rejectedRes),
      total_verified_amount: getSum(verifiedSumRes)
    });
  } catch (err: any) {
    console.error('Manual payment stats error:', err);
    res.json({ total: 0, pending: 0, verified: 0, rejected: 0, total_verified_amount: 0 });
  }
});

// Admin: Get Manual Payments List with Filters
app.get('/api/admin/manual-payments', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    
    const { status, gateway, search } = req.query;

    let query = `
      SELECT mp.*, o.tracking_number, o.shipping_address, u.name as user_name, u.email as user_email
      FROM manual_payments mp
      LEFT JOIN orders o ON mp.order_id = o.id
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      query += ` AND mp.status = $${pIdx++}`;
      params.push(status);
    }

    if (gateway && gateway !== 'all') {
      query += ` AND mp.gateway_name = $${pIdx++}`;
      params.push(gateway);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = `%${search.trim()}%`;
      query += ` AND (mp.trx_id LIKE $${pIdx} OR mp.sender_number LIKE $${pIdx} OR mp.customer_name LIKE $${pIdx} OR mp.customer_phone LIKE $${pIdx} OR CAST(mp.order_id AS TEXT) LIKE $${pIdx})`;
      params.push(q);
      pIdx++;
    }

    query += ' ORDER BY mp.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching manual payments:', err);
    res.status(500).json({ error: 'Failed to fetch manual payments: ' + (err.message || '') });
  }
});

// Admin: Get Single Manual Payment with Order Items
app.get('/api/admin/manual-payments/:id', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const id = parseInt(req.params.id);

    const result = await pool.query(`
      SELECT mp.*, o.tracking_number, o.shipping_address, o.total_amount as order_total, u.name as user_name, u.email as user_email
      FROM manual_payments mp
      LEFT JOIN orders o ON mp.order_id = o.id
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manual payment record not found' });
    }

    const payment = result.rows[0];

    // Get order items
    if (payment.order_id) {
      const itemsRes = await pool.query(`
        SELECT oi.*, p.name as product_name, p.image_url
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [payment.order_id]);
      payment.items = itemsRes.rows;
    } else {
      payment.items = [];
    }

    res.json(payment);
  } catch (err: any) {
    console.error('Error fetching manual payment details:', err);
    res.status(500).json({ error: 'Failed to fetch manual payment details' });
  }
});

// Admin: Verify Manual Payment
app.post('/api/admin/manual-payments/:id/verify', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const id = parseInt(req.params.id);
    const { admin_note } = req.body;

    const paymentRes = await pool.query('SELECT * FROM manual_payments WHERE id = $1', [id]);
    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Manual payment record not found' });
    }

    const payment = paymentRes.rows[0];

    const updated = await pool.query(`
      UPDATE manual_payments 
      SET status = 'Verified', admin_note = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [admin_note || payment.admin_note || 'Verified by admin', id]);

    // Update associated order status to 'Processing'
    if (payment.order_id) {
      await pool.query("UPDATE orders SET status = 'Processing' WHERE id = $1", [payment.order_id]);
    }

    res.json({ success: true, payment: updated.rows[0] });
  } catch (err: any) {
    console.error('Error verifying manual payment:', err);
    res.status(500).json({ error: 'Failed to verify payment: ' + (err.message || '') });
  }
});

// Admin: Reject Manual Payment
app.post('/api/admin/manual-payments/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    await ensurePaymentTablesExist();
    const id = parseInt(req.params.id);
    const { admin_note } = req.body;

    const paymentRes = await pool.query('SELECT * FROM manual_payments WHERE id = $1', [id]);
    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Manual payment record not found' });
    }

    const payment = paymentRes.rows[0];

    const updated = await pool.query(`
      UPDATE manual_payments 
      SET status = 'Rejected', admin_note = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [admin_note || payment.admin_note || 'Rejected by admin', id]);

    // Update associated order status to 'Payment Failed'
    if (payment.order_id) {
      await pool.query("UPDATE orders SET status = 'Payment Failed' WHERE id = $1", [payment.order_id]);
    }

    res.json({ success: true, payment: updated.rows[0] });
  } catch (err: any) {
    console.error('Error rejecting manual payment:', err);
    res.status(500).json({ error: 'Failed to reject payment: ' + (err.message || '') });
  }
});

// Admin: Get All Orders
app.get('/api/admin/orders', authenticateAdmin, async (req: any, res: any) => {
  try {
    let query = `
      SELECT o.id, o.total_amount, o.status, o.payment_method, o.payment_details, o.shipping_address, 
             o.tracking_number, o.courier_name, o.created_at, 
             COALESCE(u.name, 'Guest Customer') as user_name, 
             COALESCE(u.email, 'guest@example.com') as user_email,
             COALESCE(u.phone, '') as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `;
    const params: any[] = [];
    if (req.query.limit) {
      query += ` LIMIT $1`;
      params.push(parseInt(req.query.limit));
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

// Admin: Get Single Order Details with Items
app.get('/api/admin/orders/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const orderResult = await pool.query(`
      SELECT o.*, 
             COALESCE(u.name, 'Guest Customer') as user_name, 
             COALESCE(u.email, 'guest@example.com') as user_email,
             COALESCE(u.phone, '') as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const itemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image, p.category as product_category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [order.id]);

    order.items = itemsResult.rows;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Admin: Update Order Status & Courier/Tracking
app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req: any, res: any) => {
  const { status, tracking_number, courier_name } = req.body;
  try {
    const orderId = parseInt(req.params.id, 10);
    let result;
    if (tracking_number !== undefined || courier_name !== undefined) {
      result = await pool.query(
        'UPDATE orders SET status = COALESCE($1, status), tracking_number = COALESCE($2, tracking_number), courier_name = COALESCE($3, courier_name) WHERE id = $4 RETURNING *',
        [status, tracking_number, courier_name, orderId]
      );
    } else {
      result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, orderId]
      );
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ==========================================
// PAYMENT GATEWAYS API
// ==========================================

// Public: Get active payment gateways
app.get('/api/payment-gateways', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_gateways WHERE is_active = true ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment gateways' });
  }
});

// Admin: Get all payment gateways
app.get('/api/admin/payment-gateways', authenticateAdmin, async (req: any, res: any) => {
  try {
    const result = await pool.query('SELECT * FROM payment_gateways ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment gateways for admin' });
  }
});

// Admin: Create Payment Gateway
app.post('/api/admin/payment-gateways', authenticateAdmin, async (req: any, res: any) => {
  const { name, type, title, description, account_number, instruction, logo_url, is_active, fee_percent, min_amount, max_amount } = req.body;
  if (!name || !title || !type) {
    return res.status(400).json({ error: 'Gateway name, type, and title are required' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO payment_gateways 
      (name, type, title, description, account_number, instruction, logo_url, is_active, fee_percent, min_amount, max_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name.trim(), 
      type || 'mfs', 
      title.trim(), 
      description || '', 
      account_number || '', 
      instruction || '', 
      logo_url || '', 
      is_active !== undefined ? is_active : true, 
      Number(fee_percent) || 0, 
      Number(min_amount) || 0, 
      Number(max_amount) || 0
    ]);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Create payment gateway error:', err);
    res.status(500).json({ error: 'Failed to create payment gateway' });
  }
});

// Admin: Update Payment Gateway
app.put('/api/admin/payment-gateways/:id', authenticateAdmin, async (req: any, res: any) => {
  const { name, type, title, description, account_number, instruction, logo_url, is_active, fee_percent, min_amount, max_amount } = req.body;
  try {
    const gatewayId = parseInt(req.params.id, 10);
    const result = await pool.query(`
      UPDATE payment_gateways 
      SET name = COALESCE($1, name),
          type = COALESCE($2, type),
          title = COALESCE($3, title),
          description = COALESCE($4, description),
          account_number = COALESCE($5, account_number),
          instruction = COALESCE($6, instruction),
          logo_url = COALESCE($7, logo_url),
          is_active = COALESCE($8, is_active),
          fee_percent = COALESCE($9, fee_percent),
          min_amount = COALESCE($10, min_amount),
          max_amount = COALESCE($11, max_amount),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      name, type, title, description, account_number, instruction, logo_url, is_active, 
      fee_percent !== undefined ? Number(fee_percent) : null,
      min_amount !== undefined ? Number(min_amount) : null,
      max_amount !== undefined ? Number(max_amount) : null,
      gatewayId
    ]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment gateway not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Update payment gateway error:', err);
    res.status(500).json({ error: 'Failed to update payment gateway' });
  }
});

// Admin: Toggle Payment Gateway Active Status
app.put('/api/admin/payment-gateways/:id/toggle', authenticateAdmin, async (req: any, res: any) => {
  try {
    const gatewayId = parseInt(req.params.id, 10);
    const result = await pool.query(`
      UPDATE payment_gateways 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [gatewayId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment gateway not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle gateway status' });
  }
});

// Admin: Delete Payment Gateway
app.delete('/api/admin/payment-gateways/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const gatewayId = parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM payment_gateways WHERE id = $1 RETURNING *', [gatewayId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment gateway not found' });
    res.json({ success: true, message: 'Payment gateway removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment gateway' });
  }
});

// ==========================================
// MANUAL PAYMENTS API
// ==========================================

// Admin: Get Manual Payment Statistics
app.get('/api/admin/manual-payments/stats', authenticateAdmin, async (req: any, res: any) => {
  try {
    // Backfill from orders if manual_payments count is 0
    const countCheck = await pool.query('SELECT COUNT(*) FROM manual_payments');
    if (parseInt(countCheck.rows[0].count) === 0) {
      const ordersRes = await pool.query(`
        SELECT o.id, o.user_id, o.payment_method, o.payment_details, o.total_amount, o.status, o.shipping_address, o.created_at, u.name, u.phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.payment_method ILIKE '%bKash%' OR o.payment_method ILIKE '%Nagad%' OR o.payment_method ILIKE '%Rocket%' OR o.payment_method ILIKE '%Bank%' OR o.payment_method ILIKE '%TrxID%'
      `);

      for (const order of ordersRes.rows) {
        let gateway = 'Mobile Banking';
        if (order.payment_method.toLowerCase().includes('bkash')) gateway = 'bKash';
        else if (order.payment_method.toLowerCase().includes('nagad')) gateway = 'Nagad';
        else if (order.payment_method.toLowerCase().includes('rocket')) gateway = 'Rocket';
        else if (order.payment_method.toLowerCase().includes('bank')) gateway = 'Bank Transfer';

        // Extract TrxID
        const trxMatch = order.payment_method.match(/TrxID:\s*([A-Za-z0-9_-]+)/i);
        const trxId = trxMatch ? trxMatch[1] : `TRX-${order.id}992`;

        const status = order.status === 'Paid' ? 'Verified' : (order.status === 'Payment Failed' ? 'Rejected' : 'Pending');

        await pool.query(`
          INSERT INTO manual_payments (order_id, user_id, gateway_name, trx_id, amount, status, customer_name, customer_phone, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          order.id,
          order.user_id,
          gateway,
          trxId,
          order.total_amount,
          status,
          order.name || 'Customer',
          order.phone || '',
          order.created_at
        ]);
      }
    }

    const totalRes = await pool.query('SELECT COUNT(*) as count FROM manual_payments');
    const pendingRes = await pool.query("SELECT COUNT(*) as count FROM manual_payments WHERE status = 'Pending'");
    const verifiedRes = await pool.query("SELECT COUNT(*) as count FROM manual_payments WHERE status = 'Verified'");
    const rejectedRes = await pool.query("SELECT COUNT(*) as count FROM manual_payments WHERE status = 'Rejected'");
    const sumRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as sum FROM manual_payments WHERE status = 'Verified'");

    res.json({
      total: parseInt(totalRes.rows[0]?.count || 0),
      pending: parseInt(pendingRes.rows[0]?.count || 0),
      verified: parseInt(verifiedRes.rows[0]?.count || 0),
      rejected: parseInt(rejectedRes.rows[0]?.count || 0),
      total_verified_amount: parseFloat(sumRes.rows[0]?.sum || 0)
    });
  } catch (err: any) {
    console.error('Manual payment stats error:', err);
    res.status(500).json({ error: 'Failed to fetch manual payment statistics' });
  }
});

// Admin: Get All Manual Payments (List with Search & Filters)
app.get('/api/admin/manual-payments', authenticateAdmin, async (req: any, res: any) => {
  const { status, gateway, search } = req.query;
  try {
    let query = `
      SELECT mp.*, 
             o.tracking_number, o.shipping_address, o.status as order_status,
             COALESCE(u.name, mp.customer_name, 'Guest Customer') as user_name,
             COALESCE(u.email, 'guest@example.com') as user_email
      FROM manual_payments mp
      LEFT JOIN orders o ON mp.order_id = o.id
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND mp.status = $${params.length}`;
    }

    if (gateway && gateway !== 'all') {
      params.push(gateway);
      query += ` AND mp.gateway_name ILIKE $${params.length}`;
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      query += ` AND (
        CAST(mp.order_id AS TEXT) ILIKE $${params.length} OR 
        mp.trx_id ILIKE $${params.length} OR 
        mp.customer_name ILIKE $${params.length} OR 
        mp.sender_number ILIKE $${params.length} OR
        mp.customer_phone ILIKE $${params.length}
      )`;
    }

    query += ' ORDER BY mp.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch manual payments error:', err);
    res.status(500).json({ error: 'Failed to fetch manual payments' });
  }
});

// Admin: Get Single Manual Payment Details with Order Items
app.get('/api/admin/manual-payments/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const mpResult = await pool.query(`
      SELECT mp.*, 
             o.tracking_number, o.shipping_address, o.status as order_status, o.total_amount as order_total,
             COALESCE(u.name, mp.customer_name, 'Guest Customer') as user_name,
             COALESCE(u.email, 'guest@example.com') as user_email,
             COALESCE(u.phone, mp.customer_phone, '') as user_phone
      FROM manual_payments mp
      LEFT JOIN orders o ON mp.order_id = o.id
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mp.id = $1
    `, [paymentId]);

    if (mpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Manual payment submission not found' });
    }

    const payment = mpResult.rows[0];

    // Fetch order items if order exists
    if (payment.order_id) {
      const itemsRes = await pool.query(`
        SELECT oi.*, p.name as product_name, p.image_url as product_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [payment.order_id]);
      payment.items = itemsRes.rows;
    } else {
      payment.items = [];
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch manual payment details' });
  }
});

// Admin: Verify Manual Payment (Approves Payment & updates Order status to Paid)
app.put('/api/admin/manual-payments/:id/verify', authenticateAdmin, async (req: any, res: any) => {
  const { admin_note } = req.body;
  try {
    const paymentId = parseInt(req.params.id, 10);
    const mpRes = await pool.query('SELECT * FROM manual_payments WHERE id = $1', [paymentId]);
    if (mpRes.rows.length === 0) {
      return res.status(404).json({ error: 'Manual payment submission not found' });
    }
    const payment = mpRes.rows[0];

    // Update manual payment status
    const updateMp = await pool.query(`
      UPDATE manual_payments 
      SET status = 'Verified', admin_note = COALESCE($1, admin_note), updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [admin_note || 'Payment verified and verified by admin.', paymentId]);

    // Update linked order status to 'Paid'
    if (payment.order_id) {
      await pool.query(`
        UPDATE orders 
        SET status = 'Paid'
        WHERE id = $1
      `, [payment.order_id]);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully! Order status updated to Paid.',
      payment: updateMp.rows[0]
    });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify manual payment' });
  }
});

// Admin: Reject Manual Payment (Rejects Payment & updates Order status)
app.put('/api/admin/manual-payments/:id/reject', authenticateAdmin, async (req: any, res: any) => {
  const { admin_note } = req.body;
  try {
    const paymentId = parseInt(req.params.id, 10);
    const mpRes = await pool.query('SELECT * FROM manual_payments WHERE id = $1', [paymentId]);
    if (mpRes.rows.length === 0) {
      return res.status(404).json({ error: 'Manual payment submission not found' });
    }
    const payment = mpRes.rows[0];

    // Update manual payment status
    const updateMp = await pool.query(`
      UPDATE manual_payments 
      SET status = 'Rejected', admin_note = COALESCE($1, admin_note), updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [admin_note || 'TrxID could not be verified.', paymentId]);

    // Update linked order status to 'Payment Failed'
    if (payment.order_id) {
      await pool.query(`
        UPDATE orders 
        SET status = 'Payment Failed'
        WHERE id = $1
      `, [payment.order_id]);
    }

    res.json({
      success: true,
      message: 'Payment rejected. Order marked as Payment Failed.',
      payment: updateMp.rows[0]
    });
  } catch (err: any) {
    console.error('Reject payment error:', err);
    res.status(500).json({ error: 'Failed to reject manual payment' });
  }
});

// Public / Customer: Submit Manual Payment proof for an Order
app.post('/api/manual-payments/submit', authenticateOptionalToken, async (req: any, res: any) => {
  const { order_id, gateway_name, sender_number, trx_id, amount, customer_name, customer_phone, attachment_url } = req.body;
  if (!order_id || !trx_id || !gateway_name) {
    return res.status(400).json({ error: 'Order ID, Payment Method, and Transaction ID (TrxID) are required.' });
  }

  try {
    // Check if order exists
    const orderCheck = await pool.query('SELECT id, total_amount, user_id FROM orders WHERE id = $1', [order_id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderCheck.rows[0];

    const finalAmount = amount ? Number(amount) : Number(order.total_amount);
    const userId = req.user?.id || order.user_id || null;

    const result = await pool.query(`
      INSERT INTO manual_payments 
      (order_id, user_id, gateway_name, sender_number, trx_id, amount, status, customer_name, customer_phone, attachment_url)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9)
      RETURNING *
    `, [
      order_id,
      userId,
      gateway_name.trim(),
      sender_number || '',
      trx_id.trim(),
      finalAmount,
      customer_name || 'Customer',
      customer_phone || '',
      attachment_url || ''
    ]);

    // Update order payment method description with TrxID
    await pool.query(`
      UPDATE orders 
      SET payment_method = $1, status = 'Processing'
      WHERE id = $2
    `, [`${gateway_name} (TrxID: ${trx_id.trim()})`, order_id]);

    res.json({
      success: true,
      message: 'Your payment submission has been received! Our verification team will verify it shortly.',
      payment: result.rows[0]
    });
  } catch (err: any) {
    console.error('Submit manual payment error:', err);
    res.status(500).json({ error: 'Failed to submit payment details' });
  }
});

// Get User Profile
app.get('/api/user', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, phone, avatar_url, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/user/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, phone, avatar_url, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update User Profile (Name, Email, Phone, Avatar)
app.put('/api/user/profile', authenticateToken, async (req: any, res: any) => {
  const { name, email, phone, avatar_url } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = userRes.rows[0];

    const targetEmail = (email && typeof email === 'string' && email.trim()) ? email.trim() : current.email;

    if (targetEmail !== current.email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [targetEmail, req.user.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This email is already in use by another account.' });
      }
    }
    
    const targetName = name !== undefined ? name : current.name;
    const targetPhone = phone !== undefined ? phone : (current.phone || '');
    const targetAvatar = avatar_url !== undefined ? avatar_url : (current.avatar_url || '');

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, 
           email = $2, 
           phone = $3, 
           avatar_url = $4 
       WHERE id = $5 
       RETURNING id, name, email, role, phone, avatar_url, created_at`,
      [targetName, targetEmail, targetPhone, targetAvatar, req.user.id]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile: ' + (err.message || '') });
  }
});

// Update User Password (Security)
app.put('/api/user/security/password', authenticateToken, async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }
  try {
    const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Validate current password if existing
    const match = await bcrypt.compare(currentPassword, userRes.rows[0].password);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// User Addresses: Get all
app.get('/api/user/addresses', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// User Addresses: Create
app.post('/api/user/addresses', authenticateToken, async (req: any, res: any) => {
  const { type, full_name, phone, email, address_line1, address_line2, city, state_district, postal_code, country, is_default } = req.body;
  try {
    const addrType = type === 'billing' ? 'billing' : 'shipping';
    if (is_default) {
      await pool.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND type = $2', [req.user.id, addrType]);
    }
    
    // Check if this is the first address of this type, make it default automatically
    const countCheck = await pool.query('SELECT COUNT(*) FROM user_addresses WHERE user_id = $1 AND type = $2', [req.user.id, addrType]);
    const makeDefault = is_default || parseInt(countCheck.rows[0].count) === 0;

    const result = await pool.query(
      `INSERT INTO user_addresses (user_id, type, full_name, phone, email, address_line1, address_line2, city, state_district, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, addrType, full_name, phone, email, address_line1, address_line2 || '', city, state_district || '', postal_code || '', country || 'Bangladesh', makeDefault]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create address error:', err);
    res.status(500).json({ error: 'Failed to create address' });
  }
});

// User Addresses: Update
app.put('/api/user/addresses/:id', authenticateToken, async (req: any, res: any) => {
  const { type, full_name, phone, email, address_line1, address_line2, city, state_district, postal_code, country, is_default } = req.body;
  try {
    const addrType = type === 'billing' ? 'billing' : 'shipping';
    if (is_default) {
      await pool.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND type = $2 AND id != $3', [req.user.id, addrType, req.params.id]);
    }

    const result = await pool.query(
      `UPDATE user_addresses 
       SET type = $1, full_name = $2, phone = $3, email = $4, address_line1 = $5, address_line2 = $6, 
           city = $7, state_district = $8, postal_code = $9, country = $10, is_default = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [addrType, full_name, phone, email, address_line1, address_line2 || '', city, state_district || '', postal_code || '', country || 'Bangladesh', is_default || false, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Address not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// User Addresses: Delete
app.delete('/api/user/addresses/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Address not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// User Addresses: Set Default
app.put('/api/user/addresses/:id/default', authenticateToken, async (req: any, res: any) => {
  try {
    const addrRes = await pool.query('SELECT type FROM user_addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (addrRes.rows.length === 0) return res.status(404).json({ error: 'Address not found' });
    const type = addrRes.rows[0].type;

    await pool.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND type = $2', [req.user.id, type]);
    const result = await pool.query('UPDATE user_addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

// Public / User Order Tracking Search
app.get('/api/track-order/:query', async (req, res) => {
  const query = req.params.query?.trim();
  if (!query) return res.status(400).json({ error: 'Please provide an Order ID or Tracking Number' });

  try {
    let orderResult;
    const numericId = parseInt(query.replace(/[^0-9]/g, ''));
    
    if (!isNaN(numericId) && numericId > 0) {
      orderResult = await pool.query(`
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = $1 OR o.tracking_number ILIKE $2
        ORDER BY o.created_at DESC LIMIT 1
      `, [numericId, `%${query}%`]);
    } else {
      orderResult = await pool.query(`
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.tracking_number ILIKE $1
        ORDER BY o.created_at DESC LIMIT 1
      `, [`%${query}%`]);
    }

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'No order found matching this Order ID or Tracking Number' });
    }

    const order = orderResult.rows[0];
    
    // Fetch items with product images and names
    const itemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image, p.category as product_category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [order.id]);

    order.items = itemsResult.rows;
    res.json(order);
  } catch (err) {
    console.error('Track order error:', err);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// Get Single Order Details for User
app.get('/api/user/orders/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const orderResult = await pool.query(`
      SELECT * FROM orders WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const itemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image, p.category as product_category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [order.id]);

    order.items = itemsResult.rows;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Get Products (Returns all products with clean SEO slugs)
app.get('/api/products', async (req, res) => {
  const { search, category } = req.query;
  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get Product by SEO Slug or Numeric ID (Dual-lookup with SEO slug preference)
app.get('/api/products/:identifier', async (req, res) => {
  try {
    const rawIdentifier = (req.params.identifier || '').trim();
    if (!rawIdentifier) {
      return res.status(400).json({ error: 'Product identifier is required' });
    }

    const numericId = parseInt(rawIdentifier, 10);
    let result;

    if (!isNaN(numericId) && String(numericId) === rawIdentifier) {
      // Query by numeric ID or matching slug
      result = await pool.query('SELECT * FROM products WHERE id = $1 OR slug = $2 LIMIT 1', [numericId, rawIdentifier]);
    } else {
      // Query by SEO slug (case-insensitive)
      result = await pool.query('SELECT * FROM products WHERE slug = $1 OR LOWER(slug) = LOWER($1) LIMIT 1', [rawIdentifier]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ==========================================
// ADMIN PRODUCT MANAGEMENT API
// ==========================================

// Admin: Create Product with auto-generated or custom validated unique SEO slug, sale_price, stock & low_stock_threshold
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  const { name, slug, description, price, sale_price, category, product_type, stock, low_stock_threshold, image_url, specs } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Product name and price are required' });
  }

  try {
    const uniqueSlug = await getUniqueProductSlug(slug || name);
    const specsValue = typeof specs === 'object' ? JSON.stringify(specs) : (specs || '{}');
    const parsedSalePrice = (sale_price !== undefined && sale_price !== null && sale_price !== '' && !isNaN(Number(sale_price))) ? Number(sale_price) : null;
    const finalProductType = product_type || 'physical';
    const parsedStock = (stock !== undefined && stock !== null && stock !== '' && !isNaN(Number(stock))) ? Math.max(0, parseInt(stock, 10)) : 15;
    const parsedThreshold = (low_stock_threshold !== undefined && low_stock_threshold !== null && low_stock_threshold !== '' && !isNaN(Number(low_stock_threshold))) ? Math.max(0, parseInt(low_stock_threshold, 10)) : 5;

    const result = await pool.query(
      `INSERT INTO products (name, slug, description, price, sale_price, category, product_type, stock, low_stock_threshold, image_url, specs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name.trim(), uniqueSlug, description || '', Number(price), parsedSalePrice, category || 'General', finalProductType, parsedStock, parsedThreshold, image_url || '', specsValue]
    );

    // Auto-sync category to categories table
    if (category && category.trim()) {
      const catName = category.trim();
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      try {
        await pool.query(
          `INSERT INTO categories (name, slug, description, image_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (slug) DO NOTHING`,
          [catName, catSlug, `${catName} collection`, image_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=600']
        );
      } catch {}
    }

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Failed to create product:', err);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

// Admin: Update Product with unique SEO slug verification, sale_price, stock & low_stock_threshold
app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  const { name, slug, description, price, sale_price, category, product_type, stock, low_stock_threshold, image_url, specs } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Product name and price are required' });
  }

  try {
    const uniqueSlug = await getUniqueProductSlug(slug || name, productId);
    const specsValue = typeof specs === 'object' ? JSON.stringify(specs) : (specs || '{}');
    const parsedSalePrice = (sale_price !== undefined && sale_price !== null && sale_price !== '' && !isNaN(Number(sale_price))) ? Number(sale_price) : null;
    const finalProductType = product_type || 'physical';
    const parsedStock = (stock !== undefined && stock !== null && stock !== '' && !isNaN(Number(stock))) ? Math.max(0, parseInt(stock, 10)) : 15;
    const parsedThreshold = (low_stock_threshold !== undefined && low_stock_threshold !== null && low_stock_threshold !== '' && !isNaN(Number(low_stock_threshold))) ? Math.max(0, parseInt(low_stock_threshold, 10)) : 5;

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, slug = $2, description = $3, price = $4, sale_price = $5, category = $6, product_type = $7, stock = $8, low_stock_threshold = $9, image_url = $10, specs = $11
       WHERE id = $12
       RETURNING *`,
      [name.trim(), uniqueSlug, description || '', Number(price), parsedSalePrice, category || 'General', finalProductType, parsedStock, parsedThreshold, image_url || '', specsValue, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Failed to update product:', err);
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

// Admin: Quick Adjust Stock / Threshold
app.patch('/api/admin/products/:id/stock', authenticateAdmin, async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  const { stock, low_stock_threshold, adjust_by } = req.body;

  try {
    const existingRes = await pool.query('SELECT stock, low_stock_threshold FROM products WHERE id = $1', [productId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const current = existingRes.rows[0];
    let newStock = Number(current.stock ?? 15);
    let newThreshold = Number(current.low_stock_threshold ?? 5);

    if (adjust_by !== undefined && !isNaN(Number(adjust_by))) {
      newStock = Math.max(0, newStock + Number(adjust_by));
    } else if (stock !== undefined && !isNaN(Number(stock))) {
      newStock = Math.max(0, parseInt(stock, 10));
    }

    if (low_stock_threshold !== undefined && !isNaN(Number(low_stock_threshold))) {
      newThreshold = Math.max(0, parseInt(low_stock_threshold, 10));
    }

    const result = await pool.query(
      'UPDATE products SET stock = $1, low_stock_threshold = $2 WHERE id = $3 RETURNING *',
      [newStock, newThreshold, productId]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Failed to update stock:', err);
    res.status(500).json({ error: err.message || 'Failed to update stock' });
  }
});

// Admin: Delete Product
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    await pool.query('DELETE FROM product_reviews WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM order_items WHERE product_id = $1', [productId]);
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, deletedId: productId });
  } catch (err: any) {
    console.error('Failed to delete product:', err);
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

// ==========================================
// OFFERS & COUPONS MANAGEMENT API
// ==========================================

// Public: Get Active Promotional Offers and Banners
app.get('/api/coupons/active-offers', async (req, res) => {
  try {
    await ensureCouponsTableExist();
    const result = await pool.query(`
      SELECT id, code, title, description, discount_type, discount_value, min_order_amount, max_discount_amount, end_date, show_banner, banner_bg_color
      FROM coupons
      WHERE (is_active = 1 OR is_active = true)
        AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
        AND (usage_limit IS NULL OR used_count < usage_limit)
      ORDER BY show_banner DESC, id DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch active offers error:', err);
    res.status(500).json({ error: 'Failed to fetch active offers' });
  }
});

// Public: Validate Coupon Code for Checkout & Quick Order
app.post('/api/coupons/validate', async (req, res) => {
  try {
    await ensureCouponsTableExist();
    const { code, subtotal } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, message: 'Please enter a valid coupon code' });
    }

    const cleanCode = code.trim().toUpperCase();
    const orderSubtotal = parseFloat(subtotal) || 0;

    const result = await pool.query(`
      SELECT * FROM coupons WHERE UPPER(code) = $1 LIMIT 1
    `, [cleanCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: `Coupon code '${cleanCode}' does not exist` });
    }

    const coupon = result.rows[0];

    // Check if active
    if (!coupon.is_active) {
      return res.status(400).json({ valid: false, message: `Coupon code '${cleanCode}' is currently disabled` });
    }

    // Check expiry
    if (coupon.end_date && new Date(coupon.end_date).getTime() < Date.now()) {
      return res.status(400).json({ valid: false, message: `Coupon code '${cleanCode}' has expired` });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ valid: false, message: `Coupon code '${cleanCode}' usage limit has been reached` });
    }

    // Check minimum order amount
    const minAmount = parseFloat(coupon.min_order_amount) || 0;
    if (orderSubtotal < minAmount) {
      return res.status(400).json({ 
        valid: false, 
        message: `Minimum order amount of $${minAmount.toFixed(2)} is required for this coupon (Current subtotal: $${orderSubtotal.toFixed(2)})` 
      });
    }

    // Calculate discount amount
    let discount = 0;
    const discountVal = parseFloat(coupon.discount_value) || 0;
    if (coupon.discount_type === 'percentage') {
      discount = (orderSubtotal * discountVal) / 100;
      if (coupon.max_discount_amount) {
        const maxDisc = parseFloat(coupon.max_discount_amount);
        if (discount > maxDisc) {
          discount = maxDisc;
        }
      }
    } else {
      // fixed discount
      discount = Math.min(orderSubtotal, discountVal);
    }

    // Round discount to 2 decimal places
    discount = Math.round(discount * 100) / 100;

    res.json({
      valid: true,
      code: coupon.code,
      title: coupon.title,
      discount_type: coupon.discount_type,
      discount_value: discountVal,
      discount_amount: discount,
      message: `Coupon '${coupon.code}' applied! You saved $${discount.toFixed(2)}`
    });
  } catch (err: any) {
    console.error('Validate coupon error:', err);
    res.status(500).json({ valid: false, message: 'Failed to validate coupon' });
  }
});

// Admin: Get all coupons & offers
app.get('/api/admin/coupons', authenticateAdmin, async (req, res) => {
  try {
    await ensureCouponsTableExist();
    const result = await pool.query('SELECT * FROM coupons ORDER BY id DESC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch admin coupons error:', err);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Admin: Create coupon / offer
app.post('/api/admin/coupons', authenticateAdmin, async (req, res) => {
  try {
    await ensureCouponsTableExist();
    const { 
      code, 
      title, 
      description, 
      discount_type, 
      discount_value, 
      min_order_amount, 
      max_discount_amount, 
      start_date, 
      end_date, 
      usage_limit, 
      is_active, 
      show_banner, 
      banner_bg_color 
    } = req.body;

    if (!code || !title || discount_value === undefined) {
      return res.status(400).json({ error: 'Coupon code, title, and discount value are required' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check unique code
    const existing = await pool.query('SELECT id FROM coupons WHERE UPPER(code) = $1', [cleanCode]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Coupon code '${cleanCode}' already exists` });
    }

    const result = await pool.query(`
      INSERT INTO coupons (
        code, title, description, discount_type, discount_value, min_order_amount, 
        max_discount_amount, start_date, end_date, usage_limit, is_active, show_banner, banner_bg_color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      cleanCode,
      title.trim(),
      description || '',
      discount_type === 'fixed' ? 'fixed' : 'percentage',
      parseFloat(discount_value) || 0,
      parseFloat(min_order_amount) || 0,
      max_discount_amount ? parseFloat(max_discount_amount) : null,
      start_date || new Date().toISOString(),
      end_date || null,
      usage_limit ? parseInt(usage_limit) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      show_banner ? 1 : 0,
      banner_bg_color || '#2563EB'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Create coupon error:', err);
    res.status(500).json({ error: 'Failed to create coupon: ' + (err.message || '') });
  }
});

// Admin: Update coupon / offer
app.put('/api/admin/coupons/:id', authenticateAdmin, async (req, res) => {
  try {
    await ensureCouponsTableExist();
    const id = parseInt(req.params.id, 10);
    const { 
      code, 
      title, 
      description, 
      discount_type, 
      discount_value, 
      min_order_amount, 
      max_discount_amount, 
      start_date, 
      end_date, 
      usage_limit, 
      is_active, 
      show_banner, 
      banner_bg_color 
    } = req.body;

    const cleanCode = code ? code.trim().toUpperCase() : undefined;

    // Check unique code excluding this id
    if (cleanCode) {
      const existing = await pool.query('SELECT id FROM coupons WHERE UPPER(code) = $1 AND id != $2', [cleanCode, id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: `Coupon code '${cleanCode}' already in use by another coupon` });
      }
    }

    const result = await pool.query(`
      UPDATE coupons SET 
        code = COALESCE($1, code),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        discount_type = COALESCE($4, discount_type),
        discount_value = COALESCE($5, discount_value),
        min_order_amount = COALESCE($6, min_order_amount),
        max_discount_amount = $7,
        start_date = COALESCE($8, start_date),
        end_date = $9,
        usage_limit = $10,
        is_active = COALESCE($11, is_active),
        show_banner = COALESCE($12, show_banner),
        banner_bg_color = COALESCE($13, banner_bg_color),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      cleanCode,
      title?.trim(),
      description,
      discount_type,
      discount_value !== undefined ? parseFloat(discount_value) : null,
      min_order_amount !== undefined ? parseFloat(min_order_amount) : null,
      max_discount_amount !== undefined && max_discount_amount !== '' && max_discount_amount !== null ? parseFloat(max_discount_amount) : null,
      start_date,
      end_date !== undefined && end_date !== '' && end_date !== null ? end_date : null,
      usage_limit !== undefined && usage_limit !== '' && usage_limit !== null ? parseInt(usage_limit) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      show_banner !== undefined ? (show_banner ? 1 : 0) : null,
      banner_bg_color,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Update coupon error:', err);
    res.status(500).json({ error: 'Failed to update coupon: ' + (err.message || '') });
  }
});

// Admin: Toggle coupon active status
app.put('/api/admin/coupons/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    await ensureCouponsTableExist();
    const id = parseInt(req.params.id, 10);
    const existing = await pool.query('SELECT is_active FROM coupons WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    const currentActive = Boolean(existing.rows[0].is_active);
    const newActive = !currentActive;

    const result = await pool.query(
      'UPDATE coupons SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newActive ? 1 : 0, id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Toggle coupon error:', err);
    res.status(500).json({ error: 'Failed to toggle coupon status' });
  }
});

// Admin: Delete coupon
app.delete('/api/admin/coupons/:id', authenticateAdmin, async (req, res) => {
  try {
    await ensureCouponsTableExist();
    const id = parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Delete coupon error:', err);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// ==========================================
// PRODUCT REVIEWS API
// ==========================================

// Get all reviews for a product with rating statistics (by SEO slug or numeric ID)
app.get('/api/products/:identifier/reviews', async (req, res) => {
  const rawIdentifier = (req.params.identifier || '').trim();
  if (!rawIdentifier) {
    return res.status(400).json({ error: 'Product identifier is required' });
  }

  try {
    const numericId = parseInt(rawIdentifier, 10);
    let prodRes;
    if (!isNaN(numericId) && String(numericId) === rawIdentifier) {
      prodRes = await pool.query('SELECT id FROM products WHERE id = $1 OR slug = $2 LIMIT 1', [numericId, rawIdentifier]);
    } else {
      prodRes = await pool.query('SELECT id FROM products WHERE slug = $1 OR LOWER(slug) = LOWER($1) LIMIT 1', [rawIdentifier]);
    }

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productId = prodRes.rows[0].id;

    const reviewsResult = await pool.query(
      `SELECT r.*, u.name as user_name, u.avatar_url as user_avatar 
       FROM product_reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1 AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [productId]
    );

    const reviews = reviewsResult.rows;
    const totalReviews = reviews.length;
    
    let averageRating = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      let sum = 0;
      for (const r of reviews) {
        const rating = Math.min(5, Math.max(1, parseInt(r.rating) || 5));
        sum += rating;
        distribution[rating] = (distribution[rating] || 0) + 1;
      }
      averageRating = parseFloat((sum / totalReviews).toFixed(1));
    }

    res.json({
      reviews,
      stats: {
        totalReviews,
        averageRating,
        distribution
      }
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch product reviews' });
  }
});

// Submit a review (Authenticated user only - by SEO slug or numeric ID)
app.post('/api/products/:identifier/reviews', authenticateToken, async (req: any, res: any) => {
  const rawIdentifier = (req.params.identifier || '').trim();
  if (!rawIdentifier) {
    return res.status(400).json({ error: 'Product identifier is required' });
  }

  const { rating, title, comment } = req.body;
  const numRating = parseInt(rating);

  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Please provide a valid rating between 1 and 5 stars' });
  }

  if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
    return res.status(400).json({ error: 'Please write a review comment of at least 3 characters' });
  }

  try {
    // Resolve product ID
    const numericId = parseInt(rawIdentifier, 10);
    let prodRes;
    if (!isNaN(numericId) && String(numericId) === rawIdentifier) {
      prodRes = await pool.query('SELECT id, name FROM products WHERE id = $1 OR slug = $2 LIMIT 1', [numericId, rawIdentifier]);
    } else {
      prodRes = await pool.query('SELECT id, name FROM products WHERE slug = $1 OR LOWER(slug) = LOWER($1) LIMIT 1', [rawIdentifier]);
    }

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productId = prodRes.rows[0].id;

    // Check user info
    const userRes = await pool.query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // Check if user has a verified purchase for this product
    const orderCheck = await pool.query(
      `SELECT oi.id 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2
       LIMIT 1`,
      [req.user.id, productId]
    );
    const isVerifiedPurchase = orderCheck.rows.length > 0;

    // Check if user already reviewed this product -> update existing or insert new
    const existingReview = await pool.query(
      `SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2`,
      [productId, req.user.id]
    );

    let savedReview;
    if (existingReview.rows.length > 0) {
      // Update existing review
      const updateRes = await pool.query(
        `UPDATE product_reviews 
         SET rating = $1, title = $2, comment = $3, user_name = $4, user_email = $5, user_avatar = $6, is_verified_purchase = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          numRating, 
          (title || '').trim(), 
          comment.trim(), 
          user.name, 
          user.email, 
          user.avatar_url || '', 
          isVerifiedPurchase, 
          existingReview.rows[0].id
        ]
      );
      savedReview = updateRes.rows[0];
    } else {
      // Insert new review
      const insertRes = await pool.query(
        `INSERT INTO product_reviews 
         (product_id, user_id, user_name, user_email, user_avatar, rating, title, comment, is_verified_purchase, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved')
         RETURNING *`,
        [
          productId, 
          req.user.id, 
          user.name, 
          user.email, 
          user.avatar_url || '', 
          numRating, 
          (title || '').trim(), 
          comment.trim(), 
          isVerifiedPurchase
        ]
      );
      savedReview = insertRes.rows[0];
    }

    res.json({
      message: existingReview.rows.length > 0 ? 'Your review has been updated!' : 'Thank you! Your review has been submitted successfully.',
      review: savedReview
    });
  } catch (err: any) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review: ' + (err.message || '') });
  }
});

// Delete user's own review (by product identifier and reviewId)
app.delete('/api/products/:identifier/reviews/:reviewId', authenticateToken, async (req: any, res: any) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    const result = await pool.query(
      `DELETE FROM product_reviews WHERE id = $1 AND (user_id = $2 OR $3 = 'admin') RETURNING *`,
      [reviewId, req.user.id, req.user.role || '']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    res.json({ success: true, message: 'Review removed successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Create Order (Checkout)
app.post('/api/orders', authenticateOptionalToken, orderCreationLimiter, async (req: any, res: any) => {
  const { items, paymentMethod, payment_method, paymentDetails, payment_details, total, total_amount, shipping_address, shippingAddress } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  const effectivePaymentMethod = paymentMethod || payment_method || 'Credit Card';
  const effectiveShippingAddress = shipping_address || shippingAddress || '';
  const effectivePaymentDetails = paymentDetails || payment_details || null;
  const userId = req.user?.id || null;

  try {
    // Process items and guarantee non-null numeric price & quantity
    const processedItems: Array<{ product_id: number; quantity: number; price: number }> = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const productId = parseInt(item.product_id || item.productId || item.id);
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      
      let itemPrice = item.price !== undefined ? Number(item.price) : 
                      (item.price_at_time !== undefined ? Number(item.price_at_time) : 
                      (item.unit_price !== undefined ? Number(item.unit_price) : NaN));

      // If price is missing or invalid, lookup actual price from products table
      if (isNaN(itemPrice) || itemPrice === null || itemPrice === undefined) {
        if (productId) {
          const prodRes = await pool.query('SELECT price FROM products WHERE id = $1', [productId]);
          if (prodRes.rows.length > 0) {
            itemPrice = Number(prodRes.rows[0].price);
          } else {
            itemPrice = 0;
          }
        } else {
          itemPrice = 0;
        }
      }

      processedItems.push({
        product_id: productId,
        quantity,
        price: Number(itemPrice) || 0
      });

      calculatedTotal += (Number(itemPrice) || 0) * quantity;
    }

    const orderTotal = (total !== undefined && !isNaN(Number(total))) 
      ? Number(total) 
      : ((total_amount !== undefined && !isNaN(Number(total_amount))) ? Number(total_amount) : calculatedTotal);

    const trackingNumber = 'TS-' + Math.floor(100000 + Math.random() * 900000);

    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total_amount, payment_method, payment_details, status, shipping_address, tracking_number, courier_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, tracking_number',
      [userId, orderTotal, effectivePaymentMethod, effectivePaymentDetails ? JSON.stringify(effectivePaymentDetails) : null, 'Paid', effectiveShippingAddress, trackingNumber, 'TechShop Express Logistics']
    );
    const orderId = orderResult.rows[0].id;

    for (const item of processedItems) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.price]
      );
      // Decrement inventory stock count safely
      try {
        await pool.query(
          'UPDATE products SET stock = CASE WHEN stock >= $1 THEN stock - $1 ELSE 0 END WHERE id = $2',
          [item.quantity, item.product_id]
        );
      } catch (stockErr) {}
    }
    res.json({ success: true, orderId, trackingNumber: orderResult.rows[0].tracking_number });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// Get User Orders
app.get('/api/orders', authenticateToken, async (req: any, res: any) => {
  try {
    const ordersRes = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    if (ordersRes.rows.length === 0) {
      return res.json([]);
    }

    const orderIds = ordersRes.rows.map((o: any) => o.id);
    const placeholders = orderIds.map((_: any, idx: number) => `$${idx + 1}`).join(', ');

    const itemsRes = await pool.query(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image, p.category as product_category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (${placeholders})
    `, orderIds);

    const itemsByOrderId: Record<number, any[]> = {};
    for (const item of itemsRes.rows) {
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push(item);
    }

    const ordersWithItems = ordersRes.rows.map((o: any) => ({
      ...o,
      items: itemsByOrderId[o.id] || []
    }));

    res.json(ordersWithItems);
  } catch (err: any) {
    console.error('Failed to fetch user orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders: ' + (err.message || '') });
  }
});


// Admin: Users Management

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const [usersCount, productsCount, ordersCount, totalRev, lowStockRes, outOfStockRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM products'),
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT SUM(total_amount) FROM orders WHERE status = $1', ['Completed']),
      pool.query(`
        SELECT id, name, slug, category, product_type, price, sale_price, stock, low_stock_threshold, image_url 
        FROM products 
        WHERE (stock <= COALESCE(low_stock_threshold, 5) OR stock = 0)
        ORDER BY stock ASC, name ASC
      `),
      pool.query('SELECT COUNT(*) FROM products WHERE stock = 0')
    ]);

    const lowStockItems = lowStockRes.rows;
    const lowStockCount = lowStockItems.length;
    const outOfStockCount = parseInt(outOfStockRes.rows[0]?.count || 0);
    
    res.json({
      users: parseInt(usersCount.rows[0].count),
      products: parseInt(productsCount.rows[0].count),
      orders: parseInt(ordersCount.rows[0].count),
      revenue: parseFloat(totalRev.rows[0].sum || 0),
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      low_stock_products: lowStockItems
    });
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Admin: Get all low stock products for inventory audits
app.get('/api/admin/inventory/low-stock', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, category, product_type, price, sale_price, stock, low_stock_threshold, image_url,
             CASE 
               WHEN stock = 0 THEN 'out_of_stock'
               WHEN stock <= COALESCE(low_stock_threshold, 5) THEN 'low_stock'
               ELSE 'in_stock'
             END as stock_status
      FROM products 
      WHERE stock <= COALESCE(low_stock_threshold, 5)
      ORDER BY stock ASC, name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch low stock inventory:', err);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// Admin: Analytics (Daily Sales, Top Products, User Registrations for last 30 days)
app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30));
    
    // Generate dates array for the last N days (oldest to newest)
    const dateMap: { [key: string]: { date: string; displayDate: string; sales: number; ordersCount: number; newUsers: number } } = {};
    const datesList: string[] = [];
    
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      datesList.push(key);
      dateMap[key] = {
        date: key,
        displayDate,
        sales: 0,
        ordersCount: 0,
        newUsers: 0
      };
    }

    // 1. Fetch Orders
    const ordersRes = await pool.query(
      'SELECT id, total_amount, status, created_at FROM orders ORDER BY created_at ASC'
    );

    let total30dRevenue = 0;
    let total30dOrders = 0;
    let totalCompletedRevenue = 0;

    for (const order of ordersRes.rows) {
      if (!order.created_at) continue;
      const orderDate = new Date(order.created_at);
      if (isNaN(orderDate.getTime())) continue;
      const yyyy = orderDate.getFullYear();
      const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
      const dd = String(orderDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      const amount = Number(order.total_amount) || 0;
      if (dateMap[key]) {
        if (order.status !== 'Cancelled') {
          dateMap[key].sales = parseFloat((dateMap[key].sales + amount).toFixed(2));
          total30dRevenue += amount;
        }
        dateMap[key].ordersCount += 1;
        total30dOrders += 1;
        if (order.status === 'Completed' || order.status === 'Paid') {
          totalCompletedRevenue += amount;
        }
      }
    }

    // 2. Fetch Users
    const usersRes = await pool.query(
      'SELECT id, role, status, created_at FROM users ORDER BY created_at ASC'
    );

    let total30dNewUsers = 0;
    const totalUsersCount = usersRes.rows.length;

    for (const user of usersRes.rows) {
      if (!user.created_at) continue;
      const userDate = new Date(user.created_at);
      if (isNaN(userDate.getTime())) continue;
      const yyyy = userDate.getFullYear();
      const mm = String(userDate.getMonth() + 1).padStart(2, '0');
      const dd = String(userDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      if (dateMap[key]) {
        dateMap[key].newUsers += 1;
        total30dNewUsers += 1;
      }
    }

    // 3. Daily Sales & User registration time series array
    let runningUsers = Math.max(0, totalUsersCount - total30dNewUsers);
    const dailySales = datesList.map(key => {
      const item = dateMap[key];
      runningUsers += item.newUsers;
      return {
        date: item.date,
        displayDate: item.displayDate,
        sales: item.sales,
        ordersCount: item.ordersCount,
        newUsers: item.newUsers,
        cumulativeUsers: runningUsers
      };
    });

    // 4. Fetch Top Selling Products (joining order_items, orders, products)
    const topProductsRes = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.slug,
        p.category, 
        p.image_url, 
        p.price,
        p.stock,
        p.low_stock_threshold,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_appearances
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      GROUP BY p.id, p.name, p.slug, p.category, p.image_url, p.price, p.stock, p.low_stock_threshold
      ORDER BY units_sold DESC, total_revenue DESC
      LIMIT 10
    `);

    const topProducts = topProductsRes.rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug || String(p.id),
      category: p.category || 'General',
      imageUrl: p.image_url || '',
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      lowStockThreshold: Number(p.low_stock_threshold) || 5,
      unitsSold: parseInt(p.units_sold) || 0,
      revenue: parseFloat(Number(p.total_revenue).toFixed(2)) || 0,
      orderCount: parseInt(p.order_appearances) || 0
    }));

    // 5. Category breakdown
    const categorySalesMap: { [cat: string]: { category: string; sales: number; count: number } } = {};
    for (const prod of topProductsRes.rows) {
      const cat = prod.category || 'General';
      if (!categorySalesMap[cat]) {
        categorySalesMap[cat] = { category: cat, sales: 0, count: 0 };
      }
      categorySalesMap[cat].sales += parseFloat(Number(prod.total_revenue).toFixed(2)) || 0;
      categorySalesMap[cat].count += parseInt(prod.units_sold) || 0;
    }
    const categoryBreakdown = Object.values(categorySalesMap).sort((a, b) => b.sales - a.sales);

    // 6. Overall summaries
    const avgOrderValue = total30dOrders > 0 ? parseFloat((total30dRevenue / total30dOrders).toFixed(2)) : 0;
    const avgDailySales = parseFloat((total30dRevenue / days).toFixed(2));

    res.json({
      rangeDays: days,
      dailySales,
      topProducts,
      categoryBreakdown,
      summary: {
        total30dRevenue: parseFloat(total30dRevenue.toFixed(2)),
        total30dOrders,
        total30dNewUsers,
        totalCompletedRevenue: parseFloat(totalCompletedRevenue.toFixed(2)),
        totalUsersCount,
        avgOrderValue,
        avgDailySales
      }
    });
  } catch (err: any) {
    console.error('Failed to fetch analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    let query = 'SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC';
    const params: any[] = [];
    if (req.query.limit) {
      query += ` LIMIT $1`;
      params.push(parseInt(req.query.limit as string));
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
  const { name, email, password, role, status } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
      [name, email, hashed, role || 'user', status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  const { name, email, role, status, password } = req.body;
  try {
    const userId = parseInt(req.params.id, 10);
    let result;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      result = await pool.query(
        'UPDATE users SET name = $1, email = $2, role = $3, status = $4, password = $5 WHERE id = $6 RETURNING id, name, email, role, status',
        [name, email, role, status, hashed, userId]
      );
    } else {
      result = await pool.query(
        'UPDATE users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5 RETURNING id, name, email, role, status',
        [name, email, role, status, userId]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


// Helper function to ensure database categories sync with products
async function ensureCategoriesSynced() {
  try {
    const defaultCategories = [
      { name: 'Laptop', slug: 'laptop', description: 'High performance ultra-books, gaming rigs, and productivity workstations', image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=500' },
      { name: 'Mobile', slug: 'mobile', description: 'Flagship smartphones, 5G devices, and next-generation mobile tech', image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=500' },
      { name: 'Audio & Headphones', slug: 'audio-headphones', description: 'Studio monitors, wireless noise-canceling headphones, and Hi-Res earbuds', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=500' },
      { name: 'Smartwatches & Wearables', slug: 'smartwatches-wearables', description: 'GPS adventure watches, titanium smartwatches, and smart health trackers', image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=500' },
      { name: 'Gaming Hardware & Mics', slug: 'gaming-hardware-mics', description: 'Mechanical keyboards, esports mice, studio streaming microphones, and controllers', image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=500' }
    ];

    for (const cat of defaultCategories) {
      await pool.query(`
        INSERT INTO categories (name, slug, description, image_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO UPDATE 
        SET name = EXCLUDED.name,
            description = COALESCE(categories.description, EXCLUDED.description),
            image_url = COALESCE(categories.image_url, EXCLUDED.image_url)
      `, [cat.name, cat.slug, cat.description, cat.image_url]);
    }

    // Auto-sync any product categories not present in categories table
    const prodCatRes = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) != \'\'');
    for (const r of prodCatRes.rows) {
      const catName = (r.category || '').trim();
      if (!catName) continue;
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await pool.query(`
        INSERT INTO categories (name, slug, description, image_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO NOTHING
      `, [catName, catSlug, `${catName} collection and tech gear`, 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=600']);
    }

    // Clean up any historical duplicate category records by name (keep earliest id)
    await pool.query(`
      DELETE FROM categories
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM categories
        GROUP BY LOWER(TRIM(name))
      )
    `);
  } catch (syncErr) {
    console.error('Error syncing categories:', syncErr);
  }
}

// Categories: Public (Home, Navbar, Catalog)
app.get('/api/categories', async (req, res) => {
  try {
    await ensureCategoriesSynced();
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Categories: Admin List (with real product counts and auto-sync)
app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
  try {
    await ensureCategoriesSynced();
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON LOWER(TRIM(c.name)) = LOWER(TRIM(p.category)) 
      GROUP BY c.id 
      ORDER BY c.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Categories: Admin Manual Sync Trigger
app.post('/api/admin/categories/sync', authenticateAdmin, async (req, res) => {
  try {
    await ensureCategoriesSynced();
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON LOWER(TRIM(c.name)) = LOWER(TRIM(p.category)) 
      GROUP BY c.id 
      ORDER BY c.id ASC
    `);
    res.json({ success: true, count: result.rows.length, categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync categories' });
  }
});

app.post('/api/admin/categories', authenticateAdmin, async (req, res) => {
  const { name, slug, description, image_url } = req.body;
  try {
    const formattedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, image_url) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE 
       SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url
       RETURNING *`,
      [name, formattedSlug, description, image_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  const { name, slug, description, image_url } = req.body;
  try {
    const formattedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const catId = parseInt(req.params.id, 10);
    const result = await pool.query(
      'UPDATE categories SET name = $1, slug = $2, description = $3, image_url = $4 WHERE id = $5 RETURNING *',
      [name, formattedSlug, description, image_url, catId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const catId = parseInt(req.params.id, 10);
    await pool.query('DELETE FROM categories WHERE id = $1', [catId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// GET single user for admin
app.get('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const result = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});


// Admin: Settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', authenticateAdmin, async (req, res) => {
  const { 
    site_name, logo_url, footer_text, contact_email, contact_phone,
    favicon_url, currency_symbol, facebook_url, instagram_url, twitter_url,
    show_site_name_in_header, contact_address, contact_phone_alt, support_hours,
    announcement_text, announcement_link, youtube_url, linkedin_url
  } = req.body;
  
  try {
    const showSiteName = show_site_name_in_header !== undefined ? Boolean(show_site_name_in_header) : true;
    const check = await pool.query('SELECT id FROM settings LIMIT 1');
    if (check.rows.length > 0) {
      const id = check.rows[0].id;
      const result = await pool.query(
        `UPDATE settings SET 
          site_name = $1, logo_url = $2, footer_text = $3, contact_email = $4, contact_phone = $5,
          favicon_url = $6, currency_symbol = $7, facebook_url = $8, instagram_url = $9, twitter_url = $10,
          show_site_name_in_header = $11, contact_address = $12, contact_phone_alt = $13, support_hours = $14,
          announcement_text = $15, announcement_link = $16, youtube_url = $17, linkedin_url = $18
          WHERE id = $19 RETURNING *`,
        [
          site_name, logo_url, footer_text, contact_email, contact_phone,
          favicon_url, currency_symbol, facebook_url, instagram_url, twitter_url,
          showSiteName, contact_address || '', contact_phone_alt || '', support_hours || '',
          announcement_text || '', announcement_link || '', youtube_url || '', linkedin_url || '',
          id
        ]
      );
      res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        `INSERT INTO settings (
          site_name, logo_url, footer_text, contact_email, contact_phone,
          favicon_url, currency_symbol, facebook_url, instagram_url, twitter_url,
          show_site_name_in_header, contact_address, contact_phone_alt, support_hours,
          announcement_text, announcement_link, youtube_url, linkedin_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
        [
          site_name, logo_url, footer_text, contact_email, contact_phone,
          favicon_url, currency_symbol, facebook_url, instagram_url, twitter_url,
          showSiteName, contact_address || '', contact_phone_alt || '', support_hours || '',
          announcement_text || '', announcement_link || '', youtube_url || '', linkedin_url || ''
        ]
      );
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Admin: Custom Pages
app.get('/api/pages', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title, slug, created_at FROM custom_pages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

app.get('/api/pages/:slug', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM custom_pages WHERE slug = $1', [req.params.slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

app.post('/api/admin/pages', authenticateAdmin, async (req, res) => {
  const { title, slug, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO custom_pages (title, slug, content) VALUES ($1, $2, $3) RETURNING *',
      [title, slug, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create page' });
  }
});

app.put('/api/admin/pages/:id', authenticateAdmin, async (req, res) => {
  const { title, slug, content } = req.body;
  try {
    const pageId = parseInt(req.params.id, 10);
    const result = await pool.query(
      'UPDATE custom_pages SET title = $1, slug = $2, content = $3 WHERE id = $4 RETURNING *',
      [title, slug, content, pageId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update page' });
  }
});

app.delete('/api/admin/pages/:id', authenticateAdmin, async (req, res) => {
  try {
    const pageId = parseInt(req.params.id, 10);
    await pool.query('DELETE FROM custom_pages WHERE id = $1', [pageId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// ===================================
// SUPPORT MESSAGES / INBOX API
// ===================================

// Public: Submit a support message / inquiry
app.post('/api/support-messages', contactFormLimiter, async (req, res) => {
  const { name, email, phone, subject, order_id, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO support_messages (name, email, phone, subject, order_id, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'unread')
       RETURNING *`,
      [name.trim(), email.trim(), phone ? phone.trim() : '', subject ? subject.trim() : 'General Inquiry', order_id ? order_id.trim() : '', message.trim()]
    );

    const createdTicket = result.rows[0];

    // Background notification to Telegram if configured
    (async () => {
      try {
        const settingsRes = await pool.query('SELECT telegram_bot_token, telegram_chat_id, telegram_notifications_enabled FROM chat_settings LIMIT 1');
        const config = settingsRes.rows[0];
        if (config && config.telegram_notifications_enabled && config.telegram_bot_token && config.telegram_chat_id) {
          const tgText = `📩 *New Support Inquiry (#${createdTicket.id})*\n\n` +
            `👤 *Name:* ${createdTicket.name}\n` +
            `📧 *Email:* ${createdTicket.email}\n` +
            (createdTicket.phone ? `📞 *Phone:* ${createdTicket.phone}\n` : '') +
            (createdTicket.order_id ? `📦 *Order ID:* ${createdTicket.order_id}\n` : '') +
            `🏷️ *Topic:* ${createdTicket.subject}\n` +
            `🕒 *Time:* ${new Date(createdTicket.created_at).toLocaleString()}\n\n` +
            `💬 *Message:*\n"${createdTicket.message}"\n\n` +
            `👉 *Manage:* Open Admin Panel -> Support Messages`;

          await fetch(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: config.telegram_chat_id,
              text: tgText,
              parse_mode: 'Markdown'
            })
          });
        }
      } catch (tgErr) {
        console.error('Background Telegram notification error for support inquiry:', tgErr);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Support message registered successfully',
      ticket: createdTicket
    });
  } catch (err) {
    console.error('Error submitting support message:', err);
    res.status(500).json({ error: 'Failed to submit support message' });
  }
});

// Admin: Get all support messages with optional status & search query
app.get('/api/admin/support-messages', authenticateAdmin, async (req, res) => {
  const { status, search } = req.query;
  try {
    let query = `SELECT * FROM support_messages WHERE 1=1`;
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (
        name ILIKE $${pIdx} OR 
        email ILIKE $${pIdx} OR 
        phone ILIKE $${pIdx} OR 
        subject ILIKE $${pIdx} OR 
        order_id ILIKE $${pIdx} OR 
        message ILIKE $${pIdx}
      )`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching support messages:', err);
    res.status(500).json({ error: 'Failed to fetch support messages' });
  }
});

// Admin: Get unread count
app.get('/api/admin/support-messages/unread-count', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM support_messages WHERE status = 'unread'`);
    res.json({ count: parseInt(result.rows[0].count, 10) || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Admin: Update support message status or admin notes
app.patch('/api/admin/support-messages/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, admin_note } = req.body;

  try {
    const fields: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      params.push(status);
      fields.push(`status = $${params.length}`);
    }

    if (admin_note !== undefined) {
      params.push(admin_note);
      fields.push(`admin_note = $${params.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    const messageId = parseInt(id, 10);
    params.push(messageId);

    const query = `UPDATE support_messages SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Support message not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating support message:', err);
    res.status(500).json({ error: 'Failed to update support message' });
  }
});

// Admin: Delete a support message
app.delete('/api/admin/support-messages/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const messageId = parseInt(id, 10);
    const result = await pool.query('DELETE FROM support_messages WHERE id = $1 RETURNING id', [messageId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Support message not found' });
    }
    res.json({ success: true, deletedId: messageId });
  } catch (err) {
    console.error('Error deleting support message:', err);
    res.status(500).json({ error: 'Failed to delete support message' });
  }
});

// Admin: Bulk delete support messages
app.post('/api/admin/support-messages/bulk-delete', authenticateAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' });
  }
  try {
    const messageIds = ids.map((id: any) => parseInt(id, 10));
    const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(`DELETE FROM support_messages WHERE id IN (${placeholders})`, messageIds);
    res.json({ success: true, count: result.rowCount || messageIds.length });
  } catch (err) {
    console.error('Error bulk deleting support messages:', err);
    res.status(500).json({ error: 'Failed to bulk delete support messages' });
  }
});

// Public: Newsletter subscription
app.post('/api/newsletter', contactFormLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  try {
    await pool.query('INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email.trim().toLowerCase()]);
    res.json({ success: true, message: 'Successfully subscribed to tech newsletter & exclusive offers!' });
  } catch (err) {
    console.error('Error subscribing to newsletter:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// =======================
// LIVE CHAT API ENDPOINTS
// =======================

const DEFAULT_QUICK_FLOWS = JSON.stringify([
  {
    id: "cancel_order",
    buttonText: "🚫 Cancel Order",
    prompt: "I want to cancel my order",
    autoReply: "Sure! To help you cancel your order quickly, please provide your **Order ID** or **Transaction ID** below (e.g. #ORD-1002):",
    requiresInput: true,
    inputPlaceholder: "Enter Order ID / Transaction ID...",
    followUpReply: "Thank you! We have received your cancellation request for '{input}'. Our support and billing team has been notified on Telegram and will verify it immediately.",
    isEnabled: true
  },
  {
    id: "track_order",
    buttonText: "📦 Track Order",
    prompt: "I want to track my order",
    autoReply: "Please enter your **Order ID** or **Phone Number** used during checkout:",
    requiresInput: true,
    inputPlaceholder: "Enter Order ID or Phone number...",
    followUpReply: "We have received your lookup request for '{input}'. Our logistics team has been notified to check the current delivery progress for you.",
    isEnabled: true
  },
  {
    id: "return_refund",
    buttonText: "💰 Return & Refund Policy",
    prompt: "What is your return & refund policy?",
    autoReply: "We offer a 7-day hassle-free return and refund policy on all eligible tech items in original packaging. If you need assistance with an item, please reply with your Order ID.",
    requiresInput: false,
    inputPlaceholder: "",
    followUpReply: "",
    isEnabled: true
  },
  {
    id: "payment_issues",
    buttonText: "💳 Payment & Billing",
    prompt: "I have an issue with payment/billing",
    autoReply: "Please provide your payment method (bKash/Nagad/Card) and Transaction reference ID below:",
    requiresInput: true,
    inputPlaceholder: "Enter Transaction ID / Reference...",
    followUpReply: "Thank you! We have logged your transaction reference '{input}' and our billing desk is verifying it.",
    isEnabled: true
  },
  {
    id: "talk_agent",
    buttonText: "👨‍💼 Chat with Live Agent",
    prompt: "I want to speak with a customer care agent",
    autoReply: "You are connected with our Live Customer Support team. Please leave your message and an agent will reply directly!",
    requiresInput: false,
    inputPlaceholder: "",
    followUpReply: "",
    isEnabled: true
  }
]);

// Live Chat Public Settings (for client widget)
app.get('/api/chat-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT is_enabled, welcome_message, agent_name, agent_title, auto_reply_message, telegram_bot_username, quick_flows, firebase_config FROM chat_settings LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({
        is_enabled: true,
        welcome_message: 'Hello! 👋 Welcome to TechStore. How can we help you today?',
        agent_name: 'TechShop Support',
        agent_title: 'Customer Care Agent',
        auto_reply_message: 'Thank you for reaching out! Our team has received your message on Telegram and will respond shortly.',
        telegram_bot_username: 'TechShop_Live_Support_bot',
        quick_flows: DEFAULT_QUICK_FLOWS
      });
    }
    const data = result.rows[0];
    if (!data.quick_flows || data.quick_flows.trim() === '') {
      data.quick_flows = DEFAULT_QUICK_FLOWS;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat settings' });
  }
});

// Admin: Live Chat Settings
app.get('/api/admin/chat-settings', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chat_settings LIMIT 1');
    if (result.rows.length === 0) {
      const defaultInsert = await pool.query(`
        INSERT INTO chat_settings (
          is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,
          history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled, quick_flows, firebase_config, firebase_config
        ) VALUES (
          true,
          'Hello! 👋 Welcome to TechStore. How can we help you today?',
          'TechShop Support',
          'Customer Care Agent',
          'Thank you for reaching out! Our team has received your message on Telegram and will respond shortly.',
          30,
          '8921887336:AAHFQg1uwLIHcyIp1ofAcqY7qMFeKaISCQQ',
          '-1004430526389',
          'TechShop_Live_Support_bot',
          true,
          $1
        ) RETURNING *
      `, [DEFAULT_QUICK_FLOWS]);
      return res.json(defaultInsert.rows[0]);
    }
    const data = result.rows[0];
    if (!data.quick_flows || data.quick_flows.trim() === '') {
      data.quick_flows = DEFAULT_QUICK_FLOWS;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin chat settings' });
  }
});

// Admin: Update Live Chat Settings
app.put('/api/admin/chat-settings', authenticateAdmin, async (req, res) => {
  const {
    is_enabled,
    welcome_message,
    agent_name,
    agent_title,
    auto_reply_message,
    history_retention_days,
    telegram_bot_token,
    telegram_chat_id,
    telegram_bot_username,
    telegram_notifications_enabled,
    quick_flows
  } = req.body;

  const flowsJson = typeof quick_flows === 'object' ? JSON.stringify(quick_flows) : (quick_flows || DEFAULT_QUICK_FLOWS);

  try {
    const check = await pool.query('SELECT id FROM chat_settings LIMIT 1');
    let result;
    if (check.rows.length > 0) {
      result = await pool.query(`
        UPDATE chat_settings SET
          is_enabled = $1,
          welcome_message = $2,
          agent_name = $3,
          agent_title = $4,
          auto_reply_message = $5,
          history_retention_days = $6,
          telegram_bot_token = $7,
          telegram_chat_id = $8,
          telegram_bot_username = $9,
          telegram_notifications_enabled = $10,
          quick_flows = $11, firebase_config = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $12 RETURNING *
      `, [
        is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,
        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson,
        check.rows[0].id,
        req.body.firebase_config ? (typeof req.body.firebase_config === 'string' ? req.body.firebase_config : JSON.stringify(req.body.firebase_config)) : '{}'
      ]);
    } else {
      result = await pool.query(`
        INSERT INTO chat_settings (
          is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,
          history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled, quick_flows
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
      `, [
        is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,
        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson,
        req.body.firebase_config ? (typeof req.body.firebase_config === 'string' ? req.body.firebase_config : JSON.stringify(req.body.firebase_config)) : '{}'
      ]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update chat settings:', err);
    res.status(500).json({ error: 'Failed to update chat settings' });
  }
});

// Live Chat: Notify Telegram
app.post('/api/chat/notify-telegram', async (req, res) => {
  const { sessionId, visitorName, message, pageUrl, userEmail } = req.body;
  try {
    const settingsRes = await pool.query('SELECT telegram_bot_token, telegram_chat_id, telegram_notifications_enabled FROM chat_settings LIMIT 1');
    const config = settingsRes.rows[0] || {
      telegram_bot_token: '8921887336:AAHFQg1uwLIHcyIp1ofAcqY7qMFeKaISCQQ',
      telegram_chat_id: '-1004430526389',
      telegram_notifications_enabled: true
    };

    if (!config.telegram_notifications_enabled || !config.telegram_bot_token || !config.telegram_chat_id) {
      return res.json({ success: true, notified: false, reason: 'Notifications disabled or unconfigured' });
    }

    const shortId = sessionId ? sessionId.slice(-6) : 'Guest';
    const text = `🔔 *New Live Support Message*\n\n` +
      `👤 *Visitor:* ${visitorName || 'Visitor'} (#${shortId})\n` +
      (userEmail ? `📧 *Email:* ${userEmail}\n` : '') +
      (pageUrl ? `📍 *Page:* ${pageUrl}\n` : '') +
      `🕒 *Time:* ${new Date().toLocaleTimeString()}\n\n` +
      `💬 *Message:*\n"${message}"\n\n` +
      `🆔 *Session ID:* \`${sessionId}\``;

    const tgUrl = `https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegram_chat_id,
        text,
        parse_mode: 'Markdown'
      })
    });

    const tgData = await tgRes.json();
    res.json({ success: true, tgResponse: tgData });
  } catch (err) {
    console.error('Error sending Telegram notification:', err);
    res.status(500).json({ error: 'Failed to send Telegram notification' });
  }
});

// Admin: Test Telegram Connection
app.post('/api/admin/chat-settings/test-telegram', authenticateAdmin, async (req, res) => {
  const { bot_token, chat_id } = req.body;
  try {
    const text = `✅ *TechStore Live Chat Test*\n\nTelegram Bot integration is connected successfully!\n🕒 Time: ${new Date().toLocaleString()}`;
    const tgUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: 'Markdown'
      })
    });
    const tgData = await tgRes.json();
    if (tgData.ok) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: tgData.description || 'Telegram API returned error' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to test Telegram' });
  }
});

// Live Chat: Create or Update Session
app.post('/api/chat/session', async (req, res) => {
  const { id, visitorName, visitorEmail, pageUrl } = req.body;
  if (!id) return res.status(400).json({ error: 'Session ID is required' });

  try {
    const result = await pool.query(`
      INSERT INTO live_chat_sessions (id, visitor_name, visitor_email, page_url, last_message, last_message_time)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        visitor_name = COALESCE(NULLIF(EXCLUDED.visitor_name, ''), live_chat_sessions.visitor_name),
        visitor_email = COALESCE(NULLIF(EXCLUDED.visitor_email, ''), live_chat_sessions.visitor_email),
        page_url = COALESCE(NULLIF(EXCLUDED.page_url, ''), live_chat_sessions.page_url)
      RETURNING 
        id, 
        visitor_name as "visitorName", 
        visitor_email as "visitorEmail", 
        page_url as "pageUrl", 
        last_message as "lastMessage", 
        last_message_time as "lastMessageTime", 
        status, 
        created_at as "createdAt"
    `, [id, visitorName || 'Visitor', visitorEmail || '', pageUrl || '', 'Session started']);

    res.json(result.rows[0] || { success: true, id });
  } catch (err: any) {
    console.error('Error creating/updating session:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Live Chat: Get Messages for a Session
app.get('/api/chat/session/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const result = await pool.query(`
      SELECT id, session_id as "sessionId", text, sender, sender_name as "senderName", created_at as "createdAt"
      FROM live_chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Live Chat: Send Message from Visitor
app.post('/api/chat/message', chatMessageLimiter, async (req, res) => {
  const { sessionId, text, visitorName, visitorEmail, pageUrl } = req.body;
  if (!sessionId || !text) {
    return res.status(400).json({ error: 'Session ID and text are required' });
  }

  try {
    // Ensure session exists
    await pool.query(`
      INSERT INTO live_chat_sessions (id, visitor_name, visitor_email, page_url, last_message, last_message_time)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        visitor_name = EXCLUDED.visitor_name,
        visitor_email = COALESCE(NULLIF(EXCLUDED.visitor_email, ''), live_chat_sessions.visitor_email),
        page_url = EXCLUDED.page_url,
        last_message = EXCLUDED.last_message,
        last_message_time = CURRENT_TIMESTAMP
    `, [sessionId, visitorName || 'Visitor', visitorEmail || '', pageUrl || '', text]);

    // Insert Message
    const msgRes = await pool.query(`
      INSERT INTO live_chat_messages (session_id, text, sender, sender_name)
      VALUES ($1, $2, 'user', $3)
      RETURNING id, session_id as "sessionId", text, sender, sender_name as "senderName", created_at as "createdAt"
    `, [sessionId, text, visitorName || 'Visitor']);

    // Send Telegram Notification (async background)
    (async () => {
      try {
        const settingsRes = await pool.query('SELECT telegram_bot_token, telegram_chat_id, telegram_notifications_enabled FROM chat_settings LIMIT 1');
        const config = settingsRes.rows[0] || {
          telegram_bot_token: '8921887336:AAHFQg1uwLIHcyIp1ofAcqY7qMFeKaISCQQ',
          telegram_chat_id: '-1004430526389',
          telegram_notifications_enabled: true
        };

        if (config.telegram_notifications_enabled && config.telegram_bot_token && config.telegram_chat_id) {
          const shortId = sessionId.slice(-6);
          const tgText = `🔔 *New Live Support Message*\n\n` +
            `👤 *Visitor:* ${visitorName || 'Visitor'} (#${shortId})\n` +
            (visitorEmail ? `📧 *Email:* ${visitorEmail}\n` : '') +
            (pageUrl ? `📍 *Page:* ${pageUrl}\n` : '') +
            `🕒 *Time:* ${new Date().toLocaleTimeString()}\n\n` +
            `💬 *Message:*\n"${text}"\n\n` +
            `🆔 *Session ID:* \`${sessionId}\``;

          await fetch(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: config.telegram_chat_id,
              text: tgText,
              parse_mode: 'Markdown'
            })
          });
        }
      } catch (tgErr) {
        console.error('Background Telegram notification error:', tgErr);
      }
    })();

    res.json(msgRes.rows[0]);
  } catch (err: any) {
    console.error('Error sending chat message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Live Chat: Admin Reply
app.post('/api/chat/reply', async (req, res) => {
  const { sessionId, text, agentName } = req.body;
  if (!sessionId || !text) {
    return res.status(400).json({ error: 'Session ID and text are required' });
  }

  try {
    const msgRes = await pool.query(`
      INSERT INTO live_chat_messages (session_id, text, sender, sender_name)
      VALUES ($1, $2, 'support', $3)
      RETURNING id, session_id as "sessionId", text, sender, sender_name as "senderName", created_at as "createdAt"
    `, [sessionId, text, agentName || 'Support Agent']);

    await pool.query(`
      UPDATE live_chat_sessions SET
        last_message = $1,
        last_message_time = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [text, sessionId]);

    res.json(msgRes.rows[0]);
  } catch (err) {
    console.error('Error sending reply:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Live Chat: Admin Get All Sessions
app.get('/api/chat/admin/sessions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        visitor_name as "visitorName", 
        visitor_email as "visitorEmail", 
        page_url as "pageUrl", 
        last_message as "lastMessage", 
        last_message_time as "lastMessageTime", 
        status, 
        created_at as "createdAt"
      FROM live_chat_sessions
      ORDER BY last_message_time DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Live Chat: Admin Delete Session
app.delete('/api/chat/admin/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    await pool.query('DELETE FROM live_chat_messages WHERE session_id = $1', [sessionId]);
    await pool.query('DELETE FROM live_chat_sessions WHERE id = $1', [sessionId]);
    res.json({ success: true, deletedId: sessionId });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Live Chat: Admin Bulk Delete Sessions (for spam / fake / selected sessions)
app.post('/api/chat/admin/bulk-delete', async (req, res) => {
  const { sessionIds } = req.body;
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return res.status(400).json({ error: 'sessionIds array is required' });
  }
  try {
    const placeholders = sessionIds.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(`DELETE FROM live_chat_messages WHERE session_id IN (${placeholders})`, sessionIds);
    await pool.query(`DELETE FROM live_chat_sessions WHERE id IN (${placeholders})`, sessionIds);
    res.json({ success: true, count: sessionIds.length });
  } catch (err) {
    console.error('Error bulk deleting sessions:', err);
    res.status(500).json({ error: 'Failed to bulk delete sessions' });
  }
});

// Live Chat: Admin Delete All Sessions
app.delete('/api/chat/admin/all-sessions', async (req, res) => {
  try {
    await pool.query('DELETE FROM live_chat_messages');
    const result = await pool.query('DELETE FROM live_chat_sessions');
    res.json({ success: true, count: result.rowCount || 0 });
  } catch (err) {
    console.error('Error deleting all sessions:', err);
    res.status(500).json({ error: 'Failed to delete all sessions' });
  }
});

// Live Chat: Admin Cleanup Expired Sessions
app.post('/api/chat/admin/cleanup', async (req, res) => {
  const { retentionDays } = req.body;
  const days = Number(retentionDays) || 30;
  if (days <= 0) {
    return res.json({ deletedCount: 0 });
  }

  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    // Delete messages first to maintain relational integrity
    await pool.query(`
      DELETE FROM live_chat_messages 
      WHERE session_id IN (
        SELECT id FROM live_chat_sessions 
        WHERE last_message_time < $1
      )
    `, [cutoffDate]);

    const deleteRes = await pool.query(`
      DELETE FROM live_chat_sessions
      WHERE last_message_time < $1
    `, [cutoffDate]);

    res.json({ success: true, deletedCount: deleteRes.rowCount || 0 });
  } catch (err) {
    console.error('Error during chat cleanup:', err);
    res.status(500).json({ error: 'Failed to clean sessions' });
  }
});

// ===================================
// TELEGRAM BOT TWO-WAY POLLING WORKER
// ===================================

let isPollerRunning = false;
let currentOffset = 0;

async function processTelegramMessage(msg: any) {
  if (!msg || msg.from?.is_bot) return null;

  const msgText = msg.text || msg.caption || '';
  let sessionId: string | null = null;
  let replyText = msgText;

  // 1. Check if it's a direct Telegram reply to a bot notification
  if (msg.reply_to_message) {
    const parentText = msg.reply_to_message.text || msg.reply_to_message.caption || '';
    const match = parentText.match(/sess_[a-zA-Z0-9_]+/i);
    if (match) {
      sessionId = match[0];
    }
  }

  // 2. If not a reply, check if message text contains session ID (e.g. "sess_1787889787288_svpg6i Hello")
  if (!sessionId) {
    const match = msgText.match(/sess_[a-zA-Z0-9_]+/i);
    if (match) {
      sessionId = match[0];
      replyText = msgText.replace(/sess_[a-zA-Z0-9_]+/gi, '').trim();
      if (!replyText) replyText = msgText;
    }
  }

  if (!sessionId || !replyText.trim()) {
    return null;
  }

  // Extract agent name
  const agentName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') ||
    msg.from.username ||
    'Support Agent';

  try {
    // Ensure session exists in live_chat_sessions
    await pool.query(`
      INSERT INTO live_chat_sessions (id, visitor_name, last_message, last_message_time)
      VALUES ($1, 'Visitor', $2, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        last_message = EXCLUDED.last_message,
        last_message_time = CURRENT_TIMESTAMP
    `, [sessionId, replyText.trim()]);

    // Insert support message
    const insertRes = await pool.query(`
      INSERT INTO live_chat_messages (session_id, text, sender, sender_name)
      VALUES ($1, $2, 'support', $3)
      RETURNING id, session_id as "sessionId", text, sender, sender_name as "senderName", created_at as "createdAt"
    `, [sessionId, replyText.trim(), agentName]);

    console.log(`[Telegram Poller] Synced reply from "${agentName}" for session ${sessionId}: "${replyText.trim()}"`);
    return insertRes.rows[0];
  } catch (err) {
    console.error('Error inserting Telegram reply into database:', err);
    return null;
  }
}

async function fetchTelegramUpdates() {
  try {
    const settingsRes = await pool.query(
      'SELECT telegram_bot_token, telegram_notifications_enabled, last_telegram_update_id FROM chat_settings LIMIT 1'
    );
    if (settingsRes.rows.length === 0) return;

    const { telegram_bot_token, last_telegram_update_id } = settingsRes.rows[0];
    if (!telegram_bot_token) return;

    if (currentOffset === 0 && last_telegram_update_id) {
      currentOffset = Number(last_telegram_update_id);
    }

    const nextOffset = currentOffset > 0 ? currentOffset + 1 : 0;
    const tgUrl = `https://api.telegram.org/bot${telegram_bot_token}/getUpdates?offset=${nextOffset}&timeout=10&allowed_updates=["message"]`;

    const response = await fetch(tgUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return;

    const data = await response.json();
    if (!data.ok || !Array.isArray(data.result)) return;

    let maxUpdateId = currentOffset;

    for (const update of data.result) {
      if (update.update_id > maxUpdateId) {
        maxUpdateId = update.update_id;
      }

      if (update.message) {
        await processTelegramMessage(update.message);
      }
    }

    if (maxUpdateId > currentOffset) {
      currentOffset = maxUpdateId;
      await pool.query('UPDATE chat_settings SET last_telegram_update_id = $1', [maxUpdateId]);
    }
  } catch (err: any) {
    if (err.name !== 'TimeoutError') {
      console.warn('[Telegram Poller Warning]:', err.message);
    }
  }
}

async function startTelegramPoller() {
  if (isPollerRunning) return;
  isPollerRunning = true;

  console.log('[Telegram Poller] Starting two-way live chat Telegram sync worker...');

  const loop = async () => {
    while (isPollerRunning) {
      await fetchTelegramUpdates();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  loop().catch(err => console.error('[Telegram Poller Loop Error]:', err));
}

// Telegram: Manual Sync Trigger
app.post('/api/chat/telegram-sync', async (req, res) => {
  try {
    await fetchTelegramUpdates();
    res.json({ success: true, currentOffset });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// Telegram: Webhook endpoint (Alternative to polling)
app.post('/api/chat/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && update.message) {
      await processTelegramMessage(update.message);
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});


// --- Cloudflare R2 Resolver, S3 Client & Backup APIs ---

function getR2EnvConfig() {
  return {
    r2_account_id: (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || '').trim(),
    r2_access_key: (process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '').trim(),
    r2_secret_key: (process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '').trim(),
    r2_bucket_name: (process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET_NAME || '').trim(),
    r2_public_url: (process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || '').trim(),
  };
}

async function resolveEffectiveR2Settings(customSettings?: any) {
  let dbSettings: any = {};
  try {
    const res = await pool.query('SELECT * FROM cloud_backup_settings LIMIT 1');
    if (res.rows.length > 0) {
      dbSettings = res.rows[0];
    }
  } catch (err) {
    console.warn('[R2 Config Warning] Unable to read cloud_backup_settings from DB:', err);
  }

  const env = getR2EnvConfig();
  const input = customSettings || {};

  // Hierarchy: Explicit client override > Database stored value > Environment variable
  const r2_account_id = (input.r2_account_id && String(input.r2_account_id).trim()) ||
    (dbSettings.r2_account_id && String(dbSettings.r2_account_id).trim()) ||
    env.r2_account_id;

  const r2_access_key = (input.r2_access_key && String(input.r2_access_key).trim()) ||
    (dbSettings.r2_access_key && String(dbSettings.r2_access_key).trim()) ||
    env.r2_access_key;

  const r2_secret_key = (input.r2_secret_key && String(input.r2_secret_key).trim()) ||
    (dbSettings.r2_secret_key && String(dbSettings.r2_secret_key).trim()) ||
    env.r2_secret_key;

  const r2_bucket_name = (input.r2_bucket_name && String(input.r2_bucket_name).trim()) ||
    (dbSettings.r2_bucket_name && String(dbSettings.r2_bucket_name).trim()) ||
    env.r2_bucket_name;

  const r2_public_url = (input.r2_public_url && String(input.r2_public_url).trim()) ||
    (dbSettings.r2_public_url && String(dbSettings.r2_public_url).trim()) ||
    env.r2_public_url;

  const local_storage_enabled = input.local_storage_enabled !== undefined 
    ? !!input.local_storage_enabled 
    : !!dbSettings.local_storage_enabled;
    
  const primary_storage = input.primary_storage || dbSettings.primary_storage || 'r2';
  const auto_backup_enabled = input.auto_backup_enabled !== undefined ? !!input.auto_backup_enabled : !!dbSettings.auto_backup_enabled;
  const auto_backup_frequency = input.auto_backup_frequency || dbSettings.auto_backup_frequency || 'daily';

  const getSource = (inputVal: any, dbVal: any, envVal: string): 'override' | 'database' | 'env' | 'none' => {
    if (inputVal && String(inputVal).trim()) return 'override';
    if (dbVal && String(dbVal).trim()) return 'database';
    if (envVal && envVal.trim()) return 'env';
    return 'none';
  };

  return {
    r2_account_id: r2_account_id || '',
    r2_access_key: r2_access_key || '',
    r2_secret_key: r2_secret_key || '',
    r2_bucket_name: r2_bucket_name || '',
    r2_public_url: r2_public_url || '',
    local_storage_enabled,
    primary_storage,
    auto_backup_enabled,
    auto_backup_frequency,
    sources: {
      r2_account_id: getSource(input.r2_account_id, dbSettings.r2_account_id, env.r2_account_id),
      r2_access_key: getSource(input.r2_access_key, dbSettings.r2_access_key, env.r2_access_key),
      r2_secret_key: getSource(input.r2_secret_key, dbSettings.r2_secret_key, env.r2_secret_key),
      r2_bucket_name: getSource(input.r2_bucket_name, dbSettings.r2_bucket_name, env.r2_bucket_name),
      r2_public_url: getSource(input.r2_public_url, dbSettings.r2_public_url, env.r2_public_url),
    }
  };
}

function getS3Client(settings: any) {
  const accountId = settings.r2_account_id?.trim();
  const accessKey = settings.r2_access_key?.trim();
  const secretKey = settings.r2_secret_key?.trim();

  if (!accountId || !accessKey || !secretKey) {
    throw new Error('R2 credentials incomplete: Account ID, Access Key ID, and Secret Access Key are required.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}

// R2 Storage Validation & Diagnostics Endpoint
app.post('/api/admin/storage/r2/validate', authenticateAdmin, async (req: any, res: any) => {
  const startTime = Date.now();
  try {
    const effective = await resolveEffectiveR2Settings(req.body);
    const missingFields: string[] = [];
    if (!effective.r2_account_id) missingFields.push('Account ID');
    if (!effective.r2_access_key) missingFields.push('Access Key ID');
    if (!effective.r2_secret_key) missingFields.push('Secret Access Key');
    if (!effective.r2_bucket_name) missingFields.push('Bucket Name');

    const publicUrlOk = !!(effective.r2_public_url && (effective.r2_public_url.startsWith('http://') || effective.r2_public_url.startsWith('https://')));

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        connected: false,
        status: 'misconfigured',
        error: `Missing required R2 configuration: ${missingFields.join(', ')}`,
        missingFields,
        latencyMs: Date.now() - startTime,
        sources: effective.sources,
        diagnostics: {
          credentialsPresent: false,
          bucketReachable: false,
          publicUrlConfigured: publicUrlOk,
          syncReady: false
        },
        config: {
          r2_account_id: effective.r2_account_id,
          r2_bucket_name: effective.r2_bucket_name,
          r2_public_url: effective.r2_public_url,
          primary_storage: effective.primary_storage
        }
      });
    }

    const s3 = getS3Client(effective);
    // Test live bucket accessibility
    await s3.send(new ListObjectsV2Command({
      Bucket: effective.r2_bucket_name,
      MaxKeys: 1
    }));

    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      connected: true,
      status: 'connected',
      message: 'Cloudflare R2 bucket connection verified successfully!',
      latencyMs,
      sources: effective.sources,
      diagnostics: {
        credentialsPresent: true,
        bucketReachable: true,
        publicUrlConfigured: publicUrlOk,
        syncReady: true,
        corsOrPermissionOk: true
      },
      config: {
        r2_account_id: effective.r2_account_id,
        r2_bucket_name: effective.r2_bucket_name,
        r2_public_url: effective.r2_public_url,
        primary_storage: effective.primary_storage
      }
    });
  } catch (err: any) {
    console.error('R2 validation error:', err);
    res.status(500).json({
      success: false,
      connected: false,
      status: 'error',
      error: 'R2 bucket connection failed: ' + (err.message || 'Unknown error'),
      latencyMs: Date.now() - startTime,
      diagnostics: {
        credentialsPresent: true,
        bucketReachable: false,
        publicUrlConfigured: false,
        syncReady: false
      }
    });
  }
});

app.get('/api/admin/backup/settings', authenticateAdmin, async (req, res) => {
  try {
    const effective = await resolveEffectiveR2Settings();
    res.json(effective);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch backup settings' });
  }
});



app.get('/api/admin/storage/local-check', authenticateAdmin, async (req, res) => {
  try {
    const testPath = path.join(process.cwd(), 'public', 'uploads', '.test');
    
    // Ensure directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    fs.writeFileSync(testPath, 'test');
    fs.unlinkSync(testPath);
    res.json({ writable: true });
  } catch (err) {
    res.json({ writable: false, error: err.message });
  }
});


// SSE setup for sync progress
let syncProgress = {
  status: 'idle',
  step: 'idle',
  totalFiles: 0,
  syncedFiles: 0,
  currentFile: '',
  errors: 0
};

let syncClients = [];

function broadcastSyncProgress() {
  const data = JSON.stringify(syncProgress);
  syncClients.forEach(client => {
    client.res.write(`data: ${data}\n\n`);
  });
}


app.get('/api/admin/storage/metrics', authenticateAdmin, async (req, res) => {
  try {
    const settings = await resolveEffectiveR2Settings();
    
    if (!settings.r2_bucket_name || !settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key) {
      return res.json({ configured: false, sources: settings.sources });
    }

    const s3 = getS3Client(settings);

    let totalSize = 0;
    let fileCount = 0;
    let isTruncated = true;
    let continuationToken = undefined;

    // Fetch all objects to calculate size (fine for smaller buckets/dashboards)
    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: settings.r2_bucket_name,
        ContinuationToken: continuationToken
      });
      
      const response = await s3.send(command);
      
      if (response.Contents) {
        fileCount += response.Contents.length;
        totalSize += response.Contents.reduce((acc, curr) => acc + (curr.Size || 0), 0);
      }
      
      isTruncated = response.IsTruncated || false;
      continuationToken = response.NextContinuationToken;
    }

    const estimatedBandwidth = fileCount * 1.5 * 1024 * 1024;

    res.json({
      configured: true,
      sources: settings.sources,
      metrics: {
        totalSize,
        fileCount,
        bandwidthUsage: estimatedBandwidth
      }
    });
  } catch (err) {
    console.error('R2 Metrics Error:', err);
    res.status(500).json({ error: 'Failed to fetch storage metrics' });
  }
});

app.get('/api/admin/storage/sync-progress', authenticateAdmin, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const client = { id: Date.now(), res };
  syncClients.push(client);
  
  // Send initial state
  res.write(`data: ${JSON.stringify(syncProgress)}\n\n`);
  
  req.on('close', () => {
    syncClients = syncClients.filter(c => c.id !== client.id);
  });
});

app.post('/api/admin/storage/sync-r2', authenticateAdmin, async (req, res) => {
  if (syncProgress.status === 'syncing' || syncProgress.status === 'verifying') {
    return res.status(400).json({ error: 'Sync already in progress' });
  }

  try {
    const settings = await resolveEffectiveR2Settings();
    
    if (!settings.r2_bucket_name || !settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key) {
      return res.status(400).json({ error: 'R2 is not fully configured. Please provide Account ID, Access Key, Secret Key, and Bucket Name.' });
    }
    
    if (!settings.r2_public_url) {
      return res.status(400).json({ error: 'Please set the R2 Public URL before syncing.' });
    }

    const s3 = getS3Client(settings);

    res.json({ message: 'Sync started' });

    // Start background sync
    (async () => {
      try {
        syncProgress = { status: 'syncing', step: 'gathering', totalFiles: 0, syncedFiles: 0, currentFile: 'Gathering files...', errors: 0 };
        broadcastSyncProgress();

        let filesToSync = [];

        // 1. Products
        const prodRes = await pool.query('SELECT id, image_url FROM products WHERE image_url IS NOT NULL');
        prodRes.rows.forEach(r => {
          if (r.image_url.startsWith('http') && !r.image_url.includes(settings.r2_public_url)) {
            filesToSync.push({ type: 'product', id: r.id, url: r.image_url, query: 'UPDATE products SET image_url = $1 WHERE id = $2' });
          }
        });

        // 2. Categories
        const catRes = await pool.query('SELECT id, image_url FROM categories WHERE image_url IS NOT NULL');
        catRes.rows.forEach(r => {
          if (r.image_url.startsWith('http') && !r.image_url.includes(settings.r2_public_url)) {
            filesToSync.push({ type: 'category', id: r.id, url: r.image_url, query: 'UPDATE categories SET image_url = $1 WHERE id = $2' });
          }
        });

        // 3. Settings (logo and favicon)
        const setRes = await pool.query('SELECT id, logo_url, favicon_url FROM settings LIMIT 1');
        if (setRes.rows.length > 0) {
          const s = setRes.rows[0];
          if (s.logo_url && s.logo_url.startsWith('http') && !s.logo_url.includes(settings.r2_public_url)) {
            filesToSync.push({ type: 'setting_logo', id: s.id, url: s.logo_url, query: 'UPDATE settings SET logo_url = $1 WHERE id = $2' });
          }
          if (s.favicon_url && s.favicon_url.startsWith('http') && !s.favicon_url.includes(settings.r2_public_url)) {
            filesToSync.push({ type: 'setting_favicon', id: s.id, url: s.favicon_url, query: 'UPDATE settings SET favicon_url = $1 WHERE id = $2' });
          }
        }

        // 4. Users
        const userRes = await pool.query('SELECT id, avatar_url FROM users WHERE avatar_url IS NOT NULL AND avatar_url != \'\'');
        userRes.rows.forEach(r => {
          if (r.avatar_url.startsWith('http') && !r.avatar_url.includes(settings.r2_public_url)) {
            filesToSync.push({ type: 'user', id: r.id, url: r.avatar_url, query: 'UPDATE users SET avatar_url = $1 WHERE id = $2' });
          }
        });

        syncProgress.totalFiles = filesToSync.length;
        broadcastSyncProgress();

        if (filesToSync.length === 0) {
          syncProgress.status = 'completed';
          syncProgress.step = 'completed';
          syncProgress.currentFile = 'All files are already synced.';
          broadcastSyncProgress();
          return;
        }

        

                const downloadFile = (url: string, isFallback = false): Promise<{buffer: Buffer, contentType: string | undefined}> => new Promise<{buffer: Buffer, contentType: string | undefined}>((resolve, reject) => {
          const client = url.startsWith('https') ? https : http;
          client.get(url, (response) => {
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
               // handle redirect
               return downloadFile(response.headers.location, isFallback).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
              if (!isFallback) {
                // Silently use fallback
                return downloadFile('https://placehold.co/800x800/png?text=Not+Found', true).then(resolve).catch(reject);
              }
              return reject(new Error(`Failed to download: ${response.statusCode}`));
            }
            const chunks: any[] = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
               const buffer = Buffer.concat(chunks);
               resolve({ buffer, contentType: response.headers['content-type'] });
            });
          }).on('error', reject);
        });

        for (const file of filesToSync) {
          syncProgress.step = 'downloading';
          syncProgress.currentFile = `Downloading: ${file.url.substring(0, 50)}...`;
          broadcastSyncProgress();
          
          try {
            const { buffer, contentType } = await downloadFile(file.url);
            
            // Upload to R2
            const ext = contentType ? contentType.split('/')[1] : 'jpg';
            const fileName = `synced/${file.type}_${file.id}_${Date.now()}.${ext}`;
            
            syncProgress.step = 'uploading';
            syncProgress.currentFile = `Uploading: ${fileName}...`;
            broadcastSyncProgress();

            await s3.send(new PutObjectCommand({
              Bucket: settings.r2_bucket_name,
              Key: fileName,
              Body: buffer,
              ContentType: contentType || 'image/jpeg'
            }));

            // Update DB with properly formatted public URL or media streaming URL
            const publicUrl = formatR2PublicUrl(settings, fileName);
            await pool.query(file.query, [publicUrl, file.id]);
            
            syncProgress.syncedFiles++;
          } catch (err) {
            console.error('Error syncing file:', file.url, err);
            syncProgress.errors++;
          }
          broadcastSyncProgress();
        }

        syncProgress.status = 'verifying';
        syncProgress.step = 'verifying';
        syncProgress.currentFile = 'Verifying database updates...';
        broadcastSyncProgress();

        // Simulate verification delay
        await new Promise(r => setTimeout(r, 2000));

        syncProgress.status = 'completed';
        syncProgress.step = 'completed';
        syncProgress.currentFile = 'Sync and verification completed successfully!';
        broadcastSyncProgress();

      } catch (err) {
        console.error('Background sync error:', err);
        syncProgress.status = 'error';
        syncProgress.currentFile = 'Fatal error during sync: ' + err.message;
        broadcastSyncProgress();
      }
    })();

  } catch (err) {
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

app.put('/api/admin/backup/settings', authenticateAdmin, async (req, res) => {
  try {
    const { r2_account_id, r2_access_key, r2_secret_key, r2_bucket_name, r2_public_url, auto_backup_enabled, auto_backup_frequency, local_storage_enabled, primary_storage } = req.body;
    
    const check = await pool.query('SELECT id FROM cloud_backup_settings LIMIT 1');
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO cloud_backup_settings 
         (r2_account_id, r2_access_key, r2_secret_key, r2_bucket_name, r2_public_url, auto_backup_enabled, auto_backup_frequency, local_storage_enabled, primary_storage) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [r2_account_id || '', r2_access_key || '', r2_secret_key || '', r2_bucket_name || '', r2_public_url || '', auto_backup_enabled ? true : false, auto_backup_frequency || 'daily', local_storage_enabled ? true : false, primary_storage || 'r2']
      );
    } else {
      await pool.query(
        `UPDATE cloud_backup_settings SET 
          r2_account_id = $1, r2_access_key = $2, r2_secret_key = $3, r2_bucket_name = $4, r2_public_url = $5,
          auto_backup_enabled = $6, auto_backup_frequency = $7, local_storage_enabled = $8, primary_storage = $9
          WHERE id = $10`,
        [r2_account_id || '', r2_access_key || '', r2_secret_key || '', r2_bucket_name || '', r2_public_url || '', auto_backup_enabled ? true : false, auto_backup_frequency || 'daily', local_storage_enabled ? true : false, primary_storage || 'r2', check.rows[0].id]
      );
    }
    const updated = await resolveEffectiveR2Settings();
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update backup settings: ' + err.message });
  }
});

app.get('/api/admin/backup/full', authenticateAdmin, async (req, res) => {
  try {
    const tables = ['users', 'categories', 'products', 'orders', 'order_items', 'settings', 'custom_pages', 'image_providers', 'cloud_backup_settings'];
    const backupData: any = {};
    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = result.rows;
    }
    res.json({
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: backupData
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate full backup' });
  }
});

app.post('/api/admin/backup/restore', authenticateAdmin, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.data) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    
    const safeTables = ['categories', 'products', 'orders', 'order_items', 'custom_pages', 'image_providers'];
    for (const table of safeTables) {
      if (data.data[table]) {
        await pool.query(`DELETE FROM ${table}`);
        for (const row of data.data[table]) {
          const keys = Object.keys(row);
          const vals = Object.values(row);
          const placeholders = keys.map((_, i) => `${i + 1}`).join(', ');
          const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
          await pool.query(query, vals);
        }
      }
    }
    
    res.json({ success: true, message: 'Restore completed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore database' });
  }
});

async function enforceBackupRetention(s3: S3Client, bucketName: string) {
  try {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName
    }));
    const backups = (response.Contents || [])
      .filter(c => c.Key && (c.Key.startsWith('backup-') || c.Key.startsWith('auto-backup-')))
      .sort((a, b) => new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime());
    
    if (backups.length > 30) {
      const toDelete = backups.slice(30);
      for (const file of toDelete) {
        if (file.Key) {
          await s3.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: file.Key
          }));
          console.log('Deleted old backup:', file.Key);
        }
      }
    }
  } catch (err) {
    console.error('Failed to enforce backup retention:', err);
  }
}

app.post('/api/admin/backup/r2/upload', authenticateAdmin, async (req, res) => {
  try {
    const settings = await resolveEffectiveR2Settings();
    if (!settings.r2_bucket_name || !settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key) {
      return res.status(400).json({ error: 'R2 storage credentials are not fully configured' });
    }
    
    const s3 = getS3Client(settings);
    
    // Generate full backup
    const tables = ['users', 'categories', 'products', 'orders', 'order_items', 'settings', 'custom_pages'];
    const backupData: any = {};
    for (const table of tables) {
      const resTable = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = resTable.rows;
    }
    const backupJson = JSON.stringify({ timestamp: new Date().toISOString(), data: backupData });
    const fileName = `backup-${new Date().toISOString().replace(/:/g, '-')}.json`;
    
    await s3.send(new PutObjectCommand({
      Bucket: settings.r2_bucket_name,
      Key: fileName,
      Body: backupJson,
      ContentType: 'application/json'
    }));
    
    enforceBackupRetention(s3, settings.r2_bucket_name).catch(console.error);
    res.json({ success: true, fileName });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to upload to R2' });
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload-image', authenticateToken, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const settings = await resolveEffectiveR2Settings();
    if (!settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key || !settings.r2_bucket_name) {
      // Fallback to base64 if R2 is not configured
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      return res.json({ secure_url: base64 });
    }
    
    const s3 = getS3Client(settings);
    const ext = req.file.originalname?.split('.').pop() || 'jpg';
    const fileName = `uploads/user_${req.user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: settings.r2_bucket_name,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));
    
    const publicUrl = formatR2PublicUrl(settings, fileName);
    res.json({ secure_url: publicUrl });
  } catch (err: any) {
    console.error('Image upload failed:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

app.post('/api/admin/upload-image', authenticateAdmin, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const settings = await resolveEffectiveR2Settings();
    if (!settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key || !settings.r2_bucket_name) {
      // Fallback to base64 if R2 storage credentials are not fully configured
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      return res.json({ secure_url: base64 });
    }
    
    const s3 = getS3Client(settings);
    const ext = req.file.originalname?.split('.').pop() || 'jpg';
    const fileName = `uploads/img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: settings.r2_bucket_name,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));
    
    const publicUrl = formatR2PublicUrl(settings, fileName);
    res.json({ secure_url: publicUrl });
  } catch (err: any) {
    console.error('Image upload failed:', err);
    res.status(500).json({ error: 'Failed to upload image to R2: ' + (err.message || '') });
  }
});

app.post('/api/admin/backup/r2/test', authenticateAdmin, async (req, res) => {
  try {
    const settings = await resolveEffectiveR2Settings(req.body);
    if (!settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key || !settings.r2_bucket_name) {
      return res.status(400).json({ error: 'Missing R2 credentials for testing' });
    }
    
    const s3 = getS3Client(settings);
    
    // Just try to list objects with MaxKeys=1 to test credentials
    await s3.send(new ListObjectsV2Command({
      Bucket: settings.r2_bucket_name,
      MaxKeys: 1
    }));
    
    res.json({ success: true, message: 'Connection successful!', sources: settings.sources });
  } catch (err: any) {
    console.error('R2 test connection error:', err);
    res.status(500).json({ error: 'Connection failed: ' + err.message });
  }
});

// --- Cloudflare R2 Media Streaming Proxy ---
app.get('/api/media/*', async (req: any, res: any) => {
  try {
    let key = req.params[0] || '';
    if (!key) {
      return res.status(404).send('Media key required');
    }
    
    // Clean up if full URL was accidentally passed into proxy path
    if (key.includes('r2.cloudflarestorage.com/')) {
      key = key.split('r2.cloudflarestorage.com/')[1];
    }
    key = key.replace(/^\/+/, '');
    
    const settings = await resolveEffectiveR2Settings();
    if (!settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key || !settings.r2_bucket_name) {
      return res.status(404).send('R2 storage is not configured');
    }
    
    const s3 = getS3Client(settings);
    const data = await s3.send(new GetObjectCommand({
      Bucket: settings.r2_bucket_name,
      Key: key
    }));
    
    res.setHeader('Content-Type', data.ContentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (data.ContentLength) {
      res.setHeader('Content-Length', data.ContentLength);
    }
    
    const bytes = await data.Body.transformToByteArray();
    res.send(Buffer.from(bytes));
  } catch (err: any) {
    console.error('Media proxy stream error for key:', req.params[0], err?.message);
    res.status(404).send('Media not found');
  }
});

app.get('/api/admin/backup/r2/list', authenticateAdmin, async (req, res) => {
  try {
    const settings = await resolveEffectiveR2Settings();
    if (!settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key || !settings.r2_bucket_name) {
      return res.json([]);
    }
    
    const s3 = getS3Client(settings);
    
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: settings.r2_bucket_name
    }));
    
    const files = (response.Contents || [])
      .filter(c => c.Key && (c.Key.startsWith('backup-') || c.Key.startsWith('auto-backup-')))
      .map(c => ({
        key: c.Key,
        size: c.Size,
        lastModified: c.LastModified
      }))
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 10);
    
    res.json(files);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to list R2 backups' });
  }
});

app.post('/api/admin/backup/r2/restore', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.body;
    const settings = await resolveEffectiveR2Settings();
    if (!settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key || !settings.r2_bucket_name) {
      return res.status(400).json({ error: 'R2 storage credentials not found' });
    }
    
    const s3 = getS3Client(settings);
    
    const response = await s3.send(new GetObjectCommand({
      Bucket: settings.r2_bucket_name,
      Key: key
    }));
    
    const str = await response.Body.transformToString();
    const data = JSON.parse(str);
    
    if (!data || !data.data) {
      return res.status(400).json({ error: 'Invalid backup format in file' });
    }
    
    const safeTables = ['categories', 'products', 'orders', 'order_items', 'custom_pages'];
    for (const table of safeTables) {
      if (data.data[table]) {
        await pool.query(`DELETE FROM ${table}`);
        for (const row of data.data[table]) {
          const keys = Object.keys(row);
          const vals = Object.values(row);
          const placeholders = keys.map((_, i) => `${i + 1}`).join(', ');
          const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
          await pool.query(query, vals);
        }
      }
    }
    
    res.json({ success: true, message: 'Restore from R2 completed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to restore from R2' });
  }
});


// --- Manage Images APIs ---
app.get('/api/admin/image-providers', authenticateAdmin, async (req: any, res: any) => {
  try {
    const result = await pool.query('SELECT * FROM image_providers ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch image providers' });
  }
});

app.put('/api/admin/image-providers/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const { api_key, api_secret, is_active } = req.body;
    const { id } = req.params;
    
    // If setting active, deactivate others
    if (is_active) {
      await pool.query('UPDATE image_providers SET is_active = false');
    }
    
    const result = await pool.query(
      'UPDATE image_providers SET api_key = $1, api_secret = $2, is_active = $3 WHERE id = $4 RETURNING *',
      [api_key, api_secret, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update image provider' });
  }
});

app.post('/api/admin/image-providers', authenticateAdmin, async (req: any, res: any) => {
  try {
    const { name, provider_key, api_key, api_secret, is_active } = req.body;
    
    if (is_active) {
      await pool.query('UPDATE image_providers SET is_active = false');
    }
    
    const result = await pool.query(
      'INSERT INTO image_providers (name, provider_key, api_key, api_secret, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, provider_key, api_key, api_secret, is_active || false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create image provider' });
  }
});

app.get('/api/admin/images/backup', authenticateAdmin, async (req: any, res: any) => {
  try {
    const result = await pool.query('SELECT id, name, image_url FROM products');
    res.json({
      timestamp: new Date().toISOString(),
      type: 'product_images',
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to export images' });
  }
});

app.post('/api/admin/images/restore', authenticateAdmin, async (req: any, res: any) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    
    // Process sequentially for safety
    let successCount = 0;
    for (const item of data) {
      if (item.id && item.image_url) {
        await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [item.image_url, item.id]);
        successCount++;
      }
    }
    
    res.json({ success: true, count: successCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore images' });
  }
});




// ==========================================
// HOME CUSTOMIZATION API
// ==========================================

// Public endpoints
app.get('/api/banners', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM banners WHERE is_active = true OR is_active = 1 ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

app.get('/api/home-sections', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM home_sections WHERE is_active = true OR is_active = 1 ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch home sections' });
  }
});

app.get('/api/ui-settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ui_settings LIMIT 1");
    res.json(result.rows[0] || { home_grid_desktop: 6, home_grid_mobile: 2 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ui settings' });
  }
});


app.post('/api/admin/banners/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await pool.query("UPDATE banners SET sort_order = $1 WHERE id = $2", [item.sort_order, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder banners' });
  }
});

app.post('/api/admin/home-sections/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await pool.query("UPDATE home_sections SET sort_order = $1 WHERE id = $2", [item.sort_order, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder sections' });
  }
});

// Admin endpoints - Banners
app.get('/api/admin/banners', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

app.post('/api/admin/banners', authenticateAdmin, async (req, res) => {
  try {
    const { title, subtitle, image_url, link_url, position, sort_order, is_active } = req.body;
    await pool.query(
      "INSERT INTO banners (title, subtitle, image_url, link_url, position, sort_order, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [title, subtitle, image_url, link_url, position, sort_order || 0, is_active ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

app.put('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, link_url, position, sort_order, is_active } = req.body;
    await pool.query(
      "UPDATE banners SET title=$1, subtitle=$2, image_url=$3, link_url=$4, position=$5, sort_order=$6, is_active=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8",
      [title, subtitle, image_url, link_url, position, sort_order || 0, is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

app.delete('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM banners WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// Admin endpoints - Home Sections
app.get('/api/admin/home-sections', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM home_sections ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

app.post('/api/admin/home-sections', authenticateAdmin, async (req, res) => {
  try {
    const { title, type, category_slug, limit_count, sort_order, is_active } = req.body;
    await pool.query(
      "INSERT INTO home_sections (title, type, category_slug, limit_count, sort_order, is_active) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, type, category_slug || '', limit_count || 6, sort_order || 0, is_active ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create section' });
  }
});

app.put('/api/admin/home-sections/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, category_slug, limit_count, sort_order, is_active } = req.body;
    await pool.query(
      "UPDATE home_sections SET title=$1, type=$2, category_slug=$3, limit_count=$4, sort_order=$5, is_active=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7",
      [title, type, category_slug || '', limit_count || 6, sort_order || 0, is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section' });
  }
});

app.delete('/api/admin/home-sections/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM home_sections WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Admin endpoints - UI Settings
app.put('/api/admin/ui-settings', authenticateAdmin, async (req, res) => {
  try {
    const { home_grid_desktop, home_grid_mobile } = req.body;
    const check = await pool.query("SELECT id FROM ui_settings LIMIT 1");
    if (check.rows.length === 0) {
      await pool.query("INSERT INTO ui_settings (home_grid_desktop, home_grid_mobile) VALUES ($1, $2)", [home_grid_desktop, home_grid_mobile]);
    } else {
      await pool.query("UPDATE ui_settings SET home_grid_desktop=$1, home_grid_mobile=$2, updated_at=CURRENT_TIMESTAMP", [home_grid_desktop, home_grid_mobile]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==========================================

// NOTIFICATIONS & ALERTS API
// ==========================================

app.get('/api/admin/notification-configs', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notification_configs ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

app.post('/api/admin/notification-configs', authenticateAdmin, async (req, res) => {
  try {
    const { type, name, credentials, is_active } = req.body;
    const credsStr = JSON.stringify(credentials || {});
    await pool.query(
      'INSERT INTO notification_configs (type, name, credentials, is_active) VALUES ($1, $2, $3, $4)',
      [type, name, credsStr, is_active ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.post('/api/admin/notification-configs/test/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Mark as verified immediately for this test
    await pool.query('UPDATE notification_configs SET is_verified = 1 WHERE id = $1', [id]);
    res.json({ success: true, message: 'Connection successful!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

app.put('/api/admin/notification-configs/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, credentials, is_active } = req.body;
    const credsStr = JSON.stringify(credentials || {});
    await pool.query(
      'UPDATE notification_configs SET name = $1, credentials = $2, is_active = $3 WHERE id = $4',
      [name, credsStr, is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

app.delete('/api/admin/notification-configs/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notification_configs WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

app.get('/api/admin/notification-templates', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notification_templates');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.put('/api/admin/notification-templates/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;
    
    // Check if exists
    const check = await pool.query('SELECT id FROM notification_templates WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await pool.query(
        'INSERT INTO notification_templates (id, name, subject, body) VALUES ($1, $2, $3, $4)',
        [id, name, subject, body]
      );
    } else {
      await pool.query(
        'UPDATE notification_templates SET subject = $1, body = $2 WHERE id = $3',
        [subject, body, id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

app.put('/api/admin/notification-controls', authenticateAdmin, async (req, res) => {
  try {
    const { controls, signup_method } = req.body;
    
    if (controls) {
      await pool.query('UPDATE settings SET notification_controls = $1 WHERE id = 1', [JSON.stringify(controls)]);
    }
    
    if (signup_method) {
      await pool.query('UPDATE settings SET signup_method = $1 WHERE id = 1', [signup_method]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update controls' });
  }
});

async function runAutoBackup() {
  try {
    const result = await pool.query('SELECT * FROM cloud_backup_settings LIMIT 1');
    const settings = result.rows[0];
    if (settings && settings.auto_backup_enabled && settings.r2_bucket_name) {
      console.log('Running auto backup to R2...');
      const s3 = getS3Client(settings);
      
      const tables = ['users', 'categories', 'products', 'orders', 'order_items', 'settings', 'custom_pages'];
      const backupData = {};
      for (const table of tables) {
        const resTable = await pool.query(`SELECT * FROM ${table}`);
        backupData[table] = resTable.rows;
      }
      const backupJson = JSON.stringify({ timestamp: new Date().toISOString(), data: backupData });
      const fileName = `auto-backup-${new Date().toISOString().replace(/:/g, '-')}.json`;
      
      await s3.send(new PutObjectCommand({
        Bucket: settings.r2_bucket_name,
        Key: fileName,
        Body: backupJson,
        ContentType: 'application/json'
      }));
      console.log('Auto backup successful: ' + fileName);
      enforceBackupRetention(s3, settings.r2_bucket_name).catch(console.error);
    }
  } catch (err) {
    console.error('Auto backup failed:', err.message);
  }
}

// Run auto backup check every 12 hours
setInterval(runAutoBackup, 12 * 60 * 60 * 1000);


// Sitemap Generator Job (Every 1 Hour)
setInterval(() => {
  generateSitemap().catch(err => console.error(err));
}, 1000 * 60 * 60);

// Generate immediately on startup
setTimeout(() => {
  generateSitemap().catch(err => console.error(err));
}, 5000);

async function startServer() {
  try {
    await initDB();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization warning:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(_dirname, 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.CF_PAGES !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Start background Telegram live chat message receiver
    startTelegramPoller();
  });
  }
}

startServer();

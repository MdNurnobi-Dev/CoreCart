import { createClient, type Client } from '@libsql/client';
import pg from 'pg';

const { Pool } = pg;

export type DatabaseEngine = 'turso' | 'postgres';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command?: string;
}

export interface IDatabase {
  engine: DatabaseEngine;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  init(): Promise<void>;
  getStats(): Promise<{
    engine: DatabaseEngine;
    connected: boolean;
    timestamp: string;
    counts: {
      products: number;
      users: number;
      orders: number;
      categories: number;
    };
  }>;
}

// Default connection credentials
const DEFAULT_TURSO_URL = 'libsql://techshop-rajboss89130.aws-ap-south-1.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc5NDA2NDYsImlkIjoiMDFhMDQ5OGQtYWYwMS03YzM2LTk0ZTYtYjYxZGM2MzMxZGE1Iiwia2lkIjoiUWhEdDg3YTBfalp2SlFJdFFQSWpBR0xqRnJSNTdTQURaNTNUZGk5b0pMYyIsInJpZCI6IjEyYWE2NzgyLTRlOTYtNGE4MC04ZmQ3LTRlMDgyMDc5NTdmNyJ9.CqHwwm4M6RaW2qpSaJ8d0dNfEr0UyxKjc0U2fbQtbLICO-kNE-QNbn7H4vqDQAFXAfC5DWBET0E412F1yw9rDg';

const DEFAULT_POSTGRES_URL = 'postgresql://neondb_owner:npg_98NuRsIbheCV@ep-bitter-sun-ayntsxe4-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export class UnifiedDatabase implements IDatabase {
  public engine: DatabaseEngine;
  private tursoClient: Client | null = null;
  private pgPool: pg.Pool | null = null;

  constructor() {
    const dbType = (process.env.DATABASE_TYPE || '').toLowerCase();
    
    if (dbType === 'postgres') {
      this.engine = 'postgres';
    } else if (dbType === 'turso' || dbType === 'sqlite') {
      this.engine = 'turso';
    } else if (process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN) {
      this.engine = 'turso';
    } else {
      // Default to Turso SQLite as primary requested database
      this.engine = 'turso';
    }

    this.initClients();
  }

  public initClients() {
    if (this.engine === 'turso') {
      const url = process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL;
      const authToken = process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_TOKEN;
      this.tursoClient = createClient({ url, authToken });
      console.log(`[Database] Connected to TURSO Cloud SQLite Engine (${url})`);
    } else {
      const connectionString = process.env.DATABASE_URL || DEFAULT_POSTGRES_URL;
      this.pgPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });
      console.log(`[Database] Connected to Neon PostgreSQL Engine`);
    }
  }

  public async query<T = any>(sqlText: string, params: any[] = []): Promise<QueryResult<T>> {
    if (this.engine === 'postgres' && this.pgPool) {
      const res = await this.pgPool.query(sqlText, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
        command: res.command
      };
    }

    if (!this.tursoClient) {
      this.initClients();
    }

    if (!this.tursoClient) {
      throw new Error('Turso client not initialized');
    }

    // Transform PostgreSQL query to SQLite/Turso compatible query
    let transformedSql = sqlText.trim();

    // 1. Transform NOW()
    transformedSql = transformedSql.replace(/\bNOW\(\)/gi, "datetime('now')");

    // 2. Transform Postgres interval syntax for chat retention
    transformedSql = transformedSql.replace(/NOW\(\)\s*-\s*\(\s*\$(\d+)\s*\|\|\s*' days'\s*\)::INTERVAL/gi, "datetime('now', '-' || \$$1 || ' days')");

    // 3. Transform ILIKE to LIKE (SQLite LIKE is case-insensitive for ASCII)
    transformedSql = transformedSql.replace(/\bILIKE\b/gi, 'LIKE');

    // 4. Strip PostgreSQL type casts (e.g. ::int, ::varchar, ::text, ::jsonb, etc.)
    transformedSql = transformedSql.replace(/::[a-zA-Z_]+(\[\])?/g, '');

    // 5. Ignore unsupported ALTER COLUMN statements in SQLite
    if (transformedSql.toUpperCase().includes('ALTER TABLE') && transformedSql.toUpperCase().includes('ALTER COLUMN')) {
      return { rows: [] as T[], rowCount: 0 };
    }

    // 6. Transform $1, $2, $3 to ? placeholders and map args in order of placeholder appearance
    let finalParams: any[] = [];
    if (Array.isArray(params) && params.length > 0) {
      if (/\$\d+/.test(transformedSql)) {
        transformedSql = transformedSql.replace(/\$(\d+)/g, (_, matchIndex) => {
          const index = parseInt(matchIndex, 10) - 1;
          if (index >= 0 && index < params.length) {
            const val = params[index];
            finalParams.push(val === undefined ? null : val);
          } else {
            finalParams.push(null);
          }
          return '?';
        });
      } else {
        finalParams = params.map(p => (p === undefined ? null : p));
      }
    }

    // Format parameters for SQLite
    const formattedParams = finalParams.map(p => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p !== null && typeof p === 'object' && !(p instanceof Date)) {
        return JSON.stringify(p);
      }
      return p;
    });

    // Remove single trailing semicolon if present to avoid hrana protocol parse issues
    if (transformedSql.endsWith(';')) {
      transformedSql = transformedSql.slice(0, -1).trim();
    }

    // Execute with automatic retry on transient stream / connection 400/500 errors
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.tursoClient) {
          this.initClients();
        }

        const res = await this.tursoClient!.execute({
          sql: transformedSql,
          args: formattedParams.length > 0 ? formattedParams : []
        });

        const rows = res.rows ? (res.rows.map(r => ({ ...r })) as T[]) : [];
        return {
          rows,
          rowCount: res.rowsAffected || rows.length,
          command: 'SELECT'
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient = errMsg.includes('400') || 
                            errMsg.includes('SERVER_ERROR') || 
                            errMsg.includes('stream') || 
                            errMsg.includes('ECONNRESET') || 
                            errMsg.includes('ETIMEDOUT') ||
                            errMsg.includes('fetch failed');

        if (attempt < maxRetries && isTransient) {
          // Re-initialize client to obtain a fresh Hrana session/token stream
          try {
            this.initClients();
          } catch {}
          await new Promise(resolve => setTimeout(resolve, attempt * 100));
          continue;
        }

        console.error(`[Turso Query Error] Attempt ${attempt}/${maxRetries} | SQL: ${transformedSql} | Params:`, formattedParams, err);
        throw err;
      }
    }

    throw lastError || new Error('Database query failed after retries');
  }

  public async init(): Promise<void> {
    if (this.engine === 'turso') {
      await this.initTursoSchema();
    } else {
      await this.initPostgresSchema();
    }
  }

  private async initTursoSchema(): Promise<void> {
    if (!this.tursoClient) return;

    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        phone TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'shipping',
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city TEXT NOT NULL,
        state_district TEXT,
        postal_code TEXT,
        country TEXT DEFAULT 'Bangladesh',
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_name TEXT,
        logo_url TEXT,
        favicon_url TEXT,
        currency_symbol TEXT DEFAULT '$',
        show_site_name_in_header BOOLEAN DEFAULT 1,
        contact_email TEXT,
        contact_phone TEXT,
        contact_phone_alt TEXT,
        contact_address TEXT,
        support_hours TEXT,
        announcement_text TEXT,
        announcement_link TEXT,
        footer_text TEXT,
        facebook_url TEXT,
        instagram_url TEXT,
        twitter_url TEXT,
        youtube_url TEXT,
        linkedin_url TEXT,
        notification_controls TEXT DEFAULT '{}',
        signup_method TEXT DEFAULT 'none'
      )`,
      `CREATE TABLE IF NOT EXISTS custom_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        slug TEXT UNIQUE,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS chat_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        is_enabled BOOLEAN DEFAULT 1,
        welcome_message TEXT DEFAULT 'Hello! 👋 Welcome to CoreCart. How can we help you today?',
        agent_name TEXT DEFAULT 'TechShop Support',
        agent_title TEXT DEFAULT 'Customer Care Agent',
        auto_reply_message TEXT DEFAULT 'Thank you for reaching out! Our team has received your message and will respond shortly.',
        history_retention_days INTEGER DEFAULT 30,
        telegram_bot_token TEXT DEFAULT '',
        telegram_chat_id TEXT DEFAULT '',
        telegram_bot_username TEXT DEFAULT '',
        telegram_notifications_enabled BOOLEAN DEFAULT 1,
        last_telegram_update_id INTEGER DEFAULT 0,
        quick_flows TEXT DEFAULT '',
        firebase_config TEXT DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS live_chat_sessions (
        id TEXT PRIMARY KEY,
        visitor_name TEXT DEFAULT 'Visitor',
        visitor_email TEXT DEFAULT '',
        page_url TEXT,
        last_message TEXT,
        last_message_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS live_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        sender TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS support_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT NOT NULL,
        order_id TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'unread',
        admin_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        price REAL NOT NULL,
        sale_price REAL,
        category TEXT NOT NULL,
        product_type TEXT DEFAULT 'physical',
        stock INTEGER DEFAULT 15,
        low_stock_threshold INTEGER DEFAULT 5,
        image_url TEXT,
        specs TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        payment_method TEXT,
        payment_details TEXT,
        tracking_number TEXT,
        courier_name TEXT,
        shipping_address TEXT,
        estimated_delivery DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price REAL NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS image_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        provider_key TEXT UNIQUE NOT NULL,
        api_key TEXT,
        api_secret TEXT,
        cloud_name TEXT,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        image_url TEXT,
        link_url TEXT,
        position TEXT DEFAULT 'hero',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS home_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        category_slug TEXT,
        limit_count INTEGER DEFAULT 6,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS ui_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        home_grid_desktop INTEGER DEFAULT 6,
        home_grid_mobile INTEGER DEFAULT 2,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS cloud_backup_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        r2_account_id TEXT,
        r2_access_key TEXT,
        r2_secret_key TEXT,
        r2_bucket_name TEXT,
        r2_public_url TEXT,
        auto_backup_enabled BOOLEAN DEFAULT 0,
        auto_backup_frequency TEXT,
        local_storage_enabled BOOLEAN DEFAULT 0,
        primary_storage TEXT DEFAULT 'r2'
      )`,
      `
      CREATE TABLE IF NOT EXISTS ui_settings (
        id SERIAL PRIMARY KEY,
        home_grid_desktop INTEGER DEFAULT 6,
        home_grid_mobile INTEGER DEFAULT 2,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
      )`,
      `CREATE TABLE IF NOT EXISTS manual_payments (
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
      )`,
      `CREATE TABLE IF NOT EXISTS product_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        user_email TEXT,
        user_avatar TEXT,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title TEXT DEFAULT '',
        comment TEXT NOT NULL,
        is_verified_purchase BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'approved',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS coupons (
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
      )`,
      `CREATE TABLE IF NOT EXISTS notification_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        credentials TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 0,
        is_verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS notification_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT DEFAULT '',
        body TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS order_status_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        admin_id INTEGER,
        admin_name TEXT DEFAULT 'Admin',
        admin_email TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        change_reason TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
      `CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)`,
      `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
      `CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session ON live_chat_messages(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_time ON live_chat_sessions(last_message_time)`,
      `CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status)`,
      `CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_custom_pages_slug ON custom_pages(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)`,
      `CREATE INDEX IF NOT EXISTS idx_order_status_audit_logs_order ON order_status_audit_logs(order_id)`
    ];

    for (const stmt of schemaStatements) {
      try {
        await this.tursoClient.execute(stmt);
      } catch (stmtErr: any) {
        console.warn('[Turso Schema Notice]:', stmtErr?.message || stmtErr);
      }
    }

    // Safely check and add any missing columns to existing SQLite tables
    try {
      const prodInfo = await this.tursoClient.execute("PRAGMA table_info(products)");
      const colNames = (prodInfo.rows || []).map((r: any) => (r.name || r[1] || '').toString());
      if (!colNames.includes('slug')) {
        await this.tursoClient.execute("ALTER TABLE products ADD COLUMN slug TEXT");
      }
      if (!colNames.includes('sale_price')) {
        await this.tursoClient.execute("ALTER TABLE products ADD COLUMN sale_price REAL");
      }
      if (!colNames.includes('product_type')) {
        await this.tursoClient.execute("ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'physical'");
      }
      if (!colNames.includes('stock')) {
        await this.tursoClient.execute("ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 15");
      }
      if (!colNames.includes('low_stock_threshold')) {
        await this.tursoClient.execute("ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5");
      }

      // Orders table dynamic columns for live tracking and fulfillment
      try {
        const ordersInfo = await this.tursoClient.execute("PRAGMA table_info(orders)");
        const ordersColNames = (ordersInfo.rows || []).map((r: any) => (r.name || r[1] || '').toString());
        if (!ordersColNames.includes('tracking_number')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN tracking_number TEXT");
        }
        if (!ordersColNames.includes('courier_name')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN courier_name TEXT");
        }
        if (!ordersColNames.includes('current_location')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN current_location TEXT DEFAULT ''");
        }
        if (!ordersColNames.includes('estimated_delivery')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN estimated_delivery TEXT DEFAULT ''");
        }
        if (!ordersColNames.includes('tracking_history')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN tracking_history TEXT DEFAULT '[]'");
        }
        if (!ordersColNames.includes('admin_notes')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN admin_notes TEXT DEFAULT ''");
        }
        if (!ordersColNames.includes('customer_notes')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN customer_notes TEXT DEFAULT ''");
        }
        if (!ordersColNames.includes('recipient_name')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN recipient_name TEXT DEFAULT ''");
        }
        if (!ordersColNames.includes('customer_phone')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN customer_phone TEXT DEFAULT ''");
        }
        if (!ordersColNames.includes('shipping_address')) {
          await this.tursoClient.execute("ALTER TABLE orders ADD COLUMN shipping_address TEXT DEFAULT ''");
        }
      } catch (e) {}

      // Settings table dynamic columns
      try {
        const settingsInfo = await this.tursoClient.execute("PRAGMA table_info(settings)");
        const settingsColNames = (settingsInfo.rows || []).map((r: any) => (r.name || r[1] || '').toString());
        if (!settingsColNames.includes('notification_controls')) {
          await this.tursoClient.execute("ALTER TABLE settings ADD COLUMN notification_controls TEXT DEFAULT '{}'");
        }
        if (!settingsColNames.includes('review_settings')) {
          await this.tursoClient.execute("ALTER TABLE settings ADD COLUMN review_settings TEXT DEFAULT '{}'");
        }
        if (!settingsColNames.includes('signup_method')) {
          await this.tursoClient.execute("ALTER TABLE settings ADD COLUMN signup_method TEXT DEFAULT 'none'");
        }
      } catch (e) {}

    } catch (colErr: any) {
      console.warn('[Turso Column Check Notice]:', colErr?.message || colErr);
    }
  }

  private async initPostgresSchema(): Promise<void> {
    if (!this.pgPool) return;

    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) DEFAULT '',
        subtitle VARCHAR(255) DEFAULT '',
        image_url TEXT NOT NULL,
        link_url TEXT DEFAULT '',
        position VARCHAR(50) DEFAULT 'hero',
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS home_sections (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category_slug VARCHAR(255) DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        limit_count INTEGER DEFAULT 8,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

      CREATE TABLE IF NOT EXISTS user_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'shipping',
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city VARCHAR(100) NOT NULL,
        state_district VARCHAR(100),
        postal_code VARCHAR(50),
        country VARCHAR(100) DEFAULT 'Bangladesh',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        site_name VARCHAR(255),
        logo_url TEXT,
        footer_text TEXT,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255)
      );
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '$';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_site_name_in_header BOOLEAN DEFAULT true;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_address TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_phone_alt VARCHAR(255);
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS support_hours VARCHAR(255);
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS announcement_text TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS announcement_link VARCHAR(255);
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS youtube_url TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS notification_controls TEXT DEFAULT '{}';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS signup_method VARCHAR(50) DEFAULT 'none';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS review_settings TEXT DEFAULT '{}';

      CREATE TABLE IF NOT EXISTS custom_pages (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        slug VARCHAR(255) UNIQUE,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_settings (
        id SERIAL PRIMARY KEY,
        is_enabled BOOLEAN DEFAULT true,
        welcome_message TEXT DEFAULT 'Hello! 👋 Welcome to CoreCart. How can we help you today?',
        agent_name VARCHAR(100) DEFAULT 'TechShop Support',
        agent_title VARCHAR(100) DEFAULT 'Customer Care Agent',
        auto_reply_message TEXT DEFAULT 'Thank you for reaching out! Our team has received your message and will respond shortly.',
        history_retention_days INTEGER DEFAULT 30,
        telegram_bot_token VARCHAR(255) DEFAULT '',
        telegram_chat_id VARCHAR(255) DEFAULT '',
        telegram_bot_username VARCHAR(255) DEFAULT '',
        telegram_notifications_enabled BOOLEAN DEFAULT true,
        last_telegram_update_id BIGINT DEFAULT 0,
        quick_flows TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS live_chat_sessions (
        id VARCHAR(255) PRIMARY KEY,
        visitor_name VARCHAR(255) DEFAULT 'Visitor',
        visitor_email VARCHAR(255) DEFAULT '',
        page_url TEXT,
        last_message TEXT,
        last_message_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS live_chat_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        sender VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        subject VARCHAR(255) NOT NULL,
        order_id VARCHAR(100),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'unread',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        product_type VARCHAR(50) DEFAULT 'physical',
        image_url VARCHAR(500),
        specs JSONB
      );
      ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'physical';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 15;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        discount_type VARCHAR(20) DEFAULT 'percentage',
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order_amount DECIMAL(10, 2) DEFAULT 0,
        max_discount_amount DECIMAL(10, 2) DEFAULT NULL,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP DEFAULT NULL,
        usage_limit INTEGER DEFAULT NULL,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        show_banner BOOLEAN DEFAULT false,
        banner_bg_color VARCHAR(50) DEFAULT '#2563EB',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notification_configs (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        credentials TEXT NOT NULL,
        is_active BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notification_templates (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) DEFAULT '',
        body TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        payment_method VARCHAR(50),
        payment_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_location VARCHAR(255) DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery VARCHAR(100) DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_history TEXT DEFAULT '[]';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255) DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50) DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT DEFAULT '';
      ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS firebase_config TEXT DEFAULT '{}';

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS image_providers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider_key VARCHAR(255) UNIQUE NOT NULL,
        api_key VARCHAR(255),
        api_secret VARCHAR(255),
        cloud_name VARCHAR(255),
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cloud_backup_settings (
        id SERIAL PRIMARY KEY,
        r2_account_id VARCHAR(255),
        r2_access_key VARCHAR(255),
        r2_secret_key VARCHAR(255),
        r2_bucket_name VARCHAR(255),
        r2_public_url TEXT,
        auto_backup_enabled BOOLEAN DEFAULT false,
        auto_backup_frequency VARCHAR(50),
        local_storage_enabled BOOLEAN DEFAULT false,
        primary_storage VARCHAR(50) DEFAULT 'r2'
      );

      CREATE TABLE IF NOT EXISTS payment_gateways (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        account_number VARCHAR(255) DEFAULT '',
        instruction TEXT DEFAULT '',
        logo_url TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT true,
        fee_percent DECIMAL(5, 2) DEFAULT 0,
        min_amount DECIMAL(10, 2) DEFAULT 0,
        max_amount DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS manual_payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        gateway_name VARCHAR(100) NOT NULL,
        sender_number VARCHAR(100) DEFAULT '',
        trx_id VARCHAR(255) DEFAULT '',
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        admin_note TEXT DEFAULT '',
        attachment_url TEXT DEFAULT '',
        customer_name VARCHAR(255) DEFAULT '',
        customer_phone VARCHAR(100) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(255) NOT NULL,
        user_email VARCHAR(255),
        user_avatar TEXT,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255) DEFAULT '',
        comment TEXT NOT NULL,
        is_verified_purchase BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_status_audit_logs (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        admin_id INTEGER,
        admin_name VARCHAR(255) DEFAULT 'Admin',
        admin_email VARCHAR(255) DEFAULT '',
        notes TEXT DEFAULT '',
        change_reason VARCHAR(255) DEFAULT '',
        ip_address VARCHAR(100) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_order_status_audit_logs_order ON order_status_audit_logs(order_id);
      CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session ON live_chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_time ON live_chat_sessions(last_message_time DESC);
      CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
      CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_custom_pages_slug ON custom_pages(slug);
    `);
  }

  public async getStats() {
    const productsRes = await this.query('SELECT COUNT(*) as count FROM products');
    const usersRes = await this.query('SELECT COUNT(*) as count FROM users');
    const ordersRes = await this.query('SELECT COUNT(*) as count FROM orders');
    const categoriesRes = await this.query('SELECT COUNT(*) as count FROM categories');

    return {
      engine: this.engine,
      connected: true,
      timestamp: new Date().toISOString(),
      counts: {
        products: parseInt(productsRes.rows[0]?.count || 0),
        users: parseInt(usersRes.rows[0]?.count || 0),
        orders: parseInt(ordersRes.rows[0]?.count || 0),
        categories: parseInt(categoriesRes.rows[0]?.count || 0),
      }
    };
  }
}

// Export singleton database instance as `db` and `pool` for drop-in compatibility
export const db = new UnifiedDatabase();
export const pool = db;

export async function syncNeonToTurso(): Promise<{ success: boolean; tableCounts: Record<string, number>; message: string }> {
  const neonPool = new Pool({
    connectionString: process.env.DATABASE_URL || DEFAULT_POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_TOKEN
  });

  const tables = [
    'users',
    'user_addresses',
    'settings',
    'custom_pages',
    'chat_settings',
    'live_chat_sessions',
    'live_chat_messages',
    'support_messages',
    'newsletter_subscribers',
    'categories',
    'products',
    'orders',
    'order_items',
    'image_providers',
    'cloud_backup_settings'
  ];

  const tableCounts: Record<string, number> = {};

  try {
    for (const t of tables) {
      await tursoClient.execute(`DELETE FROM "${t}"`);
      const neonRes = await neonPool.query(`SELECT * FROM "${t}"`);
      const rows = neonRes.rows;
      tableCounts[t] = rows.length;

      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const insertSql = `INSERT INTO "${t}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = cols.map(c => {
          let val = row[c];
          if (val instanceof Date) return val.toISOString();
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        });

        await tursoClient.execute({
          sql: insertSql,
          args: values
        });
      }
    }

    return {
      success: true,
      tableCounts,
      message: 'Successfully migrated all 15 tables and records from Neon PostgreSQL into Turso Cloud SQLite!'
    };
  } catch (err: any) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    await neonPool.end();
  }
}


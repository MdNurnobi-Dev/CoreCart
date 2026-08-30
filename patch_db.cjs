const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

const sqliteTables = `
      \`CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        image_url TEXT NOT NULL,
        link_url TEXT DEFAULT '',
        position TEXT DEFAULT 'hero',
        is_active BOOLEAN DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )\`,
      \`CREATE TABLE IF NOT EXISTS home_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        category_slug TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        limit_count INTEGER DEFAULT 8,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )\`,
`;

const pgTables = `
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
`;

code = code.replace(/(\`CREATE TABLE IF NOT EXISTS product_reviews.*?\n\s+\`,)/s, "$1\n" + sqliteTables);
code = code.replace(/(CREATE TABLE IF NOT EXISTS product_reviews.*?\n\s+\);)/s, "$1\n" + pgTables);

fs.writeFileSync('src/server/db.ts', code);

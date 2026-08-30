const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

const regex = /\`\s*CREATE TABLE IF NOT EXISTS banners \([\s\S]*?ui_settings \([\s\S]*?TIMESTAMP\s*\);\s*/g;

// I will just completely replace the section I inserted with the correct SQLite format.
// Wait, I inserted:
//       CREATE TABLE IF NOT EXISTS banners (
// ...
//       );
// 
//       CREATE TABLE IF NOT EXISTS ui_settings (
// ...
//       );
const badInsert = `      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        image_url TEXT,
        link_url VARCHAR(255),
        position VARCHAR(50) DEFAULT 'hero',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS home_sections (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category_slug VARCHAR(255),
        limit_count INTEGER DEFAULT 6,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ui_settings (
        id SERIAL PRIMARY KEY,
        home_grid_desktop INTEGER DEFAULT 6,
        home_grid_mobile INTEGER DEFAULT 2,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`;

const correctInsert = `\`,
      \`CREATE TABLE IF NOT EXISTS banners (
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
      )\`,
      \`CREATE TABLE IF NOT EXISTS home_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        category_slug TEXT,
        limit_count INTEGER DEFAULT 6,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )\`,
      \`CREATE TABLE IF NOT EXISTS ui_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        home_grid_desktop INTEGER DEFAULT 6,
        home_grid_mobile INTEGER DEFAULT 2,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;

code = code.replace(badInsert, correctInsert);

fs.writeFileSync('src/server/db.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

// For SQLite
code = code.replace(
  'quick_flows TEXT DEFAULT \'\',',
  `quick_flows TEXT DEFAULT '',
        firebase_config TEXT DEFAULT '{}',`
);

// For PostgreSQL
code = code.replace(
  'quick_flows TEXT DEFAULT \'\',\\n        updated_at TIMESTAMP',
  `quick_flows TEXT DEFAULT '',
        firebase_config TEXT DEFAULT '{}',
        updated_at TIMESTAMP`
);

// Add ALTER TABLE
code = code.replace(
  /ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP;/g,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP;
      ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS firebase_config TEXT DEFAULT '{}';`
);

// SQLite ALTER TABLE (since it's a loop over setupQueries)
// Let's just find the loop and add the alter table after it.
// Let's just use `await this.db.execute('ALTER TABLE chat_settings ADD COLUMN firebase_config TEXT DEFAULT "{}"').catch(() => {});` in the sqlite init block.
code = code.replace(
  `console.log('SQLite/Turso database initialized with new tables.');`,
  `await this.db.execute('ALTER TABLE chat_settings ADD COLUMN firebase_config TEXT DEFAULT "{}"').catch(() => {});
      console.log('SQLite/Turso database initialized with new tables.');`
);

fs.writeFileSync('src/server/db.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

const pgUiSettings = `
      CREATE TABLE IF NOT EXISTS ui_settings (
        id SERIAL PRIMARY KEY,
        home_grid_desktop INTEGER DEFAULT 6,
        home_grid_mobile INTEGER DEFAULT 2,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
`;

code = code.replace(
  'CREATE TABLE IF NOT EXISTS payment_gateways (',
  pgUiSettings + '\n      CREATE TABLE IF NOT EXISTS payment_gateways ('
);

fs.writeFileSync('src/server/db.ts', code);

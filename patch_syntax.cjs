const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

const target = '      )      CREATE TABLE IF NOT EXISTS cloud_backup_settings (';
// Wait, looking at the previous output:
// updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
//       )      CREATE TABLE IF NOT EXISTS cloud_backup_settings (
// So I will just use regex to replace it.

code = code.replace(
  /updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\s*\)\s*CREATE TABLE IF NOT EXISTS cloud_backup_settings \(/g,
  'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\\n      )\\`,\\n      \\`CREATE TABLE IF NOT EXISTS cloud_backup_settings ('
);

fs.writeFileSync('src/server/db.ts', code);

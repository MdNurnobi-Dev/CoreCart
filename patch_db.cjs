const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

code = code.replace(
  "if (!settingsColNames.includes('signup_method')) {",
  "if (!settingsColNames.includes('review_settings')) {\n          await this.tursoClient.execute(\"ALTER TABLE settings ADD COLUMN review_settings TEXT DEFAULT '{}'\");\n        }\n        if (!settingsColNames.includes('signup_method')) {"
);

code = code.replace(
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS signup_method VARCHAR(50) DEFAULT 'none';",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS signup_method VARCHAR(50) DEFAULT 'none';\n      ALTER TABLE settings ADD COLUMN IF NOT EXISTS review_settings TEXT DEFAULT '{}';"
);

fs.writeFileSync('src/server/db.ts', code);

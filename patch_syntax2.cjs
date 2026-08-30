const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');
code = code.replace(/\\n/g, '\n').replace(/\\`/g, '`');
fs.writeFileSync('src/server/db.ts', code);

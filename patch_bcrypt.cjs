const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// Replace all bcrypt.hash(..., 10) with bcrypt.hash(..., 12)
server = server.replace(/bcrypt\.hash\(([^,]+),\s*10\)/g, "bcrypt.hash($1, 12)");

fs.writeFileSync('server.ts', server);

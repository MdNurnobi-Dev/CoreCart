const fs = require('fs');
const code = fs.readFileSync('src/server/db.ts', 'utf8');
const match = code.match(/const schemaStatements = \[([\s\S]*?)\];/);
if (match) {
  const inner = match[1];
  const items = inner.split(/,\s*(?=\`)/); // approximate
  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim();
    if (!item || item === '``') {
      console.log('Empty item at index', i);
    }
  }
}
